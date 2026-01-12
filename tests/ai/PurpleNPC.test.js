import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { NPC } from '../../src/world/NPC.js';
import { NPCManager } from '../../src/world/NPCManager.js';
import { state, updateState } from '../../src/core/State.js';

// Basic smoke tests to ensure void orb applies damage and teleport visual triggers

describe('Purple NPC abilities', () => {
    let scene, manager, npc, targetNpc;

    beforeEach(() => {
        // Minimal scene stub
        scene = new THREE.Scene();
        manager = new NPCManager(scene, { showNotification: () => {}, updateNpcHud: () => {} });

        // Spawn a purple NPC
        npc = new NPC(scene, { id: 'test_purple', faction: 'player', class: 'purple', level: 2 });
        manager.npcs.push(npc);

        // Create a target NPC in state and simple instance
        const t = new NPC(scene, { id: 'target_1', faction: 'void', class: 'red', level: 1 });
        t.position.set(5, 1, 2);
        t.mesh.position.copy(t.position);
        manager.npcs.push(t);

        // Sync state
        updateState({ npcs: manager.npcs.map(n => ({ id: n.id, hp: n.maxHp, maxHp: n.maxHp, faction: n.faction, class: n.class, level: n.level, stats: n.stats })) });
    });

    it('void orb should apply damage to target immediately', () => {
        const beforeHp = state.npcs.find(n => n.id === 'target_1').hp;
        // Call performAbility with meta (pos, targetId, dmg)
        const pos = manager.getTargetPosition('target_1');
        npc.performAbility('void', { pos, targetId: 'target_1', dmg: 120 });
        const afterHp = state.npcs.find(n => n.id === 'target_1').hp;
        expect(afterHp).toBeLessThan(beforeHp);
    });

    it('teleport should move NPC and create reveal VFX', () => {
        const oldPos = npc.position.clone();
        npc.performAbility('teleport');
        // Teleport uses random; we assert position changed
        expect(npc.position.x).not.toBeCloseTo(oldPos.x);
        expect(npc.position.z).not.toBeCloseTo(oldPos.z);
    });

    it('void orb should ignore the target defense', () => {
        // Make the target very tanky
        const tState = state.npcs.find(n => n.id === 'target_1');
        tState.stats = { def: 100 };
        updateState({ npcs: [...state.npcs] });

        const dmg = 80;
        const beforeHp = state.npcs.find(n => n.id === 'target_1').hp;
        const pos = manager.getTargetPosition('target_1');
        npc.performAbility('void', { pos, targetId: 'target_1', dmg });
        const afterHp = state.npcs.find(n => n.id === 'target_1').hp;
        // If defense was ignored, hp should drop by full dmg
        expect(beforeHp - afterHp).toBe(dmg);
    });
});