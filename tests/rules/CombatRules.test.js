import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CombatRules } from '../../src/game/rules/CombatRules.js';

describe('CombatRules', () => {
    describe('calculateDamage', () => {
        it('should reduce damage by defense', () => {
            const damage = CombatRules.calculateDamage(100, 20);
            expect(damage).toBe(80);
        });

        it('should return minimum 1 damage', () => {
            const damage = CombatRules.calculateDamage(5, 100);
            expect(damage).toBe(1);
        });

        it('should handle zero defense', () => {
            const damage = CombatRules.calculateDamage(50, 0);
            expect(damage).toBe(50);
        });
    });

    describe('isCriticalHit', () => {
        it('should return boolean', () => {
            const result = CombatRules.isCriticalHit(0.5);
            expect(typeof result).toBe('boolean');
        });

        it('should respect critical chance', () => {
            // Test with 100% chance
            let critCount = 0;
            for (let i = 0; i < 100; i++) {
                if (CombatRules.isCriticalHit(1.0)) critCount++;
            }
            expect(critCount).toBe(100);

            // Test with 0% chance
            critCount = 0;
            for (let i = 0; i < 100; i++) {
                if (CombatRules.isCriticalHit(0.0)) critCount++;
            }
            expect(critCount).toBe(0);
        });
    });

    describe('calculateCriticalDamage', () => {
        it('should multiply damage by default multiplier', () => {
            const damage = CombatRules.calculateCriticalDamage(100);
            expect(damage).toBe(200); // Default 2.0 multiplier
        });

        it('should use custom multiplier', () => {
            const damage = CombatRules.calculateCriticalDamage(100, 3.0);
            expect(damage).toBe(300);
        });
    });

    describe('calculateDamageXP', () => {
        it('should calculate XP based on damage', () => {
            const xp = CombatRules.calculateDamageXP(100);
            expect(xp).toBe(20); // 100 * 0.2
        });

        it('should use custom multiplier', () => {
            const xp = CombatRules.calculateDamageXP(100, 0.5);
            expect(xp).toBe(50);
        });
    });

    describe('calculateKillXP', () => {
        it('should calculate XP based on target level', () => {
            const xp = CombatRules.calculateKillXP(5);
            expect(xp).toBe(500); // 5 * 100
        });

        it('should use custom base XP', () => {
            const xp = CombatRules.calculateKillXP(5, 50);
            expect(xp).toBe(250);
        });
    });

    describe('calculateKillHeal', () => {
        it('should calculate heal based on max HP', () => {
            const heal = CombatRules.calculateKillHeal(1000);
            expect(heal).toBe(300); // 1000 * 0.3
        });

        it('should use custom percentage', () => {
            const heal = CombatRules.calculateKillHeal(1000, 0.5);
            expect(heal).toBe(500);
        });
    });

    describe('processLevelUp', () => {
        it('should return null if not enough XP', () => {
            const entity = { level: 1, xp: 50, maxXp: 100 };
            const result = CombatRules.processLevelUp(entity);
            expect(result).toBeNull();
        });

        it('should return level up result when XP is sufficient', () => {
            const entity = { level: 1, xp: 150, maxXp: 100, maxHp: 600 };
            const result = CombatRules.processLevelUp(entity);
            expect(result).not.toBeNull();
            expect(result.newLevel).toBe(2);
            expect(result.newXp).toBe(50);
            expect(result.maxHpIncrease).toBe(100);
            expect(result.statIncreases).toHaveProperty('atk');
            expect(result.statIncreases).toHaveProperty('def');
            expect(result.statIncreases).toHaveProperty('eva');
        });

        it('should cap level at 50', () => {
            const entity = { level: 50, xp: 200, maxXp: 100, maxHp: 5000 };
            const result = CombatRules.processLevelUp(entity);
            expect(result.newLevel).toBe(50); // Capped
        });
    });

    describe('calculateMonsterKillReward', () => {
        it('should calculate gold reward', () => {
            const gold = CombatRules.calculateMonsterKillReward(5);
            expect(gold).toBe(200); // 100 + (5 * 20)
        });

        it('should use custom values', () => {
            const gold = CombatRules.calculateMonsterKillReward(5, 50, 10);
            expect(gold).toBe(100); // 50 + (5 * 10)
        });
    });

    describe('checkEvasion', () => {
        it('should return boolean', () => {
            const result = CombatRules.checkEvasion(0.5);
            expect(typeof result).toBe('boolean');
        });

        it('should respect evasion chance', () => {
            // Test with 100% evasion
            let evadeCount = 0;
            for (let i = 0; i < 100; i++) {
                if (CombatRules.checkEvasion(1.0)) evadeCount++;
            }
            expect(evadeCount).toBe(100);
        });
    });
});
