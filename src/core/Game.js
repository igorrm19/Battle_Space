import * as THREE from 'three';
import { SceneManager } from '../world/Scene.js';
import { Monster } from '../world/Monster.js';
import { HUD } from '../ui/HUD.js';
import { state, updateState, resetMonster } from './State.js';
import { playerAttack, monsterAttack, skillAttack, regenerateMana } from '../game/Combat.js';
import { audioManager } from './Audio.js';
import { NPCManager } from '../world/NPCManager.js';
import { NPCPanelManager } from '../ui/NPCPanelManager.js';
import { GameEventsLogger } from '../ui/GameEventsLogger.js';
import { gsap } from 'gsap';

export class Game {
    constructor() {
        this.container = document.getElementById('app');
        this.sceneManager = new SceneManager(this.container);
        this.monster = new Monster(this.sceneManager.scene);
        this.goldBoss = this.initGoldBoss();
        this.hud = new HUD(this.container);
        this.npcManager = new NPCManager(this.sceneManager, this.hud);
        this.npcPanelManager = new NPCPanelManager(this.hud, this.npcManager);
        this.eventsLogger = new GameEventsLogger();
        this.clock = new THREE.Clock();
        this.mouse = new THREE.Vector2();
        this.playerPos = new THREE.Vector3(0, 0, 10);
        this.boundary = 50;
        this.keys = {};
        this.clickTarget = null;
        this.raycaster = new THREE.Raycaster();

        this.sceneManager.onLoreDiscovered = (text) => {
            if (!state.lore.includes(text)) {
                this.hud.showNotification("LORE DESCOBERTA!", "#00ffff");
                updateState({ lore: [...state.lore, text] });
                audioManager.playSkill();
            }
        };

        window.addEventListener('hazardSpawned', (e) => {
            const { type, pos } = e.detail;
            const color = type === 'rift' ? "#ff00ff" : "#ffd700";
            const msg = type === 'rift' ? "FENDA DO VAZIO SURGIU!" : "POÇO DE OURO DESCOBERTO!";
            this.hud.showNotification(msg, color);
            audioManager.playGravity();
        });

        this.timeScale = 1.0;
        this.combo = 0;
        this.comboTimer = 0;
        this.aiTimer = 0;
        this.aiCooldown = 3.0;

        window.focusTarget = (id) => {
            this.sceneManager.setFocus(() => this.npcManager.getTargetPosition(id), 60); // 1 minute focus
            this.sceneManager.focusId = id; // Ensure outline is hidden
        };

        // Expose game instance for HUD button access
        window.game = this;

        this.init();
        this.animate();

        window.debugNPCs = false; // Default debug off
    }

    init() {
        try {
            // Initialize events logger
            this.eventsLogger.init();
            this.eventsLogger.logInfo('Jogo iniciado - Shadow Realm 3D');

            document.getElementById('save-btn').addEventListener('click', () => {
                audioManager.resume();
                this.hud.showNotification("JOGO SALVO!", "#00ff00");
                this.eventsLogger.logInfo('Jogo salvo com sucesso');
            });

            // Auto-start NPCs and bosses
            updateState({ inBattle: true });
            this.npcManager.spawnInitialNpcs();
            this.goldBoss.visible = true;
            this.monster.mesh.visible = true;
            resetMonster();

            // Start Cinematic Intro
            this.playCinematicIntro();

            // Listen to existing game-log events and route to GameEventsLogger
            window.addEventListener('game-log', (e) => {
                const { message, type, data } = e.detail;
                if (type === 'levelup') {
                    this.sceneManager.triggerGlitch(0.15);
                    this.sceneManager.triggerScreenShake(0.4);
                }

                switch (type) {
                    case 'kill':
                    case 'death':
                        if (data && data.npcName) {
                            this.eventsLogger.logDeath(data.npcName, data.killerName);
                        } else {
                            this.eventsLogger.addEvent(message, 'death');
                        }
                        break;
                    case 'levelup':
                        if (data && data.npcName && data.newLevel) {
                            this.eventsLogger.logLevelUp(data.npcName, data.newLevel);
                        } else {
                            this.eventsLogger.addEvent(message, 'levelup');
                        }
                        break;
                    case 'spawn':
                        if (data && data.npcName && data.faction) {
                            this.eventsLogger.logSpawn(data.npcName, data.faction);
                        } else {
                            this.eventsLogger.addEvent(message, 'spawn');
                        }
                        break;
                    case 'combat':
                        if (data && data.attackerName && data.targetName && data.damage) {
                            this.eventsLogger.logCombat(data.attackerName, data.targetName, data.damage);
                        } else {
                            this.eventsLogger.addEvent(message, 'combat');
                        }
                        break;
                    default:
                        this.eventsLogger.logInfo(message);
                }
            });

            // Start automatic NPC panel rotation
            setTimeout(() => {
                this.npcPanelManager.start();
                console.log('[Game] NPC Panel auto-rotation started');
            }, 5000); // Wait 5 seconds for NPCs to spawn and intro to play

            window.addEventListener('keydown', (e) => this.keys[e.code] = true);
            window.addEventListener('keyup', (e) => this.keys[e.code] = false);
            window.addEventListener('mousedown', (e) => {
                audioManager.resume();
                this.handleMouseClick(e);
            });
            window.addEventListener('mousemove', (e) => {
                this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
                this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
            });

            // NPC Panel Controls
            const npcCloseBtn = document.getElementById('npc-close-btn');
            if (npcCloseBtn) {
                npcCloseBtn.onclick = () => {
                    document.getElementById('npc-info-panel').classList.remove('visible');
                    this.sceneManager.focusId = null; // Restore outlines
                };
            }
            const npcNextBtn = document.getElementById('npc-next-btn');
            if (npcNextBtn) {
                npcNextBtn.onclick = () => {
                    this.npcPanelManager.nextNPC();
                };
            }
        } catch (e) {
            console.error("Game Init Error:", e);
        }
    }

    playCinematicIntro() {
        // Start far away looking at the Singularity
        const singularity = this.sceneManager.celestialBodies[0].group;
        if (!singularity) return;

        this.sceneManager.setFocus(() => singularity.position, 6.0);
        this.sceneManager.cameraGroup.position.set(0, 100, 200);

        const skipBtn = document.getElementById('skip-intro-btn');
        if (skipBtn) {
            skipBtn.style.display = 'block';
            skipBtn.onclick = () => {
                gsap.killTweensOf(this.sceneManager.cameraGroup.position);
                this.sceneManager.cameraGroup.position.set(0, 10, 25);
                this.sceneManager.setFocus(null);
                skipBtn.style.display = 'none';
                this.hud.showNotification("A BATALHA PELO VAZIO COMEÇOU", "#ff00ff");
                audioManager.playStart();
            };
        }

        gsap.to(this.sceneManager.cameraGroup.position, {
            x: 0,
            y: 10,
            z: 25,
            duration: 6,
            delay: 0.5,
            ease: "expo.inOut",
            onComplete: () => {
                if (skipBtn) skipBtn.style.display = 'none';
                this.hud.showNotification("A BATALHA PELO VAZIO COMEÇOU", "#ff00ff");
                audioManager.playStart();
                this.sceneManager.triggerGlitch(0.1);
            }
        });

        // Intro message
        this.eventsLogger.logInfo('O Vazio está se expandindo...');
    }

    initGoldBoss() {
        const group = new THREE.Group();
        const geo = new THREE.OctahedronGeometry(4, 0);
        const mat = new THREE.MeshPhysicalMaterial({
            color: 0xffd700,
            metalness: 1,
            roughness: 0.1,
            emissive: 0xffaa00,
            emissiveIntensity: 2
        });
        const mesh = new THREE.Mesh(geo, mat);
        group.add(mesh);

        // Add orbital rings
        for (let i = 0; i < 3; i++) {
            const rGeo = new THREE.TorusGeometry(6 + i * 2, 0.1, 8, 50);
            const rMat = new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.5 });
            const ring = new THREE.Mesh(rGeo, rMat);
            ring.rotation.x = Math.random() * Math.PI;
            ring.rotation.y = Math.random() * Math.PI;
            group.add(ring);
        }

        group.position.set(40, 5, -40);
        this.sceneManager.scene.add(group);
        return group;
    }

    handleMouseClick(event) {
        this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);
        const intersects = this.raycaster.intersectObjects(this.sceneManager.scene.children, true);

        if (intersects.length > 0) {
            let target = intersects[0].object;
            // Climb up to find the NPC group if possible
            let current = target;
            while (current.parent && !current.userData.npcId) {
                current = current.parent;
            }

            if (current.userData.npcId) {
                this.hud.showNPCInfo(current.userData.npcId);
                return;
            }

            // Otherwise, move player or attack monster
            const groundIntersect = intersects.find(i => i.object === this.sceneManager.floor);
            if (groundIntersect) {
                const targetPos = groundIntersect.point;
                this.sceneManager.updateClickMarker(targetPos);
                this.playerPos.copy(targetPos);

                // If clicked near monster, attack
                const monsterDist = targetPos.distanceTo(state.monsterPos);
                if (monsterDist < 10) {
                    this.handlePlayerAttack();
                }

                const goldBossDist = targetPos.distanceTo(new THREE.Vector3(40, 0, -40));
                if (goldBossDist < 10) {
                    this.handleGoldBossAttack();
                }
            }
        }
    }

    handlePlayerAttack() {
        const result = playerAttack();
        if (result.hit) {
            this.sceneManager.triggerImpactEffect();
            this.sceneManager.spawnDamageNumber(result.damage, state.monsterPos, result.crit);
            this.monster.takeDamage();
            this.combo++;
            this.comboTimer = 2.0;
            this.hud.updateCombo(this.combo);
            audioManager.playHit();
        }
    }

    handleGoldBossAttack() {
        const result = playerAttack();
        if (result.hit) {
            this.sceneManager.triggerImpactEffect();
            this.sceneManager.spawnDamageNumber(result.damage, new THREE.Vector3(40, 5, -40), result.crit);
            this.combo++;
            this.comboTimer = 2.0;
            this.hud.updateCombo(this.combo);
            audioManager.playHit();

            // Damage gold boss in state
            const boss = state.bosses.gold;
            boss.hp = Math.max(0, boss.hp - result.damage);
            updateState({ bosses: { ...state.bosses, gold: boss } });
        }
    }

    handleSkillAttack(skillId) {
        const result = skillAttack(skillId);
        if (result.success) {
            this.sceneManager.triggerImpactEffect();
            this.sceneManager.triggerGlitch(0.3);
            this.sceneManager.spawnDamageNumber(result.damage, state.monsterPos, true);
            this.monster.takeDamage();
            audioManager.playSkill();
            this.hud.showNotification(`${skillId.toUpperCase()} ATIVADO!`, "#ff00ff");
        }
    }

    update(delta) {
        // Regenerate Mana
        regenerateMana(delta);

        // Update Combo
        if (this.comboTimer > 0) {
            this.comboTimer -= delta;
            if (this.comboTimer <= 0) {
                this.combo = 0;
                this.hud.updateCombo(0);
            }
        }

        // Update Managers
        this.npcManager.update(delta);
        this.npcPanelManager.update(delta);
        this.monster.update(delta, this.playerPos, state);

        // Gold Boss Animation
        if (this.goldBoss) {
            this.goldBoss.rotation.y += delta * 0.5;
            this.goldBoss.position.y = 5 + Math.sin(this.clock.getElapsedTime()) * 2;
            // Update light intensity based on HP
            const bossHpPerc = state.bosses.gold.hp / 40000;
            this.goldBoss.children[0].material.emissiveIntensity = 1 + (1 - bossHpPerc) * 5;
        }

        // Monster attack AI
        this.aiTimer += delta;
        if (this.aiTimer > this.aiCooldown) {
            if (state.monsterHp > 0) {
                const result = monsterAttack();
                if (result.hit) {
                    this.sceneManager.triggerImpactEffect();
                    this.sceneManager.triggerGlitch(0.2);
                    this.hud.showNotification("MONSTRO ATACOU!", "#ff0000");
                }
            }
            this.aiTimer = 0;
        }

        this.hud.update(state);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const delta = this.clock.getDelta() * this.timeScale;
        this.update(delta);

        // Pass entities for Environment Manager update (Player, Bosses, NPCs)
        const entities = [
            { position: this.playerPos, radius: 2, isPlayer: true, hp: state.hp, maxHp: state.maxHp },
            { position: state.monsterPos, radius: 5, isMonster: true, hp: state.monsterHp, maxHp: state.maxMonsterHp },
            { position: this.goldBoss.position, radius: 5, isGoldBoss: true, hp: state.bosses.gold.hp, maxHp: state.bosses.gold.maxHp },
            ...this.npcManager.npcs
        ];

        this.sceneManager.render(delta, state.monsterPos, new THREE.Vector3(40, 5, -40), this.playerPos, entities);
    }
}
