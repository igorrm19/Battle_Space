import * as THREE from 'three';
import { state, updateState } from '../core/State.js';

export function playerAttack() {
    // Evasion Check
    if (Math.random() < state.monsterEva) {
        return { dmg: 0, isCrit: false, type: 'miss' };
    }

    const baseDmg = 50 + (state.lvl * 10);
    const isCrit = Math.random() > 0.8;
    let dmg = isCrit ? baseDmg * 2 : baseDmg;

    // Defense Reduction
    dmg = Math.max(1, dmg - state.monsterDef);

    dealDamageToMonster(dmg, isCrit);
    return { dmg, isCrit, type: 'attack' };
}

export function skillAttack() {
    const cost = 200;
    if (state.mp >= cost) {
        const dmg = cost * 5; // Skills are powerful
        updateState({ mp: state.mp - cost });
        dealDamageToMonster(dmg, true);
        return { dmg, name: 'Explosão do Vazio', type: 'skill' };
    }
    return null;
}

function dealDamageToMonster(dmg, isCrit) {
    const newMonsterHp = Math.max(0, state.monsterHp - dmg);

    if (newMonsterHp <= 0) {
        const goldReward = 100 + (state.lvl * 20);
        const xpReward = 500;

        let newXp = state.xp + xpReward;
        let newLvl = state.lvl;
        let newMaxHp = state.maxHp;
        let newHp = state.hp;

        if (newXp >= state.maxXp) {
            newXp -= state.maxXp;
            newLvl++;
            newMaxHp += 500;
            newHp = newMaxHp;
        }

        updateState({
            monsterHp: 0,
            gold: state.gold + goldReward,
            xp: newXp,
            lvl: newLvl,
            maxHp: newMaxHp,
            hp: newHp,
            inBattle: false
        });
    } else {
        updateState({ monsterHp: newMonsterHp });
    }
}

export function monsterAttack(type = 'normal', targetId = 'player', npcInstances = []) {
    if (!state.inBattle) return null;

    let targetObj = null;
    if (targetId === 'player') {
        targetObj = state;
    } else if (targetId === 'void_boss') {
        targetObj = { hp: state.monsterHp, stats: { def: state.monsterDef, eva: state.monsterEva } };
    } else if (targetId === 'gold_boss') {
        targetObj = state.bosses.gold;
    } else {
        targetObj = state.npcs.find(n => n.id === targetId);
    }

    if (!targetObj || targetObj.hp <= 0) return null;

    // Evasion Check
    const eva = targetId === 'player' ? state.eva : (targetObj.stats?.eva || 0);
    if (Math.random() < eva) {
        return { dmg: 0, type: 'miss', targetId };
    }

    let baseDmg = 100 + (state.lvl * 20);
    let multiplier = 1;
    if (type === 'heavy') multiplier = 2;
    if (type === 'quick') multiplier = 0.6;
    if (type === 'drain') multiplier = 0.8;

    const isCrit = Math.random() > 0.8 || type === 'heavy';
    let dmg = baseDmg * multiplier;
    if (isCrit && type !== 'heavy') dmg *= 2;

    let finalDmgDealt = 0;
    if (targetId === 'player') {
        finalDmgDealt = Math.max(1, dmg - state.def);
        updateState({ hp: Math.max(0, state.hp - finalDmgDealt) });
        if (type === 'drain') updateState({ mp: Math.max(0, state.mp - 100) });
    } else {
        // Use dealDamage for all other targets (bosses, NPCs)
        finalDmgDealt = dealDamage(targetId, dmg, isCrit, npcInstances);
    }

    // Determine if target is defeated after damage is dealt
    let isDefeated = false;
    if (targetId === 'player') {
        isDefeated = state.hp <= 0;
    } else if (targetId === 'void_boss') {
        isDefeated = state.monsterHp <= 0;
    } else if (targetId === 'gold_boss') {
        isDefeated = state.bosses.gold.hp <= 0;
    } else {
        const updatedNpc = state.npcs.find(n => n.id === targetId);
        isDefeated = updatedNpc ? updatedNpc.hp <= 0 : false;
    }

    return { dmg: finalDmgDealt, isCrit, type, targetId, defeated: isDefeated };
}

export function regenerateMana(delta) {
    if (state.mp < state.maxMp) {
        updateState({ mp: Math.min(state.maxMp, state.mp + state.mRegen * delta) });
    }

    // Process DOTs (Burn)
    state.npcs.forEach(npc => {
        if (npc.statusEffects?.includes('burn') && npc.hp > 0) {
            npc.hp = Math.max(0, npc.hp - (10 * delta));
        }
    });
    updateState({ npcs: [...state.npcs] });
}

// --- Unified Damage Logic ---
export function dealDamage(targetId, dmg, isCrit, npcInstances = []) {
    if (targetId === 'player') {
        const finalDmg = Math.max(1, dmg - state.def);
        updateState({ hp: Math.max(0, state.hp - finalDmg) });
        return finalDmg;
    }
    if (targetId === 'void_boss') {
        const finalDmg = Math.max(1, dmg - state.monsterDef);
        updateState({ monsterHp: Math.max(0, state.monsterHp - finalDmg) });
        return finalDmg;
    }
    if (targetId === 'gold_boss') {
        const finalDmg = Math.max(1, dmg - state.bosses.gold.stats.def);
        state.bosses.gold.hp = Math.max(0, state.bosses.gold.hp - finalDmg);
        updateState({ bosses: { ...state.bosses } });
        return finalDmg;
    }

    // NPC Target
    const targetNpc = state.npcs.find(n => n.id === targetId);
    const targetInst = npcInstances.find(n => n.id === targetId);
    if (targetNpc) {
        const finalDmg = Math.max(1, dmg - (targetNpc.stats?.def || 0));
        targetNpc.hp = Math.max(0, targetNpc.hp - finalDmg);
        if (targetInst) targetInst.hp = targetNpc.hp;
        updateState({ npcs: [...state.npcs] });
        return finalDmg;
    }
    return 0;
}

// --- NPC Ability Registry ---
const NPC_ABILITIES = {
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
                const targetInst = npcInstance.scene.children.find(c => c.id === allyToHeal.id); // This is not reliable, better pass instances
                if (targetNpc) {
                    targetNpc.hp = Math.min(targetNpc.maxHp, targetNpc.hp + healAmt);
                    // We need a better way to find the instance. For now, let's assume Combat.js doesn't need to update instances directly if NPCManager does it.
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
            dealDamage(target.id, dmg, true, npcInstance.scene.children); // Need access to instances
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
        // Chain Lightning (Stun)
        const dist = npcInstance.position.distanceTo(target.position || new THREE.Vector3());
        if (dist < 12) {
            const dmg = (npc.stats?.atk || 30) * 0.8; // Lower base dmg but chains
            // Apply Stun
            const targetNpc = state.npcs.find(n => n.id === target.id);
            if (targetNpc && Math.random() > 0.7) {
                if (!targetNpc.statusEffects) targetNpc.statusEffects = [];
                if (!targetNpc.statusEffects.includes('stun')) targetNpc.statusEffects.push('stun');
            }
            return { type: 'lightning', targetId: target.id, dmg };
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

export function npcAttack(npcId, npcInstances) {
    const npc = state.npcs.find(n => n.id === npcId);
    if (!npc || npc.hp <= 0 || npc.statusEffects?.includes('stun') || npc.statusEffects?.includes('freeze')) return null;

    const npcInstance = npcInstances.find(n => n.id === npcId);
    if (!npcInstance) return null;

    // Targeting Logic
    let enemies = [];
    if (npc.faction !== 'player') enemies.push({ id: 'player', hp: state.hp, faction: 'player', position: state.playerPos });
    if (npc.faction !== 'void') enemies.push({ id: 'void_boss', hp: state.monsterHp, faction: 'void', position: state.monsterPos });
    if (npc.faction !== 'gold') enemies.push({ id: 'gold_boss', hp: state.bosses.gold.hp, faction: 'gold', position: state.goldBossPos });

    state.npcs.forEach(n => {
        if (n.faction !== npc.faction && n.hp > 0) {
            const nInst = npcInstances.find(inst => inst.id === n.id);
            if (nInst) enemies.push({ ...n, position: nInst.position });
        }
    });

    // --- Target Selection with Strategy ---
    const isPurple = npc.class === 'purple';
    const isPink = npc.class === 'pink';
    const fov = isPurple ? 1000 : (5 + (npc.level || 1) * 0.5); // Purple has global vision (large FOV)

    // For Pink, we need to consider allies for healing, so we'll build a combined list of potential targets.
    let targets = [...enemies]; // Start with enemies

    if (isPink) {
        // Add allies for Pink's tactician logic (healing)
        const allies = state.npcs.filter(n => n.faction === npc.faction && n.hp > 0 && n.id !== npc.id);
        allies.forEach(n => {
            const nInst = npcInstances.find(inst => inst.id === n.id);
            if (nInst) targets.push({ ...n, position: nInst.position });
        });
        // Also consider player as an ally for Pink
        if (npc.faction === 'player') {
            targets.push({ id: 'player', hp: state.hp, maxHp: state.maxHp, faction: 'player', position: state.playerPos });
        }
    }

    let potentialTargets = targets.filter(t => {
        if (t.id === npc.id || t.hp <= 0) return false; // Cannot target self or dead entities
        const dist = npcInstance.position.distanceTo(t.position || new THREE.Vector3());
        return dist < fov;
    });

    if (potentialTargets.length === 0) return null;

    let target;
    if (isPink) {
        // Tactician: Calculate a priority score for all potential targets
        potentialTargets.forEach(t => {
            let score = 0;
            const isAlly = t.faction === npc.faction;
            const hpPercent = t.hp / t.maxHp;
            const dist = npcInstance.position.distanceTo(t.position || new THREE.Vector3());

            if (isAlly) {
                // Priority to healing weak allies
                if (hpPercent < 0.5) score += 100 * (1 - hpPercent);
                else if (hpPercent < 0.8) score += 50 * (1 - hpPercent);
            } else {
                // Priority to dangerous enemies or finishing off weak ones
                score += (t.level || 1) * 10; // Dangerous enemies
                if (hpPercent < 0.3) score += 80; // Finishing blow
                score -= dist * 2; // Prefer closer targets
            }
            t.aiScore = score;
        });
        target = potentialTargets.sort((a, b) => b.aiScore - a.aiScore)[0];

        // --- Advanced AI: Tactician Coordination ---
        if (target && !target.faction === npc.faction) {
            // "Ping" the target for nearby allies
            state.npcs.forEach(n => {
                if (n.faction === npc.faction && n.id !== npc.id) {
                    const nInst = npcInstances.find(inst => inst.id === n.id);
                    if (nInst && nInst.position.distanceTo(npcInstance.position) < 15) {
                        n.coordinatedTargetId = target.id;
                    }
                }
            });
        }
    } else if (npc.coordinatedTargetId) {
        // Follow coordination if target is still valid
        const coordTarget = potentialTargets.find(t => t.id === npc.coordinatedTargetId);
        if (coordTarget) {
            target = coordTarget;
            // Clear coordination after some time or if target is dead
            if (Math.random() > 0.9) npc.coordinatedTargetId = null;
        } else {
            npc.coordinatedTargetId = null;
        }
    }

    if (!target) {
        if (npc.strategy === 'aggressive') {
            // Aggressive: Target strongest enemies (highest level)
            potentialTargets.sort((a, b) => (b.level || 1) - (a.level || 1));
            target = potentialTargets[0];
        } else if (npc.strategy === 'farmer') {
            // Farmer: Target weakest enemies (lowest HP percentage) to level up
            potentialTargets.sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));
            target = potentialTargets[0];
        } else {
            // Default: Target the weakest enemy (lowest HP)
            potentialTargets.sort((a, b) => a.hp - b.hp);
            target = potentialTargets[0];
        }
    }

    if (!target) return null;

    const targetInstance = npcInstances.find(n => n.id === target.id);
    if (!targetInstance) return null;

    // --- Advanced AI: Target Prediction ---
    let predictedPos = target.position.clone();
    if (targetInstance && targetInstance.velocity) {
        const dist = npcInstance.position.distanceTo(target.position);
        const timeToReach = dist / 5; // Approximate projectile/lunge speed
        predictedPos.add(targetInstance.velocity.clone().multiplyScalar(timeToReach * 60)); // 60fps factor
    }

    // --- Advanced AI: Flanking ---
    if (npc.strategy === 'aggressive' && Math.random() > 0.5) {
        const dir = predictedPos.clone().sub(npcInstance.position).normalize();
        const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(5); // Perpendicular vector
        predictedPos.add(side);
    }

    // Execute Ability from Registry
    const abilityResult = NPC_ABILITIES[npc.class]?.(npc, target, npcInstance, targetInstance);
    if (abilityResult) return abilityResult;

    // Default Attack
    const baseAtk = npc.stats?.atk || (30 + state.lvl * 5);
    const isCrit = Math.random() > 0.9;
    const dmg = isCrit ? baseAtk * 2 : baseAtk;

    const finalDmg = dealDamage(target.id, dmg, isCrit, npcInstances);

    // XP Gain and Level Up
    if (npcInstance.gainXp) {
        npcInstance.gainXp(finalDmg * 0.2); // Gain XP based on damage
        if (target.hp <= 0) {
            npcInstance.gainXp(100 * (target.level || 1)); // Bonus XP for kill

            // Heal on Kill (Vampirism)
            const healAmount = npc.maxHp * 0.3;
            npc.hp = Math.min(npc.maxHp, npc.hp + healAmount);

            // Visual Heal Effect
            if (npcInstance.createAuraBurst) npcInstance.createAuraBurst(0x00ff00);
        }
    }

    // Visual feedback with predicted position
    if (npcInstance.performAttack) npcInstance.performAttack(predictedPos);

    // Status Effects
    const statusMap = { yellow: 'lightning', red: 'fire', purple: 'mage', blue: 'freeze' };
    const statusApplied = statusMap[npc.class];
    if (statusApplied && !['player', 'void_boss', 'gold_boss'].includes(target.id)) {
        const targetNpc = state.npcs.find(n => n.id === target.id);
        if (targetNpc) {
            if (!targetNpc.statusEffects) targetNpc.statusEffects = [];
            if (!targetNpc.statusEffects.includes(statusApplied)) targetNpc.statusEffects.push(statusApplied);
        }
    }

    return { dmg: finalDmg, isCrit, type: 'attack', targetId: target.id, statusApplied };
}
