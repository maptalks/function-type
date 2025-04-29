import { ColorIn } from 'colorin';
var isMapSupported = typeof Map === 'function';
var colorInCache;
if (isMapSupported) {
    colorInCache = new Map();
}


function isNull(value) {
    return value === null || value === undefined;
}

function isNotNull(value) {
    return !isNull(value);
}

function isEmptyString(value) {
    return value === '';
}

/*eslint-disable no-var, prefer-const*/
function createFunction(parameters, defaultType) {
    var fun;
    var isFeatureConstant, isZoomConstant;
    if (!isFunctionDefinition(parameters)) {
        fun = function () {
            return parameters;
        };
        isFeatureConstant = true;
        isZoomConstant = true;
    } else {
        var zoomAndFeatureDependent = parameters.stops && typeof parameters.stops[0][0] === 'object';
        var featureDependent = zoomAndFeatureDependent || isNotNull(parameters.property);
        var zoomDependent = zoomAndFeatureDependent || !featureDependent;
        var type = parameters.type || defaultType || 'exponential';

        var innerFun;
        if (type === 'exponential') {
            innerFun = evaluateExponentialFunction;
        } else if (type === 'interval') {
            innerFun = evaluateIntervalFunction;
        } else if (type === 'categorical') {
            innerFun = evaluateCategoricalFunction;
        } else if (type === 'identity') {
            innerFun = evaluateIdentityFunction;
        } else if (type === 'color-interpolate') {
            innerFun = evaluateColorInterpolateFunction;
        } else if (type === 'calculate-expression') {
            innerFun = evaluateCalculateExpressionFunction;
        } else {
            throw new Error('Unknown function type "' + type + '"');
        }

        if (zoomAndFeatureDependent) {
            var featureFunctions = {};
            var featureFunctionStops = [];
            for (let s = 0; s < parameters.stops.length; s++) {
                var stop = parameters.stops[s];
                if (featureFunctions[stop[0].zoom] === undefined) {
                    featureFunctions[stop[0].zoom] = {
                        zoom: stop[0].zoom,
                        type: parameters.type,
                        property: parameters.property,
                        default: parameters.default,
                        stops: []
                    };
                }
                featureFunctions[stop[0].zoom].stops.push([stop[0].value, stop[1]]);
            }

            for (let z in featureFunctions) {
                featureFunctionStops.push([featureFunctions[z].zoom, createFunction(featureFunctions[z])]);
            }
            fun = function (zoom, feature) {
                const value = evaluateExponentialFunction({ stops: featureFunctionStops, base: parameters.base }, zoom)(zoom, feature);
                return typeof value === 'function' ? value(zoom, feature) : value;
            };
            isFeatureConstant = false;
            isZoomConstant = false;
        } else if (zoomDependent) {
            fun = function (zoom) {
                const value = innerFun(parameters, zoom);
                return typeof value === 'function' ? value(zoom) : value;
            };
            isFeatureConstant = true;
            isZoomConstant = false;
        } else {
            fun = function (zoom, feature) {
                const value = innerFun(parameters, feature ? feature[parameters.property] : null);
                return typeof value === 'function' ? value(zoom, feature) : value;
            };
            isFeatureConstant = false;
            isZoomConstant = true;
        }
    }
    fun.isZoomConstant = isZoomConstant;
    fun.isFeatureConstant = isFeatureConstant;
    return fun;
}

function coalesce(a, b, c) {
    if (isNotNull(a)) return a;
    if (isNotNull(b)) return b;
    if (isNotNull(c)) return c;
    return null;
}

function evaluateCategoricalFunction(parameters, input) {
    for (let i = 0; i < parameters.stops.length; i++) {
        if (input === parameters.stops[i][0]) {
            return parameters.stops[i][1];
        }
    }
    return parameters.default;
}

function evaluateIntervalFunction(parameters, input) {
    for (var i = 0; i < parameters.stops.length; i++) {
        if (input < parameters.stops[i][0]) break;
    }
    return parameters.stops[Math.max(i - 1, 0)][1];
}

function evaluateExponentialFunction(parameters, input) {
    var base = isNotNull(parameters.base) && !isEmptyString(parameters.base) ? parameters.base : 1;

    var i = 0;
    while (true) {
        if (i >= parameters.stops.length) break;
        else if (input <= parameters.stops[i][0]) break;
        else i++;
    }

    if (i === 0) {
        return parameters.stops[i][1];
    } else if (i === parameters.stops.length) {
        return parameters.stops[i - 1][1];
    } else {
        return interpolate(input, base, parameters.stops[i - 1][0], parameters.stops[i][0], parameters.stops[i - 1][1], parameters.stops[i][1]);
    }
}
const COLORIN_OPTIONS = {
    width: 100,
    height: 1
};
function evaluateColorInterpolateFunction(parameters, input) {
    const stops = parameters.stops;
    if (stops && stops.length > 1) {
        let colorIn;
        if (colorInCache) {
            const key = JSON.stringify(stops);
            if (!colorInCache.has(key)) {
                const colorIn = new ColorIn(stops, COLORIN_OPTIONS);
                colorInCache.set(key, colorIn);
            }
            colorIn = colorInCache.get(key);
        } else {
            colorIn = new ColorIn(stops, COLORIN_OPTIONS);
        }
        const [r, g, b, a] = colorIn.getColor(input);
        return [r / 255, g / 255, b / 255, a / 255];
    } else if (stops && stops.length === 1) {
        return stops[0][1];
    }
    return null;
}

function evaluateIdentityFunction(parameters, input) {
    return coalesce(input, parameters.default);
}
// 2添加修改计算函数
// 处理空字符串和未定义属性的函数
function evaluateCalculateExpressionFunction(parameters, input) {
    const targetVariable = String(parameters.property);
    const expression = parameters.expression;
    const newValue = input;

    // 定义函数来替换表达式中的变量
    function traverseAndAssign(expression, targetVariable, newValue) {
        const newValueAsNumber = Number(newValue);
        const targetVariableAsString = String(targetVariable);

        if (Array.isArray(expression)) {
            return expression.map(subExpr => traverseAndAssign(subExpr, targetVariableAsString, newValueAsNumber));
        } else if (expression === targetVariableAsString) {
            return newValueAsNumber;
        } else {
            return expression;
        }
    }

    // 定义函数来计算表达式的结果
    function evaluateExpression(expression) {
        if (Array.isArray(expression)) {
            const operator = expression[0];

            if (!['+', '-', '*', '/'].includes(operator)) {
                throw new Error(`Unknown operator: ${operator}`);
            }

            const operands = expression.slice(1).map(op => evaluateExpression(op));
            switch (operator) {
            case '+':
                return operands.reduce((acc, curr) => acc + curr, 0);
            case '-':
                return operands.reduce((acc, curr) => acc - curr);
            case '*':
                return operands.reduce((acc, curr) => acc * curr, 1);
            case '/':
                // 如果发现有零作为除数，返回默认值
                if (operands.some(op => op === 0)) {
                    return parameters.default;
                }
                return operands.reduce((acc, curr) => acc / curr);
            default:
                throw new Error(`Unsupported operator: ${operator}`);
            }
        } else if (typeof expression === 'number') {
            return expression;
        } else {
            throw new Error('Invalid expression format');
        }
    }

    // 使用 coalesce 函数处理结果中的默认值
    function coalesce(value) {
        return (isNull(value) || isEmptyString(value) || isNaN(value)) ? parameters.default : value;
    }

    // 如果 input 存在且大于0，则处理表达式
    if (isNotNull(input) && !isEmptyString(input) && !isNaN(input) && !(input < 0)) {
        const updatedExpression = traverseAndAssign(expression, targetVariable, newValue);
        return coalesce(evaluateExpression(updatedExpression));
    } else {
        return coalesce(parameters.default);
    }
}

function interpolate(input, base, inputLower, inputUpper, outputLower, outputUpper) {
    if (typeof outputLower === 'function') {
        return function () {
            var evaluatedLower = outputLower.apply(undefined, arguments);
            var evaluatedUpper = outputUpper.apply(undefined, arguments);
            return interpolate(input, base, inputLower, inputUpper, evaluatedLower, evaluatedUpper);
        };
    } else if (outputLower.length) {
        return interpolateArray(input, base, inputLower, inputUpper, outputLower, outputUpper);
    } else {
        return interpolateNumber(input, base, inputLower, inputUpper, outputLower, outputUpper);
    }
}

function interpolateNumber(input, base, inputLower, inputUpper, outputLower, outputUpper) {
    var difference = inputUpper - inputLower;
    var progress = input - inputLower;

    var ratio;
    if (base === 1) {
        ratio = progress / difference;
    } else {
        ratio = (Math.pow(base, progress) - 1) / (Math.pow(base, difference) - 1);
    }

    return outputLower * (1 - ratio) + outputUpper * ratio;
}

function interpolateArray(input, base, inputLower, inputUpper, outputLower, outputUpper) {
    var output = [];
    for (let i = 0; i < outputLower.length; i++) {
        output[i] = interpolateNumber(input, base, inputLower, inputUpper, outputLower[i], outputUpper[i]);
    }
    return output;
}

/**
 * Check if object is a definition of function type
 * @param  {Object}  obj object
 * @return {Boolean}
 * @memberOf MapboxUtil
 */
export function isFunctionDefinition(obj) {
    return (
        obj &&
        typeof obj === 'object' &&
        (obj.stops || (obj.property && obj.type === 'identity') || (obj.expression && obj.type === 'calculate-expression'))
    );
}

// export function isFunctionDefinition(obj) {
//     return obj && typeof obj === 'object' && (obj.stops || (obj.property && obj.type === 'identity'));
// }

/**
 * Check if obj's properties has function definition
 * @param  {Object}  obj object to check
 * @return {Boolean}
 * @memberOf MapboxUtil
 */
export function hasFunctionDefinition(obj) {
    for (const p in obj) {
        if (isFunctionDefinition(obj[p])) {
            return true;
        }
    }
    return false;
}

export function interpolated(parameters) {
    return createFunction1(parameters, 'exponential');
}

export function piecewiseConstant(parameters) {
    return createFunction1(parameters, 'interval');
}

/**
 * Load function types defined in object
 * @param  {Object[]} parameters parameters
 * @return {Object}   loaded object
 * @memberOf MapboxUtil
 */

export function loadFunctionTypes(obj, argFn) {
    if (!obj) {
        return null;
    }
    var hit = false;
    if (Array.isArray(obj)) {
        var multResult = [],
            loaded;
        for (let i = 0; i < obj.length; i++) {
            loaded = loadFunctionTypes(obj[i], argFn);
            if (!loaded) {
                multResult.push(obj[i]);
            } else {
                multResult.push(loaded);
                hit = true;
            }
        }
        return hit ? multResult : obj;
    }
    var result = { '__fn_types_loaded': true },
        props = [],
        p;
    for (p in obj) {
        if (obj.hasOwnProperty(p)) {
            props.push(p);
        }
    }

    const buildFn = function (p) {
        Object.defineProperty(result, p, {
            get: function () {
                if (!this['__fn_' + p]) {
                    this['__fn_' + p] = interpolated(this['_' + p]);
                }
                return this['__fn_' + p].apply(this, argFn());
            },
            set: function (v) {
                this['_' + p] = v;
            },
            configurable: true,
            enumerable: true
        });
    };

    for (let i = 0, len = props.length; i < len; i++) {
        p = props[i];
        if (isFunctionDefinition(obj[p])) {
            hit = true;
            result['_' + p] = obj[p];
            buildFn(p);
        } else {
            result[p] = obj[p];
        }
    }
    return hit ? result : obj;
}

/**
 * Get external resources in the function type
 * @param  {Object} t Function type definition
 * @return {String[]}   resouces
 * @memberOf MapboxUtil
 */
export function getFunctionTypeResources(t) {
    if (!t || !t.stops) {
        return [];
    }
    const res = [];
    for (let i = 0, l = t.stops.length; i < l; i++) {
        res.push(t.stops[i][1]);
    }
    return res;
}
/*eslint-enable no-var, prefer-const*/

function createFunction1(parameters, defaultType) {
    if (!isFunctionDefinition(parameters)) {
        return function () {
            return parameters;
        };
    }
    parameters = JSON.parse(JSON.stringify(parameters));
    let isZoomConstant = true;
    let isFeatureConstant = true;
    const stops = parameters.stops;
    if (stops) {
        for (let i = 0; i < stops.length; i++) {
            if (isFunctionDefinition(stops[i][1])) {
                const fn = createFunction1(stops[i][1], defaultType);
                isZoomConstant = isZoomConstant && fn.isZoomConstant;
                isFeatureConstant = isFeatureConstant && fn.isFeatureConstant;
                stops[i] = [stops[i][0], fn];
            }
        }
    }
    const fn = createFunction(parameters, defaultType);
    fn.isZoomConstant = isZoomConstant && fn.isZoomConstant;
    fn.isFeatureConstant = isFeatureConstant && fn.isFeatureConstant;
    return fn;
}
