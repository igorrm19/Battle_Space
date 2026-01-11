import { state } from '../core/State.js';

export class HUD {
    constructor(container) {
        this.container = container;
        this.init();
        window.addEventListener('stateUpdate', () => this.update());

        // Game Log Listener
        window.addEventListener('game-log', (e) => {
            this.addLogMessage(e.detail.message, e.detail.type);
        });
    }

    init() {
        this.container.insertAdjacentHTML('beforeend', `
            <div id="hud-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10; font-family: 'Cinzel', serif;">
                <svg id="hud-svg" viewBox="0 0 1920 1080" style="width: 100%; height: 100%;">
                    <defs>
                        <linearGradient id="hp-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" style="stop-color:#ff0000;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#880000;stop-opacity:1" />
                        </linearGradient>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                            <feMerge>
                                <feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/>
                            </feMerge>
                        </filter>
                    </defs>

                    <!-- HP Bar with Ornament (Hidden for Spectator) -->
                    <g transform="translate(50, 50)" style="display: none;">
                        <rect x="0" y="0" width="400" height="30" fill="rgba(0,0,0,0.5)" stroke="#444" stroke-width="2"/>
                        <rect id="hp-bar" x="0" y="0" width="400" height="30" fill="url(#hp-grad)" class="hud-bar" filter="url(#glow)"/>
                        <path d="M-10,-10 L10,-10 L0,0 Z" fill="#ffaa00" transform="translate(0, 15) rotate(-90)"/>
                        <text x="200" y="22" fill="white" font-size="20" text-anchor="middle" id="hp-text">HP: 1000/1000</text>
                    </g>

                    <!-- MP Bar (Hidden) -->
                    <g transform="translate(50, 100)" style="display: none;">
                        <rect x="0" y="0" width="300" height="20" fill="rgba(0,0,0,0.5)" stroke="#444" stroke-width="2"/>
                        <rect id="mp-bar" x="0" y="0" width="300" height="20" fill="#00aaff" class="hud-bar"/>
                        <text x="150" y="15" fill="white" font-size="14" text-anchor="middle" id="mp-text">MP: 500/500</text>
                    </g>

                    <!-- XP Bar & Level (Hidden) -->
                    <g transform="translate(50, 140)" style="display: none;">
                        <text x="0" y="-5" fill="#00ff00" font-size="16" id="lvl-text">LVL 1</text>
                        <rect x="0" y="0" width="200" height="8" fill="rgba(0,0,0,0.5)" stroke="#222" stroke-width="1"/>
                        <rect id="xp-bar" x="0" y="0" width="200" height="8" fill="#00ff00" class="hud-bar"/>
                    </g>

                    <!-- Stamina Bar (Hidden) -->
                    <g transform="translate(50, 160)" style="display: none;">
                        <rect x="0" y="0" width="150" height="6" fill="rgba(0,0,0,0.5)" stroke="#444" stroke-width="1"/>
                        <rect id="stamina-bar" x="0" y="0" width="150" height="6" fill="#ffaa00" class="hud-bar"/>
                    </g>

                    <!-- Stats (DEF/EVA) (Hidden) -->
                    <g transform="translate(50, 180)" style="display: none;">
                        <text x="0" y="0" fill="#aaa" font-size="14" id="def-text">DEF: 10</text>
                        <text x="100" y="0" fill="#aaa" font-size="14" id="eva-text">EVA: 5%</text>
                    </g>

                    <!-- Combo Counter -->
                    <g id="combo-group" transform="translate(1700, 200)" style="opacity: 0; transition: opacity 0.3s;">
                        <text x="0" y="0" fill="#ffaa00" font-size="120" text-anchor="end" id="combo-text" filter="url(#glow)">0</text>
                        <text x="0" y="40" fill="#ffffff" font-size="30" text-anchor="end">COMBO</text>
                    </g>

                    <!-- Monster HP Bar (Top Center) -->
                    <g transform="translate(760, 50)">
                        <rect x="0" y="0" width="400" height="15" fill="rgba(0,0,0,0.5)" stroke="#ff4500" stroke-width="1"/>
                        <rect id="monster-hp-bar" x="0" y="0" width="400" height="15" fill="#ff4500" class="hud-bar"/>
                        <text x="200" y="-10" fill="#ff4500" font-size="18" text-anchor="middle">ENTIDADE DO VAZIO</text>
                    </g>

                    <!-- Gold Goddess HP Bar (Top Right) -->
                    <g id="gold-boss-hud" transform="translate(1400, 50)" style="display: none; cursor: pointer; pointer-events: all;" onclick="window.focusTarget('gold_boss')">
                        <rect x="0" y="0" width="400" height="15" fill="rgba(0,0,0,0.5)" stroke="#ffd700" stroke-width="1"/>
                        <rect id="gold-boss-hp-bar" x="0" y="0" width="400" height="15" fill="#ffd700" class="hud-bar"/>
                        <text x="200" y="-10" fill="#ffd700" font-size="18" text-anchor="middle">DEUSA DO OURO</text>
                    </g>

                    <!-- NPC HP Bars (Bottom Area) -->
                    <g id="npc-hud-container" transform="translate(50, 800)">
                        <!-- Dynamically populated -->
                    </g>

                    <!-- Lore Log (Bottom Right) -->
                    <g id="lore-log" transform="translate(1500, 800)">
                        <text x="0" y="-10" fill="#00ffff" font-size="20" font-weight="bold">FRAGMENTOS DE LORE</text>
                        <g id="lore-list">
                            <!-- Dynamically populated -->
                        </g>
                    </g>

                    <!-- Notifications -->
                    <g id="notification-group" transform="translate(960, 300)" style="opacity: 0; pointer-events: none;">
                        <text x="0" y="0" fill="#ffffff" font-size="60" text-anchor="middle" id="notification-text" filter="url(#glow)"></text>
                    </g>

                    <!-- Game Over Overlay -->
                    <g id="game-over-overlay" style="display: none;">
                        <rect x="0" y="0" width="1920" height="1080" fill="rgba(0,0,0,0.8)"/>
                        <text x="960" y="450" fill="#ff0000" font-size="120" text-anchor="middle" filter="url(#glow)" style="font-weight: bold;">VOCÊ FOI CONSUMIDO</text>
                        <text x="960" y="550" fill="#ffffff" font-size="40" text-anchor="middle">A escuridão tomou sua alma...</text>
                        <g id="retry-btn" transform="translate(860, 650)" style="cursor: pointer; pointer-events: all;" onclick="window.retryGame()">
                            <rect x="0" y="0" width="200" height="60" fill="#440000" stroke="#ff0000" stroke-width="2"/>
                            <text x="100" y="40" fill="#ffffff" font-size="24" text-anchor="middle">TENTAR NOVAMENTE</text>
                        </g>
                    </g>
                </svg>
            </div>
            <style>
                .hud-bar { transition: width 0.3s ease-out; }
                @keyframes barPulse {
                    0% { filter: brightness(1); }
                    50% { filter: brightness(1.5); }
                    100% { filter: brightness(1); }
                }
                .bar-low { animation: barPulse 0.5s infinite; }
                #combo-text { transition: transform 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
            </style>
        `);
    }

    update() {
        const hpBar = document.getElementById('hp-bar');
        const mpBar = document.getElementById('mp-bar');
        const xpBar = document.getElementById('xp-bar');
        const monsterHpBar = document.getElementById('monster-hp-bar');

        if (hpBar) hpBar.setAttribute('width', (state.hp / state.maxHp) * 400);
        if (mpBar) mpBar.setAttribute('width', (state.mp / state.maxMp) * 300);
        if (xpBar) xpBar.setAttribute('width', (state.xp / state.maxXp) * 200);
        if (monsterHpBar) monsterHpBar.setAttribute('width', (state.monsterHp / state.maxMonsterHp) * 400);

        const staminaBar = document.getElementById('stamina-bar');
        if (staminaBar) staminaBar.setAttribute('width', (state.stamina / state.maxStamina) * 150);

        document.getElementById('hp-text').textContent = `HP: ${Math.ceil(state.hp)}/${state.maxHp}`;
        document.getElementById('mp-text').textContent = `MP: ${Math.ceil(state.mp)}/${state.maxMp}`;
        document.getElementById('lvl-text').textContent = `LVL ${state.lvl}`;

        const defText = document.getElementById('def-text');
        const evaText = document.getElementById('eva-text');
        if (monsterHpBar) monsterHpBar.setAttribute('width', (state.monsterHp / state.maxMonsterHp) * 400);

        const goldBossHud = document.getElementById('gold-boss-hud');
        const goldBossHpBar = document.getElementById('gold-boss-hp-bar');
        if (goldBossHud) goldBossHud.style.display = (state.inBattle && state.bosses.gold.hp > 0) ? 'block' : 'none';
        if (goldBossHpBar) goldBossHpBar.setAttribute('width', (state.bosses.gold.hp / state.bosses.gold.maxHp) * 400);

        this.updateNpcHud();

        if (defText) defText.textContent = `DEF: ${state.def}`;
        if (evaText) evaText.textContent = `EVA: ${Math.round(state.eva * 100)}%`;

        const gameOver = document.getElementById('game-over-overlay');
        if (gameOver) {
            gameOver.style.display = state.hp <= 0 ? 'block' : 'none';
        }

        this.updateLoreLog();
    }

    updateLoreLog() {
        const list = document.getElementById('lore-list');
        if (!list) return;

        list.innerHTML = state.lore.map((text, i) => {
            return `<text x="0" y="${i * 25}" fill="#aaa" font-size="14">- ${text}</text>`;
        }).join('');
    }

    updateCombo(count) {
        const group = document.getElementById('combo-group');
        const text = document.getElementById('combo-text');
        if (!group || !text) return;

        if (count > 1) {
            group.style.opacity = '1';
            text.textContent = count;
            text.style.transform = 'scale(1.2)';
            setTimeout(() => { text.style.transform = 'scale(1)'; }, 100);
        } else {
            group.style.opacity = '0';
        }
    }

    showNotification(message, color = '#ffffff') {
        const group = document.getElementById('notification-group');
        const text = document.getElementById('notification-text');
        if (!group || !text) return;

        text.textContent = message;
        text.setAttribute('fill', color);
        group.style.opacity = '1';
        group.style.transform = 'translate(960, 300) scale(1.2)';

        setTimeout(() => {
            group.style.transform = 'translate(960, 300) scale(1)';
            setTimeout(() => {
                group.style.opacity = '0';
            }, 2000);
        }, 100);
    }

    updateNpcHud() {
        const container = document.getElementById('npc-hud-container');
        if (!container) return;

        if (!state.inBattle || state.npcs.length === 0) {
            container.innerHTML = '';
            return;
        }

        // Only redraw if count changed or first time
        if (container.children.length !== state.npcs.length) {
            container.innerHTML = state.npcs.map((npc, i) => {
                const factionNum = npc.isZombie ? 4 : (npc.faction === 'player' ? 1 : (npc.faction === 'void' ? 2 : 3));
                const factionColor = this.getFactionColor(npc.faction);
                const classColor = this.getClassColor(npc.class);
                const col = i % 2;
                const row = Math.floor(i / 2);
                const x = col * 250;
                const y = row * 45; // Increased row height for level
                const strategyLabel = npc.strategy === 'tactician' ? '🧠' : (npc.strategy === 'aggressive' ? '⚔️' : '🌾');
                return `
                    <g transform="translate(${x}, ${y})" style="cursor: pointer; pointer-events: all;" onclick="window.focusTarget('${npc.id}')">
                        <text x="0" y="-18" fill="${factionColor}" font-size="10" font-weight="bold">${npc.id.toUpperCase()} ${strategyLabel}</text>
                        <text x="0" y="-8" fill="#aaa" font-size="9">LVL ${npc.level || 1} | ATK:${npc.stats?.atk || '?'} DEF:${npc.stats?.def || '?'}</text>
                        <rect x="0" y="0" width="180" height="6" fill="rgba(0,0,0,0.5)" stroke="${factionColor}" stroke-width="1"/>
                        <rect id="npc-bar-${npc.id}" x="0" y="0" width="${(npc.hp / npc.maxHp) * 180}" height="6" fill="${classColor}" class="hud-bar"/>
                    </g>
                `;
            }).join('');
        } else {
            // Update existing bars and levels
            state.npcs.forEach(npc => {
                const bar = document.getElementById(`npc-bar-${npc.id}`);
                if (bar) bar.setAttribute('width', (npc.hp / npc.maxHp) * 180);

                // Update level text if needed (we could optimize this but for now let's just redraw if level changes or keep it simple)
                // To be safe, we might want to update the text element too.
                const text = bar?.parentElement?.querySelector('text:last-of-type');
                if (text) {
                    text.textContent = `LVL ${npc.level || 1} | ATK:${npc.stats?.atk || '?'} DEF:${npc.stats?.def || '?'}`;
                }
            });
        }
    }

    showSection(sectionId) {
        // This game uses a single overlay, but we can handle specific UI elements
        if (sectionId === 'battle-ui') {
            const battleBtn = document.getElementById('battle-btn');
            const attackBtn = document.getElementById('attack-btn');
            const skillBtn = document.getElementById('skill-btn');
            if (battleBtn) battleBtn.style.display = 'none';
            if (attackBtn) attackBtn.style.display = 'inline-block';
            if (skillBtn) skillBtn.style.display = 'inline-block';
        }
    }

    getFactionColor(faction) {
        if (faction === 'player') return '#00ffff';
        if (faction === 'void') return '#ff4500';
        if (faction === 'gold') return '#ffd700';
        return '#ffffff';
    }

    getClassColor(cls) {
        const colors = {
            green: '#00ff00',
            red: '#ff0000',
            yellow: '#ffff00',
            purple: '#aa00ff',
            brown: '#8b4513',
            pink: '#ff00ff',
            darkgreen: '#006400',
            blue: '#00ffff'
        };
        return colors[cls] || '#ffffff';
    }

    showNPCInfo(npc) {
        let infoPanel = document.getElementById('npc-info-panel');
        if (!infoPanel) {
            infoPanel = document.createElement('div');
            infoPanel.id = 'npc-info-panel';
            infoPanel.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                width: 280px;
                background: rgba(0, 0, 0, 0.95);
                border: 3px solid #fff;
                box-shadow: 0 0 20px rgba(255,255,255,0.3), inset 0 0 20px rgba(0,0,0,0.5);
                padding: 20px;
                color: #fff;
                font-family: 'Cinzel', serif;
                z-index: 10000;
                pointer-events: auto;
                display: none;
                border-radius: 10px;
                transition: all 0.3s ease;
            `;

            // Add close button
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '✕';
            closeBtn.style.cssText = `
                position: absolute;
                top: 5px;
                right: 5px;
                background: rgba(255,0,0,0.3);
                border: 1px solid #ff0000;
                color: #fff;
                width: 25px;
                height: 25px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 16px;
                line-height: 1;
                transition: all 0.2s;
            `;
            closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(255,0,0,0.6)';
            closeBtn.onmouseout = () => closeBtn.style.background = 'rgba(255,0,0,0.3)';
            closeBtn.onclick = () => this.showNPCInfo(null);
            infoPanel.appendChild(closeBtn);

            document.body.appendChild(infoPanel);
        }

        if (!npc) {
            infoPanel.style.display = 'none';
            infoPanel.style.opacity = '0';
            return;
        }

        const color = this.getClassColor(npc.class);
        const factionColor = this.getFactionColor(npc.faction);
        const strategyEmoji = npc.strategy === 'tactician' ? '🧠 Tático' : (npc.strategy === 'aggressive' ? '⚔️ Agressivo' : '🌾 Fazendeiro');

        // Keep close button and update content
        const closeBtn = infoPanel.querySelector('button');
        infoPanel.innerHTML = `
            <h3 style="color: ${color}; margin: 0 0 10px 0; text-align: center; text-shadow: 0 0 10px ${color}; font-size: 1.3em;">${npc.id.toUpperCase()}</h3>
            <div style="text-align: center; margin-bottom: 10px; font-size: 0.85em; color: #aaa;">${npc.class.toUpperCase()}</div>
            <div style="margin-bottom: 8px; display: flex; justify-content: space-between;">
                <span><strong>Nível:</strong> <span style="color: #ffff00">${npc.level}</span></span>
                <span style="color: ${factionColor}; font-weight: bold;">${npc.faction.toUpperCase()}</span>
            </div>
            <div style="margin-bottom: 10px; text-align: center; background: rgba(255,255,255,0.1); padding: 5px; border-radius: 5px; font-size: 0.9em;">
                ${strategyEmoji}
            </div>
            <hr style="border-color: ${color}; margin: 12px 0; opacity: 0.5;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.95em; margin-bottom: 12px;">
                <div style="background: rgba(255,136,136,0.2); padding: 5px; border-radius: 5px; text-align: center;">
                    <div style="font-size: 0.8em; color: #aaa;">⚔️ ATK</div>
                    <div style="color:#ff8888; font-weight: bold;">${Math.round(npc.stats.atk)}</div>
                </div>
                <div style="background: rgba(136,136,255,0.2); padding: 5px; border-radius: 5px; text-align: center;">
                    <div style="font-size: 0.8em; color: #aaa;">🛡️ DEF</div>
                    <div style="color:#8888ff; font-weight: bold;">${Math.round(npc.stats.def)}</div>
                </div>
                <div style="background: rgba(136,255,255,0.2); padding: 5px; border-radius: 5px; text-align: center;">
                    <div style="font-size: 0.8em; color: #aaa;">🧠 INT</div>
                    <div style="color:#88ffff; font-weight: bold;">${Math.round(npc.stats.int || 0)}</div>
                </div>
                <div style="background: rgba(255,255,136,0.2); padding: 5px; border-radius: 5px; text-align: center;">
                    <div style="font-size: 0.8em; color: #aaa;">💨 EVA</div>
                    <div style="color:#ffff88; font-weight: bold;">${(npc.stats.eva * 100).toFixed(0)}%</div>
                </div>
            </div>
            <div style="margin-top: 15px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.85em; margin-bottom: 3px;">
                    <span style="color: #aaa;">HP</span>
                    <span style="font-weight: bold;">${Math.round(npc.hp)} / ${Math.round(npc.maxHp)}</span>
                </div>
                <div style="width: 100%; height: 8px; background: #222; border-radius: 4px; overflow: hidden; border: 1px solid #444;">
                    <div style="width: ${(npc.hp / npc.maxHp) * 100}%; height: 100%; background: linear-gradient(90deg, #00ff00, #00aa00); box-shadow: 0 0 10px #00ff00; transition: width 0.3s;"></div>
                </div>
            </div>
        `;

        // Re-add close button
        if (closeBtn) infoPanel.appendChild(closeBtn);

        infoPanel.style.display = 'block';
        infoPanel.style.opacity = '1';
        infoPanel.style.borderColor = color;
        infoPanel.style.boxShadow = `0 0 20px ${color}, inset 0 0 20px rgba(0,0,0,0.5)`;
    }

    addLogMessage(message, type = 'info') {
        let logContainer = document.getElementById('game-log-container');
        if (!logContainer) {
            logContainer = document.createElement('div');
            logContainer.id = 'game-log-container';
            logContainer.style.cssText = `
                position: absolute;
                bottom: 20px;
                right: 20px;
                width: 300px;
                max-height: 200px;
                overflow-y: hidden;
                display: flex;
                flex-direction: column;
                justify-content: flex-end;
                pointer-events: none;
                z-index: 900;
                font-family: 'Cinzel', serif;
                font-size: 14px;
                text-shadow: 1px 1px 2px black;
            `;
            document.body.appendChild(logContainer);
        }

        const entry = document.createElement('div');
        entry.style.cssText = `
            margin-top: 5px;
            padding: 5px 10px;
            background: rgba(0, 0, 0, 0.6);
            border-left: 3px solid #fff;
            color: #fff;
            opacity: 0;
            transition: opacity 0.5s;
        `;

        let color = '#fff';
        if (type === 'kill') { color = '#ff4444'; entry.style.borderLeftColor = color; }
        if (type === 'levelup') { color = '#ffff00'; entry.style.borderLeftColor = color; }
        if (type === 'boss') { color = '#aa00ff'; entry.style.borderLeftColor = color; }

        entry.innerHTML = `<span style="color:${color}">[${type.toUpperCase()}]</span> ${message}`;
        logContainer.appendChild(entry);

        // Fade in
        requestAnimationFrame(() => entry.style.opacity = '1');

        // Remove after 5 seconds
        setTimeout(() => {
            entry.style.opacity = '0';
            setTimeout(() => entry.remove(), 500);
        }, 5000);
    }
}
