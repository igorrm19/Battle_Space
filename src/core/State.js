import * as THREE from 'three';
export const state = {
    hp: 3000, maxHp: 3000,
    mp: 1000, maxMp: 1000,
    xp: 0, maxXp: 1000,
    lvl: 1,
    gold: 0,
    inventory: [],
    equipped: null,
    // New Stats
    def: 10, eva: 0.05, mRegen: 5,
    stamina: 100, maxStamina: 100, sRegen: 10,
    monsterHp: 1000, maxMonsterHp: 1000,
    monsterDef: 5, monsterEva: 0.02,
    // NPC System
    npcs: [], // Array of { id, faction, class, hp, maxHp, level, stats, statusEffects }
    bosses: {
        void: { name: "Entidade do Vazio", hp: 5000, maxHp: 5000, level: 20, alive: true, stats: { def: 50, eva: 0.1 } },
        gold: { name: "Deusa do Ouro", hp: 8000, maxHp: 8000, level: 20, alive: true, stats: { def: 80, eva: 0.15 } }
    },
    lore: [], // Discovered lore fragments
    npcSavedCount: 0, npcLostCount: 0,
    monsterTarget: 'player',
    playerPos: new THREE.Vector3(0, 0, 10),
    monsterPos: new THREE.Vector3(0, 5, 0),
    goldBossPos: new THREE.Vector3(12, 5, -5),
    npcPos: null,
    inBattle: false
};

export function updateState(newState) {
    Object.assign(state, newState);
    window.dispatchEvent(new CustomEvent('stateUpdate', { detail: state }));
}

export function resetMonster() {
    const monsterHp = 1000 + (state.lvl * 100);
    updateState({ monsterHp, maxMonsterHp: monsterHp });
}
