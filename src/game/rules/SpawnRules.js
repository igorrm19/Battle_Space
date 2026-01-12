/**
 * Spawn rules and level distribution
 */
export const SpawnRules = {
    /**
     * Generate weighted level distribution
     * Level 1 is most common, Level 20 is 1%
     * @returns {number} Level between 1 and 20
     */
    generateWeightedLevel() {
        const r = Math.random();
        if (r < 0.01) return 20; // 1% chance for level 20
        if (r < 0.05) return Math.floor(Math.random() * 5) + 15; // 4% chance for 15-19
        if (r < 0.2) return Math.floor(Math.random() * 5) + 10; // 15% chance for 10-14
        if (r < 0.5) return Math.floor(Math.random() * 5) + 5; // 30% chance for 5-9
        return Math.floor(Math.random() * 4) + 1; // 50% chance for 1-4
    },

    /**
     * Get initial NPC configurations
     * @returns {Array} Array of NPC config objects
     */
    getInitialNPCConfigs() {
        return [
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
    },

    /**
     * Generate random NPC config for respawn
     * @returns {Object} NPC config
     */
    generateRandomNPCConfig() {
        const factions = ['player', 'void', 'gold'];
        const classes = ['green', 'yellow', 'red', 'purple', 'brown', 'pink', 'darkgreen', 'blue'];
        const faction = factions[Math.floor(Math.random() * factions.length)];
        const cls = classes[Math.floor(Math.random() * classes.length)];
        const id = `${cls}_${Math.random().toString(36).substr(2, 5)}`;
        const level = this.generateWeightedLevel();
        
        return {
            id,
            faction,
            class: cls,
            index: Math.floor(Math.random() * 10),
            level
        };
    }
};
