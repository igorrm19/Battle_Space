import { GAME_RULES } from '../data/GameRules.js';

/**
 * AI Strategy configurations and mappings
 */
export const AIStrategies = {
    /**
     * Get strategy for an NPC based on class
     * @param {string} className - NPC class name
     * @returns {string} Strategy name ('aggressive', 'farmer', 'tactician')
     */
    getStrategyForClass(className) {
        if (className === 'pink') return 'tactician';
        return Math.random() > 0.5 ? 'aggressive' : 'farmer';
    },

    /**
     * Strategy configurations
     */
    strategies: {
        aggressive: {
            name: 'aggressive',
            description: 'Focuses on strongest enemies',
            targetPriority: 'strongest'
        },
        farmer: {
            name: 'farmer',
            description: 'Focuses on weakest enemies for quick XP',
            targetPriority: 'weakest'
        },
        tactician: {
            name: 'tactician',
            description: 'Analyzes battlefield and coordinates attacks',
            targetPriority: 'strategic'
        }
    },

    /**
     * Class-specific AI behaviors
     */
    classBehaviors: {
        green: {
            fleeDistance: GAME_RULES.FLEE_DISTANCE,
            healThreshold: GAME_RULES.HEAL_THRESHOLD,
            criticalThreshold: GAME_RULES.CRITICAL_HP_THRESHOLD
        },
        darkgreen: {
            zombieFollowDistance: GAME_RULES.FOLLOW_DISTANCE
        }
    }
};
