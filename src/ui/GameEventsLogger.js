/**
 * GameEventsLogger - Manages game event logging with color-coded messages
 */
export class GameEventsLogger {
    constructor() {
        this.maxEvents = 50; // Maximum number of events to keep
        this.events = [];
        this.container = null;

        console.log('[GameEventsLogger] Initialized');
    }

    /**
     * Initialize the logger (call after DOM is ready)
     */
    init() {
        this.container = document.getElementById('game-events-content');
        if (!this.container) {
            console.error('[GameEventsLogger] Container not found');
            return;
        }
        console.log('[GameEventsLogger] Container found and ready');
    }

    /**
     * Get current timestamp in HH:MM:SS format
     */
    getTimestamp() {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        return `${h}:${m}:${s}`;
    }

    /**
     * Log a death event
     * @param {string} npcName - Name of the NPC that died
     * @param {string} killerName - Name of the killer (optional)
     */
    logDeath(npcName, killerName = null) {
        const message = killerName
            ? `💀 ${npcName} foi eliminado por ${killerName}`
            : `💀 ${npcName} morreu`;
        this.addEvent(message, 'death');
    }

    /**
     * Log a spawn/birth event
     * @param {string} npcName - Name of the spawned NPC
     * @param {string} faction - Faction of the NPC
     */
    logSpawn(npcName, faction) {
        const message = `🌟 ${npcName} (${faction}) entrou no jogo`;
        this.addEvent(message, 'spawn');
    }

    /**
     * Log a level up event
     * @param {string} npcName - Name of the NPC
     * @param {number} newLevel - New level reached
     */
    logLevelUp(npcName, newLevel) {
        const message = `⬆️ ${npcName} alcançou nível ${newLevel}!`;
        this.addEvent(message, 'levelup');
    }

    /**
     * Log an item/loot event
     * @param {string} npcName - Name of the NPC
     * @param {string} itemName - Name of the item
     */
    logItem(npcName, itemName) {
        const message = `✨ ${npcName} obteve ${itemName}`;
        this.addEvent(message, 'item');
    }

    /**
     * Log a combat event
     * @param {string} attackerName - Name of attacker
     * @param {string} targetName - Name of target
     * @param {number} damage - Damage dealt
     */
    logCombat(attackerName, targetName, damage) {
        const message = `⚔️ ${attackerName} causou ${damage} de dano em ${targetName}`;
        this.addEvent(message, 'combat');
    }

    /**
     * Log a general info event
     * @param {string} message - Info message
     */
    logInfo(message) {
        this.addEvent(`ℹ️ ${message}`, 'info');
    }

    /**
     * Add an event to the log
     * @param {string} message - Event message
     * @param {string} type - Event type (death, spawn, levelup, item, combat, info)
     */
    addEvent(message, type) {
        if (!this.container) {
            console.warn('[GameEventsLogger] Container not initialized');
            return;
        }

        const timestamp = this.getTimestamp();
        const event = { timestamp, message, type };

        // Add to events array
        this.events.unshift(event); // Add to beginning

        // Keep only max events
        if (this.events.length > this.maxEvents) {
            this.events.pop();
        }

        // Render the event
        this.renderEvent(event);

        console.log(`[GameEventsLogger] ${type.toUpperCase()}: ${message}`);
    }

    /**
     * Render a single event to the DOM
     * @param {Object} event - Event object
     */
    renderEvent(event) {
        const eventDiv = document.createElement('div');
        eventDiv.className = `event-log-entry event-${event.type}`;
        eventDiv.innerHTML = `
            <span class="event-timestamp">${event.timestamp}</span>
            <span>${event.message}</span>
        `;

        // Insert at the beginning
        this.container.insertBefore(eventDiv, this.container.firstChild);

        // Remove old events from DOM if too many
        while (this.container.children.length > this.maxEvents) {
            this.container.removeChild(this.container.lastChild);
        }
    }

    /**
     * Clear all events
     */
    clear() {
        this.events = [];
        if (this.container) {
            this.container.innerHTML = '';
        }
        console.log('[GameEventsLogger] Events cleared');
    }
}
