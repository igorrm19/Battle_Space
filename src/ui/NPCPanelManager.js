/**
 * NPCPanelManager - Manages automatic NPC info panel rotation
 * Displays a random NPC every 30 seconds
 */
export class NPCPanelManager {
    constructor(hud, npcManager) {
        this.hud = hud;
        this.npcManager = npcManager;
        this.rotationInterval = 30000; // 30 seconds
        this.timer = 0;
        this.currentNPC = null;
        this.isActive = true;

        console.log('[NPCPanelManager] Initialized');
    }

    /**
     * Update the panel rotation timer
     * @param {number} delta - Time since last frame in seconds
     */
    update(delta) {
        if (!this.isActive) return;

        this.timer += delta * 1000; // Convert to milliseconds

        if (this.timer >= this.rotationInterval) {
            this.timer = 0;
            this.showRandomNPC();
        }
    }

    /**
     * Display a random NPC's info panel
     */
    showRandomNPC() {
        const npcs = this.npcManager.npcs.filter(npc => npc.hp > 0);

        if (npcs.length === 0) {
            console.log('[NPCPanelManager] No alive NPCs to display');
            return;
        }

        // Select a random NPC
        const randomIndex = Math.floor(Math.random() * npcs.length);
        const selectedNPC = npcs[randomIndex];

        console.log('[NPCPanelManager] Showing random NPC:', selectedNPC.id);

        this.currentNPC = selectedNPC;
        this.hud.showNPCInfo(selectedNPC);
    }

    /**
     * Start automatic rotation
     */
    start() {
        this.isActive = true;
        this.timer = 0;
        this.showRandomNPC(); // Show immediately
        console.log('[NPCPanelManager] Started automatic rotation');
    }

    /**
     * Stop automatic rotation
     */
    stop() {
        this.isActive = false;
        console.log('[NPCPanelManager] Stopped automatic rotation');
    }

    /**
     * Manually show a specific NPC
     * @param {Object} npc - The NPC to display
     */
    showNPC(npc) {
        this.currentNPC = npc;
        this.hud.showNPCInfo(npc);
        this.timer = 0; // Reset timer
    }

    /**
     * Show next random NPC (for manual navigation)
     */
    nextNPC() {
        this.showRandomNPC();
        console.log('[NPCPanelManager] Manual next NPC triggered');
    }
}
