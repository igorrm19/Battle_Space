import { describe, it, expect } from 'vitest';
import { MathUtils } from '../../src/utils/MathUtils.js';

describe('MathUtils', () => {
    describe('randFloat', () => {
        it('should generate random float within range', () => {
            for (let i = 0; i < 100; i++) {
                const value = MathUtils.randFloat(5, 10);
                expect(value).toBeGreaterThanOrEqual(5);
                expect(value).toBeLessThan(10);
            }
        });

        it('should handle negative ranges', () => {
            const value = MathUtils.randFloat(-10, -5);
            expect(value).toBeGreaterThanOrEqual(-10);
            expect(value).toBeLessThan(-5);
        });
    });

    describe('randInt', () => {
        it('should generate random integer within range (inclusive)', () => {
            for (let i = 0; i < 100; i++) {
                const value = MathUtils.randInt(1, 5);
                expect(value).toBeGreaterThanOrEqual(1);
                expect(value).toBeLessThanOrEqual(5);
                expect(Number.isInteger(value)).toBe(true);
            }
        });

        it('should include both bounds', () => {
            const values = new Set();
            for (let i = 0; i < 1000; i++) {
                values.add(MathUtils.randInt(1, 2));
            }
            expect(values.has(1)).toBe(true);
            expect(values.has(2)).toBe(true);
        });
    });

    describe('clamp', () => {
        it('should clamp value to range', () => {
            expect(MathUtils.clamp(5, 0, 10)).toBe(5);
            expect(MathUtils.clamp(15, 0, 10)).toBe(10);
            expect(MathUtils.clamp(-5, 0, 10)).toBe(0);
        });

        it('should handle edge cases', () => {
            expect(MathUtils.clamp(10, 0, 10)).toBe(10);
            expect(MathUtils.clamp(0, 0, 10)).toBe(0);
        });
    });

    describe('lerp', () => {
        it('should interpolate between values', () => {
            expect(MathUtils.lerp(0, 10, 0)).toBe(0);
            expect(MathUtils.lerp(0, 10, 1)).toBe(10);
            expect(MathUtils.lerp(0, 10, 0.5)).toBe(5);
        });

        it('should handle negative values', () => {
            expect(MathUtils.lerp(-10, 10, 0.5)).toBe(0);
        });

        it('should extrapolate beyond range', () => {
            expect(MathUtils.lerp(0, 10, 1.5)).toBe(15);
            expect(MathUtils.lerp(0, 10, -0.5)).toBe(-5);
        });
    });
});
