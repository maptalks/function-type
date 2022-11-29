var expect = require('expect.js');
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

const symbol = {
    markerFill: {
        property: 'value',
        stops: colors,
        type: 'color-interpolate'
    },
};

function rgbatoStr(rgba) {
    return rgba.join(',');
}

describe('color-interpolate', () => {
    it('interpolate by property', () => {
        const result = loadFunctionTypes(symbol, () => {
            return [11, {
                value: 1
            }];
        });
        expect(rgbatoStr(result.markerFill)).to.be(rgbatoStr([0.788235294117647, 0, 0, 1]));
    });
    it('interpolate by property < min', () => {
        const result = loadFunctionTypes(symbol, () => {
            return [11, {
                value: -100
            }];
        });
        expect(rgbatoStr(result.markerFill)).to.be(rgbatoStr([0.9882352941176471, 0, 0, 1]));
    });
    it('interpolate by property > max', () => {
        const result = loadFunctionTypes(symbol, () => {
            return [11, {
                value: 100
            }];
        });
        expect(rgbatoStr(result.markerFill)).to.be(rgbatoStr([0.9882352941176471, 0.9882352941176471, 0.9882352941176471, 1]));
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
        expect(rgbatoStr(result.markerFill)).to.be(rgbatoStr([0.21176470588235294, 0.21176470588235294, 0.21176470588235294, 1]));
    });
});
