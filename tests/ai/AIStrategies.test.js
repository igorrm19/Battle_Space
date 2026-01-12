import { describe, it, expect } from 'vitest';
import { AIStrategies } from '../../src/ai/AIStrategies.js';

describe('AIStrategies', () => {
    describe('getStrategyForClass', () => {
        it('should return tactician for pink class', () => {
            const strategy = AIStrategies.getStrategyForClass('pink');
            expect(strategy).toBe('tactician');
        });

        it('should return aggressive or farmer for other classes', () => {
            const strategies = new Set();
            for (let i = 0; i < 100; i++) {
                strategies.add(AIStrategies.getStrategyForClass('red'));
            }
            expect(strategies.has('aggressive')).toBe(true);
            expect(strategies.has('farmer')).toBe(true);
        });
    });

    describe('strategies', () => {
        it('should have all strategy definitions', () => {
            expect(AIStrategies.strategies).toHaveProperty('aggressive');
            expect(AIStrategies.strategies).toHaveProperty('farmer');
            expect(AIStrategies.strategies).toHaveProperty('tactician');
        });

        it('should have correct properties for each strategy', () => {
            Object.values(AIStrategies.strategies).forEach(strategy => {
                expect(strategy).toHaveProperty('name');
                expect(strategy).toHaveProperty('description');
                expect(strategy).toHaveProperty('targetPriority');
            });
        });
    });

    describe('classBehaviors', () => {
        it('should have behaviors for green class', () => {
            expect(AIStrategies.classBehaviors.green).toBeDefined();
            expect(AIStrategies.classBehaviors.green).toHaveProperty('fleeDistance');
            expect(AIStrategies.classBehaviors.green).toHaveProperty('healThreshold');
        });

        it('should have behaviors for darkgreen class', () => {
            expect(AIStrategies.classBehaviors.darkgreen).toBeDefined();
            expect(AIStrategies.classBehaviors.darkgreen).toHaveProperty('zombieFollowDistance');
        });
    });
});
