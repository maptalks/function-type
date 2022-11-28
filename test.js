var expect = require('expect.js');
const { loadFunctionTypes } = require('./index');

const colors = [
    [0, 'red'],
    [5, 'black'],
    [10, 'white']
];

const symbol = {
    markerFill: {
        property: 'value',
        stops: colors,
        type: 'color-interpolate'
    },
};

describe('color-interpolate', () => {
    it('interpolate by property', () => {
        const result = loadFunctionTypes(symbol, () => {
            return [11, {
                value: 1
            }];
        });
        expect(result.markerFill).to.be('rgb(201,0,0)');
    });
    it('interpolate by property < min', () => {
        const result = loadFunctionTypes(symbol, () => {
            return [11, {
                value: -100
            }];
        });
        expect(result.markerFill).to.be('rgb(252,0,0)');
    });
    it('interpolate by property > max', () => {
        const result = loadFunctionTypes(symbol, () => {
            return [11, {
                value: 100
            }];
        });
        expect(result.markerFill).to.be('rgb(252,252,252)');
    });
    it('interpolate by property colors.length=1', () => {
        const obj = {
            markerFill: {
                property: 'value',
                stops: colors.slice(0, 1),
                type: 'color-interpolate'
            },
        };
        const result = loadFunctionTypes(obj, () => {
            return [11, {
                value: 2
            }];
        });
        expect(result.markerFill).to.be('red');
    });
    it('interpolate by zoom ', () => {
        const obj = {
            markerFill: {
                // property: 'value',
                stops: colors,
                type: 'color-interpolate'
            },
        };
        const result = loadFunctionTypes(obj, () => {
            return [6, {
                value: 11
            }];
        });
        expect(result.markerFill).to.be('rgb(54,54,54)');
    });
});
