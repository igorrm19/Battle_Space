import { CONSTANTS } from '../../data/Constants.js';
import { GAME_RULES } from '../../data/GameRules.js';

/**
 * Stat calculation rules and formulas
 */
export const StatRules = {
    /**
     * Calculate base stats for an NPC based on level and class
     * @param {number} level - NPC level
     * @param {string} className - NPC class name
     * @returns {Object} Stats object with atk, def, eva, int
     */
    calculateBaseStats(level, className) {
        const baseAtk = CONSTANTS.NPC_BASE_STATS.atk + (level * 10);
        const baseDef = CONSTANTS.NPC_BASE_STATS.def + (level * 5);
        const baseEva = CONSTANTS.NPC_BASE_STATS.eva + (level * 0.01);
        
        // Intelligence varies by class
        const intBase = ['purple', 'blue', 'green'].includes(className) ? 20 : 5;
        const baseInt = intBase + (level * 5);
        
        return {
            atk: Math.min(baseAtk, GAME_RULES.MAX_STAT_VALUE),
            def: Math.min(baseDef, GAME_RULES.MAX_STAT_VALUE),
            eva: Math.min(baseEva, GAME_RULES.MAX_EVASION),
            int: Math.min(baseInt, GAME_RULES.MAX_STAT_VALUE)
        };
    },

    /**
     * Calculate max HP based on level
     * @param {number} level - NPC level
     * @returns {number} Maximum HP
     */
    calculateMaxHP(level) {
        return Math.min(500 + (level * 100), GAME_RULES.MAX_STAT_VALUE);
    },

    /**
     * Calculate max XP required for level up
     * @param {number} level - Current level
     * @param {string} className - NPC class (yellow gains XP slower)
     * @returns {number} Maximum XP required
     */
    calculateMaxXP(level, className = '') {
        const baseXP = 100 * Math.pow(1.5, level - 1);
        // Yellow NPCs gain XP slower (need more XP per level)
        if (className === 'yellow') {
            return baseXP * (1 + level * 0.01); // 1% more XP per level
        }
        return baseXP;
    },

    /**
     * Calculate size scale based on level
     * @param {number} level - NPC level
     * @param {number} baseScale - Base scale (default 1.0)
     * @returns {number} Target scale (capped at MAX_SCALE_MULTIPLIER)
     */
    calculateScale(level, baseScale = 1.0) {
        let targetScale = baseScale + (level - 1) * GAME_RULES.SCALE_PER_LEVEL;
        return Math.min(targetScale, GAME_RULES.MAX_SCALE_MULTIPLIER);
    },

    /**
     * Apply learning bonuses (called every LEARNING_INTERVAL seconds)
     * @param {Object} stats - Current stats object (will be mutated)
     */
    applyLearningBonus(stats) {
        if (!stats.int) stats.int = 0;
        stats.int += GAME_RULES.LEARNING_INT_BONUS;
        stats.eva = Math.min(
            GAME_RULES.MAX_EVASION,
            stats.eva + GAME_RULES.LEARNING_EVA_BONUS
        );
    },

    /**
     * Calculate level-up stat increases
     * @returns {Object} Stat increases
     */
    getLevelUpIncreases() {
        return {
            maxHp: 100,
            atk: 10,
            def: 5,
            eva: 0.01
        };
    },

    /**
     * Clamp level to maximum
     * @param {number} level - Level to clamp
     * @returns {number} Clamped level
     */
    clampLevel(level) {
        return Math.min(level, GAME_RULES.MAX_NPC_LEVEL);
    }
};
