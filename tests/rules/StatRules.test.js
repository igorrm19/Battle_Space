import { describe, it, expect, beforeEach } from 'vitest';
import { StatRules } from '../../src/game/rules/StatRules.js';
import { GAME_RULES } from '../../src/data/GameRules.js';

describe('StatRules', () => {
    describe('calculateBaseStats', () => {
        it('should calculate stats based on level', () => {
            const stats = StatRules.calculateBaseStats(5, 'red');
            expect(stats.atk).toBe(80); // 30 + (5 * 10)
            expect(stats.def).toBe(35); // 10 + (5 * 5)
            expect(stats.eva).toBeCloseTo(0.15, 5); // 0.1 + (5 * 0.01)
        });

        it('should give higher int to intelligent classes', () => {
            const smartStats = StatRules.calculateBaseStats(1, 'purple');
            const dumbStats = StatRules.calculateBaseStats(1, 'red');
            expect(smartStats.int).toBeGreaterThan(dumbStats.int);
        });

        it('should cap evasion at maximum', () => {
            const stats = StatRules.calculateBaseStats(100, 'red');
            expect(stats.eva).toBeLessThanOrEqual(GAME_RULES.MAX_EVASION);
        });
    });

    describe('calculateMaxHP', () => {
        it('should calculate HP based on level', () => {
            const hp = StatRules.calculateMaxHP(5);
            expect(hp).toBe(1000); // 500 + (5 * 100)
        });

        it('should handle level 1', () => {
            const hp = StatRules.calculateMaxHP(1);
            expect(hp).toBe(600); // 500 + (1 * 100)
        });
    });

    describe('calculateMaxXP', () => {
        it('should calculate XP requirement', () => {
            const xp = StatRules.calculateMaxXP(1);
            expect(xp).toBe(100);
        });

        it('should increase exponentially', () => {
            const xp1 = StatRules.calculateMaxXP(2);
            const xp2 = StatRules.calculateMaxXP(3);
            expect(xp2).toBeGreaterThan(xp1);
        });
    });

    describe('calculateScale', () => {
        it('should calculate scale based on level', () => {
            const scale = StatRules.calculateScale(5);
            expect(scale).toBeCloseTo(1.2, 1); // 1.0 + (4 * 0.05)
        });

        it('should cap scale at maximum', () => {
            const scale = StatRules.calculateScale(100);
            expect(scale).toBeLessThanOrEqual(GAME_RULES.MAX_SCALE_MULTIPLIER);
        });

        it('should handle base scale', () => {
            const scale = StatRules.calculateScale(1, 2.0);
            expect(scale).toBe(2.0);
        });
    });

    describe('applyLearningBonus', () => {
        it('should increase intelligence and evasion', () => {
            const stats = { int: 10, eva: 0.2 };
            StatRules.applyLearningBonus(stats);
            expect(stats.int).toBe(11);
            expect(stats.eva).toBeGreaterThan(0.2);
        });

        it('should cap evasion at maximum', () => {
            const stats = { int: 10, eva: 0.49 };
            StatRules.applyLearningBonus(stats);
            expect(stats.eva).toBeLessThanOrEqual(GAME_RULES.MAX_EVASION);
        });

        it('should initialize int if missing', () => {
            const stats = { eva: 0.1 };
            StatRules.applyLearningBonus(stats);
            expect(stats.int).toBe(GAME_RULES.LEARNING_INT_BONUS);
        });
    });

    describe('getLevelUpIncreases', () => {
        it('should return stat increases object', () => {
            const increases = StatRules.getLevelUpIncreases();
            expect(increases).toHaveProperty('maxHp');
            expect(increases).toHaveProperty('atk');
            expect(increases).toHaveProperty('def');
            expect(increases).toHaveProperty('eva');
        });

        it('should have correct values', () => {
            const increases = StatRules.getLevelUpIncreases();
            expect(increases.maxHp).toBe(100);
            expect(increases.atk).toBe(10);
            expect(increases.def).toBe(5);
        });
    });

    describe('clampLevel', () => {
        it('should clamp level to maximum', () => {
            const level = StatRules.clampLevel(GAME_RULES.MAX_NPC_LEVEL + 1);
            expect(level).toBe(GAME_RULES.MAX_NPC_LEVEL);
        });

        it('should return level if within range', () => {
            const level = StatRules.clampLevel(10);
            expect(level).toBe(10);
        });
    });
});
