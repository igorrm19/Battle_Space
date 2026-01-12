export const CONSTANTS = {
    NPC_COLORS: {
        green: 0x00ff00,
        yellow: 0xffff00,
        red: 0xff0000,
        purple: 0x8800ff,
        brown: 0x8b4513,
        pink: 0xff00ff,
        blue: 0x00ffff,
        darkgreen: 0x003300
    },
    FACTION_COLORS: {
        player: 0x00ffff,
        void: 0xff4500,
        gold: 0xffd700
    },
    NPC_BASE_STATS: {
        atk: 30,
        def: 10,
        eva: 0.1
    },
    BOSS_STATS: {
        void: { hp: 50000, atk: 200 },
        gold: { hp: 40000, atk: 150 }
    },
    // Performance limits for VFX
    VFX: {
        MAX_LIGHTNING_BOLTS: 6,        // Reduced from 8 for performance
        MAX_LIGHTNING_PARTICLES: 12,    // Reduced from 15
        MAX_FIRE_PARTICLES: 40,         // Reduced from 50
        MAX_FIRE_SMOKE: 25,             // Reduced from 30
        MAX_GRAVITY_PARTICLES: 30,      // Reduced from 40
        MAX_VOID_PARTICLES: 15,         // Reduced from 20
        MAX_ICE_SHARDS: 16,             // Reduced from 20
        MAX_ICE_PARTICLES: 12,          // Reduced from 15
        MAX_HEAL_PARTICLES: 25,         // Reduced from 30
        MAX_TELEPORT_PARTICLES: 30,     // Reduced from 40
        MAX_SIMULTANEOUS_EFFECTS: 10,   // Max effects running at once
        EFFECT_CULL_DISTANCE: 50,       // Don't render effects beyond this distance

        // VFX intensity controls (1.0 default). Set REDUCED_SHAKE=true to significantly dampen motion.
        INTENSITY_MULTIPLIER: 1.0,
        REDUCED_SHAKE: true
    }
};
