import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { NPCAI } from '../../src/ai/NPCAI.js';
import { GAME_RULES } from '../../src/data/GameRules.js';

describe('NPCAI', () => {
    describe('executeHealerFleeLogic', () => {
        it('should return null if no nearby enemies', () => {
            const position = new THREE.Vector3(0, 0, 0);
            const others = [
                { faction: 'player', position: new THREE.Vector3(20, 0, 0) }
            ];
            // Bind context for test
            const context = { faction: 'player' };
            const result = NPCAI.executeHealerFleeLogic.call(context, position, others, null);
            expect(result).toBeNull();
        });

        it('should return flee position when enemy is nearby', () => {
            const position = new THREE.Vector3(0, 0, 0);
            const others = [
                { faction: 'void', position: new THREE.Vector3(5, 0, 0) }
            ];
            const context = { faction: 'player' };
            const result = NPCAI.executeHealerFleeLogic.call(context, position, others, null);
            expect(result).not.toBeNull();
            expect(result.x).toBeLessThan(0); // Should flee away
        });
    });

    describe('executeZombieFollowLogic', () => {
        it('should return null if master not found', () => {
            const position = new THREE.Vector3(0, 0, 0);
            const others = [];
            const result = NPCAI.executeZombieFollowLogic(position, 'master123', others, new THREE.Vector3(), 1.0);
            expect(result).toBeNull();
        });

        it('should return null if master is close', () => {
            const position = new THREE.Vector3(0, 0, 0);
            const master = { id: 'master123', position: new THREE.Vector3(2, 0, 0) };
            const others = [master];
            const result = NPCAI.executeZombieFollowLogic(position, 'master123', others, new THREE.Vector3(), 1.0);
            expect(result).toBeNull();
        });

        it('should return follow force if master is far', () => {
            const position = new THREE.Vector3(0, 0, 0);
            const master = { id: 'master123', position: new THREE.Vector3(10, 0, 0) };
            const others = [master];
            const result = NPCAI.executeZombieFollowLogic(position, 'master123', others, new THREE.Vector3(), 1.0);
            expect(result).not.toBeNull();
            expect(result.length()).toBeGreaterThan(0);
        });
    });

    describe('chooseTarget', () => {
        const createTarget = (id, level, hp, maxHp) => ({
            id,
            level: level || 1,
            hp: hp || 100,
            maxHp: maxHp || 100
        });

        it('should return null for empty targets', () => {
            const target = NPCAI.chooseTarget('aggressive', []);
            expect(target).toBeNull();
        });

        it('should return target for aggressive strategy', () => {
            const targets = [
                createTarget('weak', 1, 100, 100),
                createTarget('strong', 10, 500, 500)
            ];
            const target = NPCAI.chooseTarget('aggressive', targets);
            expect(target.id).toBe('strong');
        });

        it('should return weakest target for farmer strategy', () => {
            const targets = [
                createTarget('strong', 10, 500, 500),
                createTarget('weak', 1, 10, 100)
            ];
            const target = NPCAI.chooseTarget('farmer', targets);
            expect(target.id).toBe('weak');
        });

        it('should return target for tactician strategy', () => {
            const targets = [
                createTarget('t1', 5, 50, 100),
                createTarget('t2', 5, 60, 100)
            ];
            const target = NPCAI.chooseTarget('tactician', targets);
            expect(target).not.toBeNull();
        });

        it('should return random target for unknown strategy', () => {
            const targets = [
                createTarget('t1', 1, 100, 100),
                createTarget('t2', 1, 100, 100)
            ];
            const target = NPCAI.chooseTarget('unknown', targets);
            expect(targets).toContain(target);
        });
    });

    describe('shouldFlee', () => {
        it('should return false for non-healer classes', () => {
            const npc = { class: 'red', position: new THREE.Vector3(0, 0, 0) };
            const enemies = [{ position: new THREE.Vector3(5, 0, 0) }];
            const result = NPCAI.shouldFlee(npc, enemies);
            expect(result).toBe(false);
        });

        it('should return true for healer with nearby enemies', () => {
            const npc = { class: 'green', position: new THREE.Vector3(0, 0, 0) };
            const enemies = [{ position: new THREE.Vector3(5, 0, 0) }];
            const result = NPCAI.shouldFlee(npc, enemies);
            expect(result).toBe(true);
        });
    });

    describe('getSeekTarget', () => {
        it('should return null if targetPos is null', () => {
            const result = NPCAI.getSeekTarget(new THREE.Vector3(), null);
            expect(result).toBeNull();
        });

        it('should return null if already arrived', () => {
            const pos = new THREE.Vector3(0, 0, 0);
            const target = new THREE.Vector3(2, 0, 0);
            const result = NPCAI.getSeekTarget(pos, target, 5.0);
            expect(result).toBeNull();
        });

        it('should return target if far away', () => {
            const pos = new THREE.Vector3(0, 0, 0);
            const target = new THREE.Vector3(10, 0, 0);
            const result = NPCAI.getSeekTarget(pos, target, 5.0);
            expect(result).not.toBeNull();
            expect(result.x).toBe(10);
        });
    });
});
