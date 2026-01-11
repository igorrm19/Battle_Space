import * as THREE from 'three';
import { state, updateState } from '../core/State.js';
import { NPC } from './NPC.js';
import { npcAttack } from '../game/Combat.js';
import { audioManager } from '../core/Audio.js';

export class NPCManager {
    constructor(scene, hud) {
        this.scene = scene;
        this.hud = hud;
        this.npcs = [];
        this.npcTimers = new Map();
    }

    generateWeightedLevel() {
        // Level 1 is most common, Level 20 is 1%
        // Using a power function to weight towards lower levels
        const r = Math.random();
        if (r < 0.01) return 20; // 1% chance for level 20
        if (r < 0.05) return Math.floor(Math.random() * 5) + 15; // 4% chance for 15-19
        if (r < 0.2) return Math.floor(Math.random() * 5) + 10; // 15% chance for 10-14
        if (r < 0.5) return Math.floor(Math.random() * 5) + 5; // 30% chance for 5-9
        return Math.floor(Math.random() * 4) + 1; // 50% chance for 1-4
    }

    spawnInitialNpcs() {
        const configs = [
            { id: 'aliado_1', faction: 'player', class: 'green', index: 0 },
            { id: 'aliado_2', faction: 'player', class: 'brown', index: 1 },
            { id: 'aliado_3', faction: 'player', class: 'purple', index: 2 },
            { id: 'aliado_4', faction: 'player', class: 'yellow', index: 3 },
            { id: 'vazio_1', faction: 'void', class: 'red', index: 0 },
            { id: 'vazio_2', faction: 'void', class: 'yellow', index: 1 },
            { id: 'vazio_3', faction: 'void', class: 'purple', index: 2 },
            { id: 'vazio_4', faction: 'void', class: 'red', index: 3 },
            { id: 'ouro_1', faction: 'gold', class: 'red', index: 0 },
            { id: 'ouro_2', faction: 'gold', class: 'yellow', index: 1 },
            { id: 'ouro_3', faction: 'gold', class: 'brown', index: 2 },
            { id: 'ouro_4', faction: 'gold', class: 'purple', index: 3 },
            { id: 'lider_rosa', faction: 'player', class: 'pink', index: 4 },
            { id: 'necro_verde', faction: 'void', class: 'darkgreen', index: 4 },
            { id: 'lider_ouro', faction: 'gold', class: 'pink', index: 5 },
            { id: 'necro_aliado', faction: 'player', class: 'darkgreen', index: 5 },
            { id: 'gelo_aliado', faction: 'player', class: 'blue', index: 6 },
            { id: 'gelo_vazio', faction: 'void', class: 'blue', index: 6 }
        ];

        this.npcs = configs.map(cfg => {
            const level = this.generateWeightedLevel();
            const npc = new NPC(this.scene, { ...cfg, level });
            return npc;
        });

        updateState({
            npcs: this.npcs.map(n => ({
                id: n.id,
                hp: n.maxHp,
                maxHp: n.maxHp,
                faction: n.faction,
                class: n.class,
                level: n.level,
                isZombie: false,
                strategy: n.strategy,
                stats: n.stats || { atk: 30, def: 10, eva: 0.1 }
            }))
        });
    }

    update(delta, playerPos) {
        // Death & Cleanup Logic
        for (let i = this.npcs.length - 1; i >= 0; i--) {
            const n = this.npcs[i];
            if (n.hp <= 0) {
                // Zombie Death Link
                if (n.class === 'darkgreen') {
                    this.npcs.forEach(z => {
                        if (z.masterId === n.id) z.hp = 0;
                    });
                }
                n.destroy();
                this.npcs.splice(i, 1);
                this.npcTimers.delete(n.id);
            }
        }

        // Sync state.npcs with this.npcs
        const aliveNpcStates = this.npcs.map(n => ({
            id: n.id,
            hp: n.hp,
            maxHp: n.maxHp,
            faction: n.faction,
            class: n.class,
            level: n.level,
            isZombie: n.isZombie,
            strategy: n.strategy,
            stats: n.stats,
            statusEffects: n.statusEffects || []
        }));
        updateState({ npcs: aliveNpcStates });

        // Immediate Respawn Logic
        const maxNpcs = 16;
        if (state.inBattle && this.npcs.length < maxNpcs) {
            for (let i = 0; i < (maxNpcs - this.npcs.length); i++) {
                this.respawnNpc();
            }
        }

        this.npcs.forEach(n => {
            const others = this.npcs.filter(other => other !== n);
            n.update(delta, others, playerPos, state.monsterPos, state.goldBossPos);
        });

        // NPC AI Loops (Combat Re-enabled)
        state.npcs.forEach(npcState => {
            if (npcState.hp > 0) {
                let timer = this.npcTimers.get(npcState.id) || 0;
                timer += delta;
                if (timer >= 2.0 + Math.random() * 2) {
                    timer = 0;
                    this.handleNpcTurn(npcState.id);
                }
                this.npcTimers.set(npcState.id, timer);
            }
        });
    }

    handleNpcTurn(npcId) {
        const result = npcAttack(npcId, this.npcs);
        if (!result) return;

        const npc = this.npcs.find(n => n.id === npcId);
        if (!npc) return;

        // Visual/Audio Feedback
        if (result.type === 'heal') {
            npc.performAbility('heal');
            audioManager.playLevelUp();
            this.hud.showNotification(`${npc.id.toUpperCase()} CUROU!`, "#00ff00");
        } else if (result.type === 'gravity') {
            const targetPos = this.getTargetPosition(result.targetId);
            npc.performAbility('gravity', targetPos);
            audioManager.playGravity();
        } else if (result.type === 'teleport') {
            npc.performAbility('teleport');
        } else if (result.type === 'convert' || result.type === 'zombie') {
            npc.performAbility('convert');
            this.hud.showNotification(`${result.targetId.toUpperCase()} AFETADO!`, "#ff00ff");
        } else if (result.type === 'freeze') {
            const targetPos = this.getTargetPosition(result.targetId);
            npc.performAbility('freeze', targetPos);
            this.hud.showNotification(`${result.targetId.toUpperCase()} CONGELADO!`, "#00ffff");
        } else {
            const targetPos = this.getTargetPosition(result.targetId);
            if (targetPos) {
                npc.targetPos = targetPos; // Set target for movement
                npc.performAttack(targetPos);
            }
            if (npc.class === 'red') audioManager.playFire();
            if (npc.class === 'yellow') audioManager.playLightning();
        }

        this.hud.updateNpcHud();
    }

    respawnNpc() {
        const factions = ['player', 'void', 'gold'];
        const classes = ['green', 'yellow', 'red', 'purple', 'brown', 'pink', 'darkgreen', 'blue'];
        const faction = factions[Math.floor(Math.random() * factions.length)];
        const cls = classes[Math.floor(Math.random() * classes.length)];
        const id = `${cls}_${Math.random().toString(36).substr(2, 5)}`;
        const level = this.generateWeightedLevel();

        const config = { id, faction, class: cls, index: Math.floor(Math.random() * 10), level };
        const npc = new NPC(this.scene, config);

        const newNpcState = {
            id, hp: npc.maxHp, maxHp: npc.maxHp, faction, class: cls,
            level: npc.level, isZombie: false,
            strategy: npc.strategy,
            stats: npc.stats
        };

        this.npcs.push(npc);
        updateState({ npcs: [...state.npcs, newNpcState] });
    }

    getTargetPosition(targetId) {
        if (targetId === 'player') return state.playerPos;
        if (targetId === 'void_boss') return state.monsterPos;
        if (targetId === 'gold_boss') return state.goldBossPos;
        return this.npcs.find(n => n.id === targetId)?.mesh.position;
    }
}
