import { state, updateState } from '../../core/State.js';

/**
 * Combat rules and calculations
 */
export const CombatRules = {
    /**
     * Calculate damage after defense reduction
     * @param {number} baseDmg - Base damage
     * @param {number} defense - Target defense
     * @returns {number} Final damage (minimum 1)
     */
    calculateDamage(baseDmg, defense) {
        return Math.max(1, baseDmg - defense);
    },

    /**
     * Check if attack is a critical hit
     * @param {number} critChance - Critical hit chance (0-1)
     * @returns {boolean} True if critical hit
     */
    isCriticalHit(critChance = 0.1) {
        return Math.random() < critChance;
    },

    /**
     * Calculate critical damage multiplier
     * @param {number} baseDmg - Base damage
     * @param {number} multiplier - Critical multiplier (default 2.0)
     * @returns {number} Critical damage
     */
    calculateCriticalDamage(baseDmg, multiplier = 2.0) {
        return baseDmg * multiplier;
    },

    /**
     * Calculate XP gain from damage
     * @param {number} damage - Damage dealt
     * @param {number} xpMultiplier - XP multiplier (default 0.2)
     * @returns {number} XP gained
     */
    calculateDamageXP(damage, xpMultiplier = 0.2) {
        return damage * xpMultiplier;
    },

    /**
     * Calculate XP gain from kill
     * @param {number} targetLevel - Level of killed target
     * @param {number} baseXP - Base XP per level (default 100)
     * @returns {number} XP gained
     */
    calculateKillXP(targetLevel, baseXP = 100) {
        return baseXP * targetLevel;
    },

    /**
     * Calculate heal amount on kill (vampirism)
     * @param {number} maxHp - Maximum HP
     * @param {number} healPercentage - Heal percentage (default 0.3)
     * @returns {number} Heal amount
     */
    calculateKillHeal(maxHp, healPercentage = 0.3) {
        return maxHp * healPercentage;
    },

    /**
     * Process level up for an entity
     * @param {Object} entity - Entity with level, xp, maxXp, stats, maxHp
     * @returns {Object|null} Level up result with newLevel, statIncreases, or null if no level up
     */
    processLevelUp(entity) {
        if (entity.xp < entity.maxXp) return null;

        const newLevel = Math.min(entity.level + 1, 50);
        const newXp = entity.xp - entity.maxXp;
        const newMaxXp = entity.maxXp * 1.5;
        
        return {
            newLevel,
            newXp,
            newMaxXp,
            maxHpIncrease: 100,
            statIncreases: {
                atk: 10,
                def: 5,
                eva: 0.01
            }
        };
    },

    /**
     * Calculate gold reward for killing monster
     * @param {number} playerLevel - Player level
     * @param {number} baseGold - Base gold reward (default 100)
     * @param {number} goldPerLevel - Gold per level (default 20)
     * @returns {number} Gold reward
     */
    calculateMonsterKillReward(playerLevel, baseGold = 100, goldPerLevel = 20) {
        return baseGold + (playerLevel * goldPerLevel);
    },

    /**
     * Calculate XP reward for killing monster
     * @param {number} baseXP - Base XP reward (default 500)
     * @returns {number} XP reward
     */
    calculateMonsterKillXP(baseXP = 500) {
        return baseXP;
    },

    /**
     * Check evasion
     * @param {number} evasion - Evasion chance (0-1)
     * @returns {boolean} True if attack evaded
     */
    checkEvasion(evasion) {
        return Math.random() < evasion;
    }
};
