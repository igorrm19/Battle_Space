import * as THREE from 'three';
import { state, updateState } from '../../core/State.js';
import { dealDamage } from '../Combat.js';
import { GAME_RULES } from '../../data/GameRules.js';

/**
 * NPC Abilities Registry
 * Contains all special abilities for each NPC class
 */
export const NPC_ABILITIES = {
    green: (npc, target, npcInstance, targetInstance) => {
        const allies = state.npcs.filter(n => n.faction === npc.faction && n.hp > 0);
        if (npc.faction === 'player') allies.push({ id: 'player', hp: state.hp, maxHp: state.maxHp, position: state.playerPos });

        // Filter allies within range (15 units)
        const nearbyAllies = allies.filter(a => {
            const pos = a.position || (state.npcs.find(n => n.id === a.id)?.position);
            return pos && npcInstance.position.distanceTo(pos) < 15;
        });

        const allyToHeal = nearbyAllies.sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];

        if (allyToHeal && allyToHeal.hp / allyToHeal.maxHp < 0.8) {
            // Faction Synergy: Healers prioritize leaders (Pink) or very low HP allies
            const isLeader = allyToHeal.class === 'pink';
            const isCritical = allyToHeal.hp / allyToHeal.maxHp < 0.3;
            const synergyBonus = (isLeader || isCritical) ? 1.5 : 1.0;

            const healAmt = (50 + (state.lvl * 10)) * (1 + (npc.level || 1) * 0.2) * synergyBonus;
            if (allyToHeal.id === 'player') updateState({ hp: Math.min(state.maxHp, state.hp + healAmt) });
            else {
                const targetNpc = state.npcs.find(n => n.id === allyToHeal.id);
                if (targetNpc) {
                    targetNpc.hp = Math.min(targetNpc.maxHp, targetNpc.hp + healAmt);
                }
            }
            updateState({ npcs: [...state.npcs] });
            return { type: 'heal', amount: healAmt, targetId: allyToHeal.id, synergy: isLeader || isCritical };
        }
    },

    purple: (npc, target, npcInstance, targetInstance) => {
        // Void Orb (Ignore Defense) + Teleport Chance
        const teleportChance = 0.3 - (npc.level || 1) * 0.02;
        if (Math.random() < teleportChance) return { type: 'teleport' };

        // Void Orb Logic
        const dmg = (npc.stats?.atk || 30) * 1.5; // High damage
        if (targetInstance) {
            // Deal damage ignoring defense (simulated by high damage)
            dealDamage(target.id, dmg, true, npcInstance.scene.children);
        }
        return { type: 'void', targetId: target.id, dmg };
    },

    red: (npc, target, npcInstance, targetInstance) => {
        // Fireball (AoE + Burn)
        const dist = npcInstance.position.distanceTo(target.position || new THREE.Vector3());
        if (dist < 10) {
            const dmg = (npc.stats?.atk || 30) * 1.2;
            // Apply Burn
            const targetNpc = state.npcs.find(n => n.id === target.id);
            if (targetNpc) {
                if (!targetNpc.statusEffects) targetNpc.statusEffects = [];
                if (!targetNpc.statusEffects.includes('fire')) targetNpc.statusEffects.push('fire');
            }
            return { type: 'fire', targetId: target.id, dmg };
        }
    },

    yellow: (npc, target, npcInstance, targetInstance) => {
        // New Lightning behavior: charge then fire single or multi bolts
        // If already charging, do nothing and let NPC.update handle completion
        if (npcInstance.isCharging) return { type: 'charging' };

        const dist = npcInstance.position.distanceTo(target.position || new THREE.Vector3());

        // Decide between single or multi based on nearby enemies
        const nearby = state.npcs.filter(n => n.faction !== npc.faction && n.hp > 0 && npcInstance.position.distanceTo(n.position || new THREE.Vector3()) < 12);

        // Prefer multi if multiple enemies and enough energy
        if (nearby.length >= 2 && npcInstance.energy >= GAME_RULES.YELLOW_CHARGE_COST_MULTI) {
            npcInstance.beginCharge(null, 'multi');
            return { type: 'charging', mode: 'multi' };
        }

        // Otherwise attempt single-target if within range and energy
        if (dist < 12 && npcInstance.energy >= GAME_RULES.YELLOW_CHARGE_COST_SINGLE) {
            npcInstance.beginCharge(target.id, 'single', targetInstance);
            return { type: 'charging', mode: 'single', targetId: target.id };
        }

        // Fallback: small chain lightning if not enough energy
        if (dist < 12) {
            const baseDmg = (npc.stats?.atk || 30) * 0.5;
            dealDamage(target.id, baseDmg, false, npcInstance.scene.children);
            return { type: 'lightning', targetId: target.id, dmg: baseDmg };
        }
    },

    pink: (npc, target, npcInstance, targetInstance) => {
        const dist = npcInstance.position.distanceTo(target.position || new THREE.Vector3());
        // Level Scaling: Larger conversion range
        const range = 5 + (npc.level || 1) * 0.5;
        if (dist < range && Math.random() > 0.6 && !['player', 'void_boss', 'gold_boss'].includes(target.id)) {
            const targetNpc = state.npcs.find(n => n.id === target.id);
            if (targetNpc) {
                targetNpc.faction = npc.faction;
                updateState({ npcs: [...state.npcs] });
                return { type: 'convert', targetId: target.id };
            }
        }
    },

    darkgreen: (npc, target, npcInstance, targetInstance) => {
        const dist = npcInstance.position.distanceTo(target.position || new THREE.Vector3());
        // Level Scaling: Higher zombie threshold
        const threshold = 0.3 + (npc.level || 1) * 0.05;
        if (dist < 6 && Math.random() > 0.4 && !['player', 'void_boss', 'gold_boss'].includes(target.id)) {
            const targetNpc = state.npcs.find(n => n.id === target.id);
            if (targetNpc && targetNpc.hp < targetNpc.maxHp * threshold) {
                targetNpc.isZombie = true;
                targetNpc.masterId = npc.id;
                targetNpc.faction = npc.faction;

                // Necromancer Buffs (Life Steal & Stat Boost)
                npc.hp = Math.min(npc.maxHp, npc.hp + npc.maxHp * 0.2); // Heal 20%
                if (!npc.stats) npc.stats = { atk: 30, def: 10, eva: 0.1 };
                npc.stats.atk += 5;
                npc.stats.def += 2;

                updateState({ npcs: [...state.npcs] });
                return { type: 'zombie', targetId: target.id };
            }
        }
    },

    brown: (npc, target, npcInstance, targetInstance) => {
        const isPull = Math.random() > 0.5;
        if (targetInstance) {
            const dir = targetInstance.position.clone().sub(npcInstance.position).normalize();
            // Level Scaling: Stronger gravity force
            const forceAmt = 5 + (npc.level || 1);
            const force = isPull ? dir.multiplyScalar(-forceAmt) : dir.multiplyScalar(forceAmt);
            targetInstance.applyForce(force);
        }
        return { type: 'gravity', targetId: target.id, mode: isPull ? 'pull' : 'push' };
    },

    blue: (npc, target, npcInstance, targetInstance) => {
        const dist = npcInstance.position.distanceTo(target.position || new THREE.Vector3());
        // Level Scaling: Higher freeze chance
        const chance = 0.4 + (npc.level || 1) * 0.05;
        if (dist < 8 && Math.random() < chance) {
            const targetNpc = state.npcs.find(n => n.id === target.id);
            if (targetNpc) {
                if (!targetNpc.statusEffects) targetNpc.statusEffects = [];
                if (!targetNpc.statusEffects.includes('freeze')) {
                    targetNpc.statusEffects.push('freeze');
                    // Freeze lasts for 3 seconds
                    setTimeout(() => {
                        const idx = targetNpc.statusEffects.indexOf('freeze');
                        if (idx > -1) targetNpc.statusEffects.splice(idx, 1);
                        updateState({ npcs: [...state.npcs] });
                    }, 3000);
                }
                updateState({ npcs: [...state.npcs] });
                return { type: 'freeze', targetId: target.id };
            }
        }
    }
};
