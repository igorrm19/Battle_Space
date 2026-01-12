import { describe, it, expect } from 'vitest';
import { StatRules } from '../../src/game/rules/StatRules.js';
import { GAME_RULES } from '../../src/data/GameRules.js';

describe('StatRules caps', () => {
    it('calculateBaseStats should not exceed MAX_STAT_VALUE for high levels', () => {
        const stats = StatRules.calculateBaseStats(GAME_RULES.MAX_NPC_LEVEL, 'purple');
        expect(stats.atk).toBeLessThanOrEqual(GAME_RULES.MAX_STAT_VALUE);
        expect(stats.def).toBeLessThanOrEqual(GAME_RULES.MAX_STAT_VALUE);
        expect(stats.int).toBeLessThanOrEqual(GAME_RULES.MAX_STAT_VALUE);
    });

    it('calculateMaxHP should be clamped to MAX_STAT_VALUE', () => {
        const hp = StatRules.calculateMaxHP(GAME_RULES.MAX_NPC_LEVEL);
        expect(hp).toBeLessThanOrEqual(GAME_RULES.MAX_STAT_VALUE);
    });
});
