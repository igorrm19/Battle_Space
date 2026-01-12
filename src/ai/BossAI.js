import * as THREE from 'three';
import { state } from '../core/State.js';

/**
 * Boss AI logic
 */
export const BossAI = {
    /**
     * Choose target for void boss
     * @param {Array} npcs - Available NPCs
     * @param {THREE.Vector3} playerPos - Player position
     * @returns {string} Target ID
     */
    chooseVoidBossTarget(npcs, playerPos) {
        // 70% chance to target strongest NPC or other boss
        if (Math.random() < 0.7) {
            const aliveNpcs = npcs.filter(n => n.hp > 0);
            if (aliveNpcs.length > 0) {
                const strongest = aliveNpcs.reduce((strongest, current) => {
                    return (current.level || 1) > (strongest.level || 1) ? current : strongest;
                });
                return strongest.id;
            }
            // Target gold boss if no NPCs
            if (state.bosses.gold.hp > 0) return 'gold_boss';
        }
        return 'player';
    },

    /**
     * Choose target for gold boss
     * @param {Array} npcs - Available NPCs
     * @param {THREE.Vector3} playerPos - Player position
     * @returns {string} Target ID
     */
    chooseGoldBossTarget(npcs, playerPos) {
        // Similar logic to void boss
        if (Math.random() < 0.7) {
            const aliveNpcs = npcs.filter(n => n.hp > 0);
            if (aliveNpcs.length > 0) {
                const strongest = aliveNpcs.reduce((strongest, current) => {
                    return (current.level || 1) > (strongest.level || 1) ? current : strongest;
                });
                return strongest.id;
            }
            if (state.monsterHp > 0) return 'void_boss';
        }
        return 'player';
    },

    /**
     * Calculate gold boss movement
     * @param {THREE.Vector3} position - Current position
     * @param {THREE.Vector3} targetPos - Target position
     * @param {number} delta - Delta time
     * @returns {THREE.Vector3} New position
     */
    updateGoldBossPosition(position, targetPos, delta) {
        if (!targetPos) return position;
        
        const desired = targetPos.clone().sub(position);
        if (isNaN(desired.x) || isNaN(desired.y) || isNaN(desired.z) || desired.length() <= 5) {
            return position;
        }
        
        desired.normalize().multiplyScalar(0.1);
        const newPos = position.clone().add(desired);
        
        // Add floating animation
        newPos.y = 5 + Math.sin(Date.now() * 0.002) * 0.5;
        
        return newPos;
    }
};
