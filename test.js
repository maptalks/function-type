const expect = require('expect.js');
const { loadFunctionTypes } = require('./index');

const symbol = {
    lineColor: [0.56, 0.75, 0.13, 1],
    lineWidth: {
        type: 'calculate-expression',
        property: '管径',
        expression: ['*', '管径', 4000],
        default: 4000,
    },
};
// 如果输入值缺失、 null、负数、非数值类型、未定义属性、非法运算返回default
describe('calculate-expression', () => {
    // 正常情况
    it('calculates based on expression', () => {
        const result = loadFunctionTypes(symbol, () => {
            return [11, { 管径: 2 }];
        });
        expect(result.lineWidth).to.be(8000); // 2 * 4000
    });
    // 属性缺失
    it('returns default when property is missing', () => {
        const result = loadFunctionTypes(symbol, () => {
            return [11, {}];
        });
        expect(result.lineWidth).to.be(4000); // default value when 管径 is missing
    });

    // 属性为 null
    it('returns default when property is null', () => {
        const result = loadFunctionTypes(symbol, () => {
            return [11, { 管径: null }];
        });
        expect(result.lineWidth).to.be(4000); // default value when 管径 is null
    });

    // 属性为负数
    it('handles negative value correctly', () => {
        const result = loadFunctionTypes(symbol, () => {
            return [11, { 管径: -2 }];
        });
        expect(result.lineWidth).to.be(4000); //
    });

    // 属性为非数值类型
    it('handles non-numeric property value', () => {
        const result = loadFunctionTypes(symbol, () => {
            return [11, { 管径: 'abc' }];
        });
        expect(result.lineWidth).to.be(4000); // 'abc' * 4000 should result in NaN
    });

    // 未定义属性
    it('handles undefined property value', () => {
        const result = loadFunctionTypes(symbol, () => {
            return [11, { 管径: undefined }];
        });
        expect(result.lineWidth).to.be(4000); // undefined property should return default value
    });

    // 运算方式非法
    it('handles 0 as divisor', () => {
        const obj = {
            lineWidth: {
                type: 'calculate-expression',
                property: '管径',
                expression: ['/', '管径', 0],
                default: 4000,
            },
        };
        const result = loadFunctionTypes(obj, () => {
            return [11, { 管径: 10 }];
        });
        expect(result.lineWidth).to.be(4000); // 0 as divisor
    });
});
