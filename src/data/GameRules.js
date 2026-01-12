/**
 * Game rules and balance configurations
 */
export const GAME_RULES = {
    // Combat thresholds
    CRITICAL_HP_THRESHOLD: 0.3,      // HP percentage considered critical
    HEAL_THRESHOLD: 0.8,              // HP percentage to trigger healing
    FLEE_DISTANCE: 8.0,               // Distance to flee from enemies
    FOLLOW_DISTANCE: 5.0,             // Distance to maintain when following
    ARRIVAL_DISTANCE: 5.0,            // Distance considered "arrived"
    
    // Learning system
    LEARNING_INTERVAL: 10.0,          // Seconds between learning events
    LEARNING_INT_BONUS: 1,            // Intelligence gained per learning
    LEARNING_EVA_BONUS: 0.005,        // Evasion gained per learning
    MAX_EVASION: 0.5,                 // Maximum evasion cap
    
    // Level and growth
    MAX_NPC_LEVEL: 1000,              // Maximum level for NPCs (increased for yellow)
    MAX_SCALE_MULTIPLIER: 3.0,        // Maximum size scaling
    SCALE_PER_LEVEL: 0.05,            // Size increase per level
    
    // Yellow NPC (Lightning) specific
    YELLOW_BASE_SPEED: 0.15,          // Base speed (much faster)
    YELLOW_BASE_FOV: 4.0,             // Base field of view (reduced)
    YELLOW_CHARGE_FOV: 15.0,          // FOV while charging energy
    YELLOW_BASE_ENERGY: 200,          // Base max energy (higher than others)
    YELLOW_ENERGY_PER_LEVEL: 5,       // Energy increase per level
    YELLOW_ENERGY_DRAIN: 15,          // Energy drain per second (higher)
    YELLOW_ENERGY_RECHARGE_SPEED: 8,  // Energy recharge when at high speed
    YELLOW_SPEED_THRESHOLD: 0.12,     // Speed threshold for energy recharge
    YELLOW_MOMENTUM_GAIN: 0.003,      // Momentum gain per distance traveled
    YELLOW_MOMENTUM_DECAY: 0.95,      // Momentum decay per frame
    YELLOW_MOMENTUM_MAX: 3.0,         // Maximum momentum multiplier
    YELLOW_CHARGE_COST_SINGLE: 50,    // Energy cost for single lightning
    YELLOW_CHARGE_COST_MULTI: 80,     // Energy cost for multi lightning
    
    // Spawn rules
    MAX_NPCS: 16,                     // Maximum NPCs in battle
    RESPAWN_ENABLED: true,            // Whether respawn is enabled
    
    // Physics boundaries
    WORLD_BOUNDARY: 45,               // World boundary distance
    CAMERA_BOUNDS: {
        x: { min: -100, max: 100 },
        y: { min: 5, max: 50 },
        z: { min: -100, max: 100 }
    },
    
    // Combat timing
    NPC_ATTACK_COOLDOWN_MIN: 2.0,    // Minimum seconds between NPC attacks
    NPC_ATTACK_COOLDOWN_MAX: 4.0,    // Maximum seconds between NPC attacks
    
    // Status effects
    FREEZE_DURATION: 3000,            // Freeze duration in milliseconds
    
    // Boss specific
    BOSS_AVOIDANCE_RADIUS: 3.0,      // Extra avoidance radius for bosses
    
    // Visual thresholds
    LOW_HP_THRESHOLD: 0.25,           // HP percentage for low HP visuals
    SMOKE_BURST_CHANCE: 0.8           // Chance for smoke burst at low HP
};
