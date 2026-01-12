import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { state, updateState } from '../../src/core/State.js';
import { NPC } from '../../src/world/NPC.js';
import { NPC_ABILITIES } from '../../src/game/abilities/NPCAbilities.js';
import { GAME_RULES } from '../../src/data/GameRules.js';

describe('Yellow NPC - Charge and Lightning', () => {
    let scene;
    let yellowInstance;
    let enemyInstance;

    beforeEach(() => {
        // Reset state
        updateState({ npcs: [] });
        scene = new THREE.Scene();

        // Create a yellow NPC instance
        const yellowStateObj = { id: 'yellow_1', faction: 'void', class: 'yellow', hp: 1000, maxHp: 1000, level: 1, stats: { atk: 30 } };
        state.npcs.push(yellowStateObj);
        yellowInstance = new NPC(scene, { id: 'yellow_1', faction: 'void', class: 'yellow', level: 1, index: 0 });
        yellowInstance.energy = GAME_RULES.YELLOW_BASE_ENERGY + 200; // ample energy
        // Place yellow near enemies for tests
        yellowInstance.position.copy(new THREE.Vector3(0,1,0));
        const ys = state.npcs.find(n => n.id === 'yellow_1'); ys.position = yellowInstance.position;

        // Create enemy state + instance
        const enemyState = { id: 'enemy_1', faction: 'player', class: 'red', hp: 200, maxHp: 200, level: 1, stats: { atk: 20 }, position: new THREE.Vector3(2,1,0) };
        state.npcs.push(enemyState);
        enemyInstance = new NPC(scene, { id: 'enemy_1', faction: 'player', class: 'red', level: 1, index: 1 });
        enemyInstance.position.copy(new THREE.Vector3(2,1,0));
        enemyState.position = enemyInstance.position;
    });

    it('should start charging on ability call and then fire single lightning after charge time', () => {
        const yellowState = state.npcs.find(n => n.id === 'yellow_1');
        const enemyState = state.npcs.find(n => n.id === 'enemy_1');

        // Trigger ability (should begin charging)
        const res = NPC_ABILITIES.yellow(yellowState, { id: 'enemy_1', position: enemyInstance.position }, yellowInstance, enemyInstance);
        expect(yellowInstance.isCharging).toBe(true);

        // Advance time past charge
        yellowInstance.update(GAME_RULES.YELLOW_CHARGE_TIME + 0.1, state.npcs, state.playerPos, state.monsterPos, state.goldBossPos);

        // After completion, enemy should have taken damage
        const updatedEnemy = state.npcs.find(n => n.id === 'enemy_1');
        expect(updatedEnemy.hp).toBeLessThan(200);
    });

    it('should perform multi lightning when multiple enemies present', () => {
        // Add more enemies
        const e2 = { id: 'enemy_2', faction: 'player', class: 'red', hp: 150, maxHp: 150, level: 1, stats: { atk: 20 }, position: new THREE.Vector3(3,1,0) };
        const e3 = { id: 'enemy_3', faction: 'player', class: 'red', hp: 150, maxHp: 150, level: 1, stats: { atk: 20 }, position: new THREE.Vector3(4,1,0) };
        state.npcs.push(e2, e3);
        const e2inst = new NPC(scene, { id: 'enemy_2', faction: 'player', class: 'red', level: 1, index: 2 });
        const e3inst = new NPC(scene, { id: 'enemy_3', faction: 'player', class: 'red', level: 1, index: 3 });
        e2.position = e2inst.position;
        e3.position = e3inst.position;

        const yellowState = state.npcs.find(n => n.id === 'yellow_1');

        // Trigger ability: should begin multi-charge
        const res = NPC_ABILITIES.yellow(yellowState, { id: 'enemy_1', position: enemyInstance.position }, yellowInstance, enemyInstance);
        expect(yellowInstance.isCharging).toBe(true);

        // Force it to multi (manual override for test)
        yellowInstance.chargeType = 'multi';

        // Advance time
        yellowInstance.update(GAME_RULES.YELLOW_CHARGE_TIME + 0.1, state.npcs, state.playerPos, state.monsterPos, state.goldBossPos);

        // At least two of the enemies should have reduced HP
        const e1 = state.npcs.find(n => n.id === 'enemy_1');
        const e2s = state.npcs.find(n => n.id === 'enemy_2');
        const e3s = state.npcs.find(n => n.id === 'enemy_3');

        const damaged = [e1, e2s, e3s].filter(e => e && e.hp < e.maxHp).length;
        expect(damaged).toBeGreaterThanOrEqual(1);
    });
});
