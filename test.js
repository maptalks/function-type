const expect = require('expect.js');
const { loadFunctionTypes } = require('./index');
import { registerCanvas } from 'colorin';
const { createCanvas } = require('@napi-rs/canvas');
const canvas = createCanvas(1, 1);
registerCanvas(canvas);

const colors = [
    [0, 'red'],
    [5, 'black'],
    [10, 'white']
];

const symbolColorInterpolate = {
    markerFill: {
        property: 'value',
        stops: colors,
        type: 'color-interpolate'
    }
};

const symbolCalculateExpression = {
    lineColor: [0.56, 0.75, 0.13, 1],
    lineWidth: {
        type: 'calculate-expression',
        property: '管径',
        expression: ['*', '管径', 4000],
        default: 4000
    }
};

function rgbatoStr(rgba) {
    return rgba.join(',');
}

describe('specs', () => {

    context('color-interpolate', () => {
        it('interpolate by property', () => {
            const result = loadFunctionTypes(symbolColorInterpolate, () => {
                return [11, { value: 1 }];
            });
            expect(rgbatoStr(result.markerFill)).to.be(rgbatoStr([0.788235294117647, 0, 0, 1]));
        });

        it('interpolate by property < min', () => {
            const result = loadFunctionTypes(symbolColorInterpolate, () => {
                return [11, { value: -100 }];
            });
            expect(rgbatoStr(result.markerFill)).to.be(rgbatoStr([0.9882352941176471, 0, 0, 1]));
        });

        it('interpolate by property > max', () => {
            const result = loadFunctionTypes(symbolColorInterpolate, () => {
                return [11, { value: 100 }];
            });
            expect(rgbatoStr(result.markerFill)).to.be(rgbatoStr([0.9882352941176471, 0.9882352941176471, 0.9882352941176471, 1]));
        });

        it('interpolate by property colors.length=1', () => {
            const obj = {
                markerFill: {
                    property: 'value',
                    stops: colors.slice(0, 1),
                    type: 'color-interpolate'
                }
            };
            const result = loadFunctionTypes(obj, () => {
                return [11, { value: 2 }];
            });
            expect(result.markerFill).to.be('red');
        });

        it('interpolate by zoom', () => {
            const obj = {
                markerFill: {
                    stops: colors,
                    type: 'color-interpolate'
                }
            };
            const result = loadFunctionTypes(obj, () => {
                return [6, { value: 11 }];
            });
            expect(rgbatoStr(result.markerFill)).to.be(rgbatoStr([0.21176470588235294, 0.21176470588235294, 0.21176470588235294, 1]));
        });
    });

    context('calculate-expression', () => {
        it('calculates based on expression', () => {
            const result = loadFunctionTypes(symbolCalculateExpression, () => {
                return [11, { 管径: 2 }];
            });
            expect(result.lineWidth).to.be(8000); // 2 * 4000
        });
        it('returns default when property is missing', () => {
            const result = loadFunctionTypes(symbolCalculateExpression, () => {
                return [11, {}];
            });
            expect(result.lineWidth).to.be(4000); // default value when 管径 is missing
        });

        it('returns default when property is null', () => {
            const result = loadFunctionTypes(symbolCalculateExpression, () => {
                return [11, { 管径: null }];
            });
            expect(result.lineWidth).to.be(4000); // default value when 管径 is null
        });

        it('handles negative value correctly', () => {
            const result = loadFunctionTypes(symbolCalculateExpression, () => {
                return [11, { 管径: -2 }];
            });
            expect(result.lineWidth).to.be(4000);
        });

        it('handles non-numeric property value', () => {
            const result = loadFunctionTypes(symbolCalculateExpression, () => {
                return [11, { 管径: 'abc' }];
            });
            expect(result.lineWidth).to.be(4000); // 'abc' * 4000 should result in NaN
        });

        it('handles undefined property value', () => {
            const result = loadFunctionTypes(symbolCalculateExpression, () => {
                return [11, { 管径: undefined }];
            });
            expect(result.lineWidth).to.be(4000); // undefined property should return default value
        });

        it('handles 0 as divisor', () => {
            const obj = {
                lineWidth: {
                    type: 'calculate-expression',
                    property: '管径',
                    expression: ['/', '管径', 0],
                    default: 4000
                }
            };
            const result = loadFunctionTypes(obj, () => {
                return [11, { 管径: 10 }];
            });
            expect(result.lineWidth).to.be(4000); // 0 as divisor
        });

        it('default value consider null/undefined/""', () => {

            const values = [null, undefined];
            values.forEach(v => {
                const result = loadFunctionTypes(symbolCalculateExpression, () => {
                    return [11, { '管径': v }];
                });
                expect(result.lineWidth).to.be(4000); // 0 as divisor
            });

        });
    });
});
