import { state } from '../core/State.js';
import { gsap } from 'gsap';

export class HUD {
    constructor(container) {
        this.container = container;
        this.init();
        window.addEventListener('stateUpdate', () => this.update());
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

                    <!-- Combo Counter -->
                    <g id="combo-group" transform="translate(1700, 200)" style="opacity: 0;">
                        <text x="0" y="0" fill="#ffaa00" font-size="120" text-anchor="end" id="combo-text" filter="url(#glow)">0</text>
                        <text x="0" y="40" fill="#ffffff" font-size="30" text-anchor="end">COMBO</text>
                    </g>

                    <!-- Monster HP Bar (Top Center) - Marvel Style -->
                    <g transform="translate(660, 40)">
                        <rect x="0" y="0" width="600" height="20" fill="rgba(20, 0, 0, 0.8)" rx="10"/>
                        <rect id="monster-hp-bar" x="0" y="0" width="600" height="20" fill="#ff0000" rx="10" filter="url(#glow)"/>
                        <path d="M0,0 L600,0 L590,20 L10,20 Z" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
                        <text x="300" y="-12" fill="#fff" font-size="22" letter-spacing="4" text-anchor="middle" font-weight="900" style="text-shadow: 0 0 10px #ff0000;">ENTIDADE DO VAZIO</text>
                    </g>

                    <!-- Gold Goddess HP Bar (Top Right) - Marvel Style -->
                    <g id="gold-boss-hud" transform="translate(1400, 40)" style="display: none;">
                        <rect x="0" y="0" width="450" height="15" fill="rgba(20, 20, 0, 0.8)" rx="7"/>
                        <rect id="gold-boss-hp-bar" x="0" y="0" width="450" height="15" fill="#ffd700" rx="7" filter="url(#glow)"/>
                        <text x="225" y="-10" fill="#ffd700" font-size="20" text-anchor="middle" font-weight="bold">DEUSA DO OURO</text>
                    </g>

                    <!-- NPC HP Bars (Bottom Area) -->
                    <g id="npc-hud-container" transform="translate(50, 800)"></g>

                    <!-- Lore Log (Bottom Right) -->
                    <g id="lore-log" transform="translate(1500, 800)">
                        <text x="0" y="-10" fill="#00ffff" font-size="20" font-weight="bold">FRAGMENTOS DE LORE</text>
                        <g id="lore-list"></g>
                    </g>

                    <!-- Notifications -->
                    <g id="notification-group" transform="translate(960, 300)" style="opacity: 0;">
                        <text id="notification-text" x="0" y="0" fill="white" font-size="48" text-anchor="middle" font-weight="bold" filter="url(#glow)"></text>
                    </g>
                </svg>
            </div>
        `);
    }

    update() {
        const monsterHpBar = document.getElementById('monster-hp-bar');
        if (monsterHpBar) monsterHpBar.setAttribute('width', (state.monsterHp / state.maxMonsterHp) * 600);

        const goldBossHud = document.getElementById('gold-boss-hud');
        const goldBossHpBar = document.getElementById('gold-boss-hp-bar');
        if (goldBossHud) goldBossHud.style.display = (state.inBattle && state.bosses.gold.hp > 0) ? 'block' : 'none';
        if (goldBossHpBar) goldBossHpBar.setAttribute('width', (state.bosses.gold.hp / state.bosses.gold.maxHp) * 450);

        this.updateNpcHud();
        this.updateLoreLog();
    }

    updateNpcHud() {
        const container = document.getElementById('npc-hud-container');
        if (!container) return;

        if (!state.inBattle || state.npcs.length === 0) {
            container.innerHTML = '';
            return;
        }

        if (container.children.length !== state.npcs.length) {
            container.innerHTML = state.npcs.map((npc, i) => {
                const factionColor = this.getFactionColor(npc.faction);
                const classColor = this.getClassColor(npc.class);
                const col = i % 2;
                const row = Math.floor(i / 2);
                const x = col * 300;
                const y = row * 50;
                return `
                    <g transform="translate(${x}, ${y})" style="cursor: pointer; pointer-events: all;" onclick="window.focusTarget('${npc.id}')">
                        <text x="0" y="-18" fill="${factionColor}" font-size="12" font-weight="bold">${npc.id.toUpperCase()}</text>
                        <text x="0" y="-8" fill="#aaa" font-size="10">LVL ${npc.level || 1} | ATK:${npc.stats?.atk || '?'}</text>
                        <rect x="0" y="0" width="220" height="8" fill="rgba(0,0,0,0.5)" rx="4"/>
                        <rect id="npc-bar-${npc.id}" x="0" y="0" width="${(npc.hp / npc.maxHp) * 220}" height="8" fill="${classColor}" rx="4" filter="url(#glow)"/>
                    </g>
                `;
            }).join('');
        } else {
            state.npcs.forEach(npc => {
                const bar = document.getElementById(`npc-bar-${npc.id}`);
                if (bar) bar.setAttribute('width', (npc.hp / npc.maxHp) * 220);
                const text = bar?.parentElement?.querySelector('text:last-of-type');
                if (text) text.textContent = `LVL ${npc.level || 1} | ATK:${npc.stats?.atk || '?'}`;
            });
        }
    }

    updateLoreLog() {
        const list = document.getElementById('lore-list');
        if (!list) return;
        list.innerHTML = state.lore.map((text, i) => {
            return `<text x="0" y="${i * 25}" fill="#00ffff" font-size="14" opacity="${0.6 + Math.sin(Date.now() * 0.001 + i) * 0.2}">- ${text}</text>`;
        }).join('');
    }

    updateCombo(count) {
        const group = document.getElementById('combo-group');
        const text = document.getElementById('combo-text');
        if (!group || !text) return;

        if (count > 0) {
            text.textContent = count;
            gsap.killTweensOf(group);
            gsap.to(group, { opacity: 1, scale: 1.2, duration: 0.2, yoyo: true, repeat: 1 });
        } else {
            gsap.to(group, { opacity: 0, duration: 0.5 });
        }
    }

    showNotification(text, color = '#ffffff') {
        const group = document.getElementById('notification-group');
        const textEl = document.getElementById('notification-text');
        if (!group || !textEl) return;

        textEl.textContent = text;
        textEl.setAttribute('fill', color);
        textEl.style.textShadow = `0 0 20px ${color}`;

        gsap.killTweensOf(group);
        gsap.set(group, { opacity: 0, y: 400, scale: 0.8 });
        gsap.to(group, { opacity: 1, y: 450, scale: 1, duration: 0.6, ease: "back.out(1.7)" });
        gsap.to(group, { opacity: 0, y: 400, duration: 0.5, delay: 2.5, ease: "power2.in" });
    }


    getFactionColor(faction) {
        if (faction === 'void') return '#ff4500';
        if (faction === 'gold') return '#ffd700';
        return '#00ffff';
    }

    getClassColor(cls) {
        const colors = { green: '#00ff00', yellow: '#ffff00', red: '#ff0000', purple: '#aa00ff', brown: '#8b4513', pink: '#ff00ff', blue: '#00ffff' };
        return colors[cls] || '#ffffff';
    }

    getLogColor(type) {
        const colors = { kill: '#ff0000', death: '#888', levelup: '#ffff00', spawn: '#00ff00', info: '#00ffff', boss: '#ffaa00' };
        return colors[type] || '#ffffff';
    }

    showNPCInfo(npcOrId) {
        const panel = document.getElementById('npc-info-panel');
        const content = document.getElementById('npc-info-content');
        if (!panel || !content) return;

        let npc;
        if (typeof npcOrId === 'string') {
            npc = state.npcs.find(n => n.id === npcOrId);
        } else {
            npc = npcOrId;
        }

        if (!npc) return;

        panel.classList.add('visible');

        const factionColor = this.getFactionColor(npc.faction);
        content.innerHTML = `
            <h2 style="color: ${factionColor}; margin-top: 0; text-shadow: 0 0 10px ${factionColor}">${npc.id.toUpperCase()}</h2>
            <div style="margin-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
                <span style="color: #aaa">Fação:</span> <span style="color: ${factionColor}">${npc.faction.toUpperCase()}</span><br>
                <span style="color: #aaa">Classe:</span> <span style="color: ${this.getClassColor(npc.class)}">${npc.class.toUpperCase()}</span><br>
                <span style="color: #aaa">Nível:</span> <span style="color: #fff">${npc.level}</span>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.9em;">
                <div><span style="color: #aaa">HP:</span> ${Math.floor(npc.hp)}/${npc.maxHp}</div>
                <div><span style="color: #aaa">ATK:</span> ${npc.stats.atk}</div>
                <div><span style="color: #aaa">DEF:</span> ${npc.stats.def}</div>
                <div><span style="color: #aaa">EVA:</span> ${(npc.stats.eva * 100).toFixed(0)}%</div>
            </div>

            <div style="margin-top: 20px; font-style: italic; color: #888; font-size: 0.85em;">
                ${this.getNPCDescription(npc.class)}
            </div>
            <div style="margin-top: 20px; text-align: center;">
                <button class="menu-btn" onclick="window.focusTarget('${npc.id}')" style="font-size: 14px; padding: 5px 15px;">FOCAR CÂMERA</button>
            </div>
        `;
    }

    getNPCDescription(cls) {
        const descs = {
            green: "Especialista em cura e suporte vital do Shadow Realm.",
            yellow: "Mestre da velocidade, acumulando força através do movimento constante.",
            red: "Piroclasta destructivo, transformando o campo em um inferno.",
            purple: "Oráculo arcano com percepção absoluta de todas as entidades.",
            brown: "Ancorador gravitacional, imune a empuxos e mestre da massa.",
            pink: "Manipulador tático, capaz de corromper a mente dos adversários.",
            blue: "Lorde do frio absoluto, paralisando oponentes em seu rastro.",
            darkgreen: "Necrofagos das sombras, trazendo o exército dos mortos de volta."
        };
        return descs[cls] || "Um combatente misterioso lutando pela supremacia.";
    }
}
