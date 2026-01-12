import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { BossAI } from '../../src/ai/BossAI.js';
import { state } from '../../src/core/State.js';

// Mock state
vi.mock('../../src/core/State.js', () => ({
    state: {
        bosses: {
            gold: { hp: 0, alive: false } // Dead gold boss so it won't be targeted
        },
        monsterHp: 0 // Dead void boss
    }
}));

describe('BossAI', () => {
    describe('chooseVoidBossTarget', () => {
        it('should return player as default', () => {
            const npcs = [];
            const playerPos = new THREE.Vector3(0, 0, 0);
            const target = BossAI.chooseVoidBossTarget(npcs, playerPos);
            expect(target).toBe('player');
        });

        it('should prioritize strongest NPC when available', () => {
            const npcs = [
                { id: 'npc1', level: 5, hp: 100 },
                { id: 'npc2', level: 10, hp: 200 }
            ];
            const target = BossAI.chooseVoidBossTarget(npcs, new THREE.Vector3());
            expect(['npc2', 'player']).toContain(target);
        });
    });

    describe('chooseGoldBossTarget', () => {
        it('should return player as default', () => {
            const npcs = [];
            const playerPos = new THREE.Vector3(0, 0, 0);
            const target = BossAI.chooseGoldBossTarget(npcs, playerPos);
            expect(target).toBe('player');
        });

        it('should consider NPCs when available', () => {
            const npcs = [
                { id: 'npc1', level: 5, hp: 100 }
            ];
            const target = BossAI.chooseGoldBossTarget(npcs, new THREE.Vector3());
            expect(['npc1', 'player']).toContain(target);
        });
    });

    describe('updateGoldBossPosition', () => {
        it('should return same position if target is null', () => {
            const pos = new THREE.Vector3(0, 0, 0);
            const result = BossAI.updateGoldBossPosition(pos, null, 0.016);
            expect(result.x).toBe(0);
            expect(result.y).toBe(0);
            expect(result.z).toBe(0);
        });

        it('should move towards target', () => {
            const pos = new THREE.Vector3(0, 0, 0);
            const target = new THREE.Vector3(10, 0, 0);
            const result = BossAI.updateGoldBossPosition(pos, target, 0.016);
            expect(result.x).toBeGreaterThan(0);
        });

        it('should not move if target is too close', () => {
            const pos = new THREE.Vector3(0, 0, 0);
            const target = new THREE.Vector3(2, 0, 0);
            const result = BossAI.updateGoldBossPosition(pos, target, 0.016);
            expect(result.x).toBe(0);
        });

        it('should add floating animation to Y', () => {
            const pos = new THREE.Vector3(0, 0, 0);
            const target = new THREE.Vector3(10, 0, 0);
            const result = BossAI.updateGoldBossPosition(pos, target, 0.016);
            expect(result.y).toBeGreaterThan(4);
            expect(result.y).toBeLessThan(6);
        });
    });
});
