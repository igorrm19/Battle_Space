import * as THREE from 'three';
import { GAME_RULES } from '../data/GameRules.js';
import { AIStrategies } from './AIStrategies.js';

/**
 * NPC AI logic and decision making
 */
export const NPCAI = {
    /**
     * Execute healer flee logic (for green/healer class)
     * @param {THREE.Vector3} position - NPC position
     * @param {Array} others - Array of other NPCs
     * @param {THREE.Vector3} targetPos - Current target position (will be set)
     * @returns {THREE.Vector3|null} New target position or null
     */
    executeHealerFleeLogic(position, others, targetPos) {
        const behavior = AIStrategies.classBehaviors.green;
        const nearestEnemy = others.find(n => 
            n.faction !== this.faction && 
            position.distanceTo(n.position) < behavior.fleeDistance
        );
        
        if (nearestEnemy) {
            const fleeDir = position.clone().sub(nearestEnemy.position).normalize();
            return position.clone().add(fleeDir.multiplyScalar(behavior.fleeDistance + 2));
        }
        return null;
    },

    /**
     * Execute zombie follow logic
     * @param {THREE.Vector3} position - Zombie position
     * @param {string} masterId - Master NPC ID
     * @param {Array} others - Array of other NPCs
     * @param {THREE.Vector3} velocity - Current velocity
     * @param {number} maxForce - Maximum force
     * @returns {THREE.Vector3|null} Steering force or null
     */
    executeZombieFollowLogic(position, masterId, others, velocity, maxForce) {
        const master = others.find(n => n.id === masterId);
        if (!master) return null;

        const behavior = AIStrategies.classBehaviors.darkgreen;
        const distToMaster = position.distanceTo(master.position);
        
        if (distToMaster > behavior.zombieFollowDistance) {
            const followDir = master.position.clone().sub(position).normalize();
            return followDir.multiplyScalar(maxForce);
        }
        return null;
    },

    /**
     * Choose target based on strategy
     * @param {string} strategy - Strategy name
     * @param {Array} targets - Available targets
     * @returns {Object|null} Selected target or null
     */
    chooseTarget(strategy, targets) {
        if (!targets || targets.length === 0) return null;

        switch (strategy) {
            case 'aggressive':
                // Target strongest (highest level/HP)
                return targets.reduce((strongest, current) => {
                    const currentPower = (current.level || 1) + (current.hp || 0) / 100;
                    const strongestPower = (strongest.level || 1) + (strongest.hp || 0) / 100;
                    return currentPower > strongestPower ? current : strongest;
                });
            
            case 'farmer':
                // Target weakest (lowest HP percentage)
                return targets.reduce((weakest, current) => {
                    const currentHPPercent = (current.hp || 0) / (current.maxHp || 1);
                    const weakestHPPercent = (weakest.hp || 0) / (weakest.maxHp || 1);
                    return currentHPPercent < weakestHPPercent ? current : weakest;
                });
            
            case 'tactician':
                // Target strategic (lowest HP but not too weak, or highest threat)
                return targets.reduce((best, current) => {
                    const currentHPPercent = (current.hp || 0) / (current.maxHp || 1);
                    const bestHPPercent = (best.hp || 0) / (best.maxHp || 1);
                    const currentThreat = (current.level || 1) * (1 - currentHPPercent);
                    const bestThreat = (best.level || 1) * (1 - bestHPPercent);
                    
                    // Prioritize medium HP enemies (not too weak, not too strong)
                    if (currentHPPercent > 0.2 && currentHPPercent < 0.8) {
                        return currentThreat > bestThreat ? current : best;
                    }
                    return currentThreat > bestThreat ? current : best;
                });
            
            default:
                // Random target
                return targets[Math.floor(Math.random() * targets.length)];
        }
    },

    /**
     * Decide if NPC should flee
     * @param {Object} npc - NPC object
     * @param {Array} enemies - Array of enemy NPCs
     * @returns {boolean} True if should flee
     */
    shouldFlee(npc, enemies) {
        if (npc.class !== 'green') return false; // Only healers flee
        
        const behavior = AIStrategies.classBehaviors.green;
        const nearbyEnemies = enemies.filter(e => 
            npc.position.distanceTo(e.position) < behavior.fleeDistance
        );
        
        return nearbyEnemies.length > 0;
    },

    /**
     * Get target position for seeking
     * @param {THREE.Vector3} currentPos - Current position
     * @param {THREE.Vector3} targetPos - Target position
     * @param {number} arrivalDistance - Distance to consider "arrived"
     * @returns {THREE.Vector3|null} Target position or null if arrived
     */
    getSeekTarget(currentPos, targetPos, arrivalDistance = GAME_RULES.ARRIVAL_DISTANCE) {
        if (!targetPos) return null;
        if (currentPos.distanceTo(targetPos) < arrivalDistance) return null;
        return targetPos;
    }
};
