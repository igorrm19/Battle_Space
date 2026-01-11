import * as THREE from 'three';
import { SceneManager } from '../world/Scene.js';
import { Monster } from '../world/Monster.js';
import { HUD } from '../ui/HUD.js';
import { state, updateState, resetMonster } from './State.js';
import { playerAttack, monsterAttack, skillAttack, regenerateMana } from '../game/Combat.js';
import { audioManager } from './Audio.js';
import { NPCManager } from '../world/NPCManager.js';

export class Game {
    constructor() {
        this.container = document.getElementById('app');
        this.sceneManager = new SceneManager(this.container);
        this.monster = new Monster(this.sceneManager.scene);
        this.goldBoss = this.initGoldBoss();
        this.hud = new HUD(this.container);
        this.npcManager = new NPCManager(this.sceneManager.scene, this.hud);
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
            this.sceneManager.setFocus(() => this.npcManager.getTargetPosition(id));
        };

        this.init();
        this.animate();

        window.debugNPCs = false; // Default debug off
    }

    init() {
        try {
            document.getElementById('save-btn').addEventListener('click', () => {
                audioManager.resume();
                this.hud.showNotification("JOGO SALVO!", "#00ff00");
            });

            // Auto-start NPCs and bosses
            updateState({ inBattle: true });
            this.npcManager.spawnInitialNpcs();
            this.goldBoss.visible = true;
            this.monster.mesh.visible = true;
            resetMonster();
            audioManager.playStart();

            window.addEventListener('keydown', (e) => this.keys[e.code] = true);
            window.addEventListener('keyup', (e) => this.keys[e.code] = false);
            window.addEventListener('mousedown', (e) => {
                audioManager.resume();
                this.handleMouseClick(e);
            });
        } catch (e) {
            console.error("Init Error:", e);
            this.hud.showNotification("ERRO INICIALIZACAO: " + e.message, "#ff0000");
        }
    }

    initGoldBoss() {
        const geo = new THREE.SphereGeometry(0.8, 32, 32); // Reduced from 1.2
        const mat = new THREE.MeshPhysicalMaterial({
            color: 0xffd700, emissive: 0xffd700, emissiveIntensity: 2,
            metalness: 1, roughness: 0
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(12, 5, -5);
        mesh.visible = false;

        // Add Glow
        const light = new THREE.PointLight(0xffd700, 10, 20);
        mesh.add(light);

        // Add Halo
        const haloGeo = new THREE.RingGeometry(1.0, 1.3, 32); // Reduced from 1.6, 1.9
        const haloMat = new THREE.MeshBasicMaterial({ color: 0xffd700, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
        const halo = new THREE.Mesh(haloGeo, haloMat);
        halo.rotation.x = Math.PI / 2;
        mesh.add(halo);
        this.goldHalo = halo;

        this.sceneManager.scene.add(mesh);
        return mesh;
    }

    handleMouseClick(event) {
        if (event.target.tagName !== 'CANVAS') return; // Ignore UI clicks

        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);

        // Check for NPC clicks
        const npcMeshes = this.npcManager.npcs.map(n => n.mesh);
        const intersectsNPC = this.raycaster.intersectObjects(npcMeshes, true);

        if (intersectsNPC.length > 0) {
            // Find the root NPC object from the intersected mesh
            let obj = intersectsNPC[0].object;
            while (obj.parent && !this.npcManager.npcs.find(n => n.mesh === obj)) {
                obj = obj.parent;
            }
            const npc = this.npcManager.npcs.find(n => n.mesh === obj);
            if (npc) {
                this.hud.showNPCInfo(npc);
                // Set camera focus on this NPC
                this.sceneManager.setFocus(() => npc.mesh.position);
                return; // Stop processing if clicked on NPC
            }
        }

        // Movement logic (if needed)
        const intersects = this.raycaster.intersectObject(this.sceneManager.floor);
        if (intersects.length > 0) {
            // Don't hide NPC info panel here - let user close it manually or by clicking another NPC
            this.clickTarget = intersects[0].point.clone();
            this.sceneManager.updateClickMarker(this.clickTarget);
        }
    }

    handlePlayerAttack() {
        if (!state.inBattle) return;
        const result = playerAttack();
        this.monster.takeDamage(result.isCrit);
        this.sceneManager.spawnDamageNumber(result.dmg, this.monster.mesh.position, result.isCrit);
        this.sceneManager.triggerImpactEffect();
        audioManager.playHit();
        this.combo++;
        this.comboTimer = 2.0;
        this.hud.updateCombo(this.combo);
    }

    handleSkillAttack() {
        if (!state.inBattle || state.mp < 200) return;
        const result = skillAttack();
        if (result) {
            this.monster.takeDamage(true);
            this.sceneManager.spawnDamageNumber(result.dmg, this.monster.mesh.position, true);
            this.sceneManager.triggerImpactEffect();
            audioManager.playSkill();
            this.triggerHitStop(0.15);
        }
    }

    handleMonsterAttack(type = 'normal', targetId = 'player', attackerId = 'void_boss') {
        const result = monsterAttack(type, targetId, this.npcManager.npcs);
        if (!result) return;
        const targetPos = this.npcManager.getTargetPosition(targetId);

        if (attackerId === 'void_boss') {
            this.monster.performAttack(targetPos);
        } else if (attackerId === 'gold_boss') {
            // Gold Boss Lunge
            const originalPos = this.goldBoss.position.clone();
            const dir = targetPos.clone().sub(this.goldBoss.position).normalize();
            this.goldBoss.position.add(dir.multiplyScalar(3));
            setTimeout(() => this.goldBoss.position.copy(originalPos), 200);
        }

        this.sceneManager.spawnDamageNumber(result.dmg || 'MISS', targetPos, result.isCrit);
        if (result.dmg > 0) {
            this.sceneManager.triggerImpactEffect();
            audioManager.playHit();
            if (targetId === 'player') this.hud.updatePlayerHp();
        }
        if (result.defeated && targetId === 'player') this.hud.showGameOver();
    }

    triggerHitStop(duration) {
        this.timeScale = 0.1;
        setTimeout(() => this.timeScale = 1.0, duration * 1000);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        try {
            const delta = this.clock.getDelta() * this.timeScale;

            // Player Movement
            let moveDir = new THREE.Vector3();
            if (this.keys['KeyW'] || this.keys['ArrowUp']) moveDir.z -= 1;
            if (this.keys['KeyS'] || this.keys['ArrowDown']) moveDir.z += 1;
            if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveDir.x -= 1;
            if (this.keys['KeyD'] || this.keys['ArrowRight']) moveDir.x += 1;
            if (this.keys['Space']) moveDir.y += 1;
            if (this.keys['ShiftLeft']) moveDir.y -= 1;

            if (moveDir.length() > 0) {
                let speed = 0.5; // Faster camera speed
                if (this.keys['ShiftLeft']) speed = 1.0; // Sprint
                this.playerPos.add(moveDir.normalize().multiplyScalar(speed));
                this.clickTarget = null;
            }

            // Free Camera Boundaries (Expanded)
            this.playerPos.x = THREE.MathUtils.clamp(this.playerPos.x, -100, 100);
            this.playerPos.y = THREE.MathUtils.clamp(this.playerPos.y, 5, 50); // Fly height
            this.playerPos.z = THREE.MathUtils.clamp(this.playerPos.z, -100, 100);

            if (state.inBattle) {
                // Boss AI & Physics
                const voidTarget = this.npcManager.getTargetPosition(state.monsterTarget);
                if (voidTarget) this.monster.applyForce(this.monster.seek(voidTarget));

                this.monster.update(delta, this.mouse, state);

                // Safety check for NaN positions
                const checkNaN = (vec, defaultVec) => {
                    if (isNaN(vec.x) || isNaN(vec.y) || isNaN(vec.z)) {
                        vec.copy(defaultVec);
                        return true;
                    }
                    return false;
                };

                if (checkNaN(this.playerPos, new THREE.Vector3(0, 10, 25))) {
                    console.warn("Player Pos NaN fixed");
                }
                if (checkNaN(this.monster.mesh.position, new THREE.Vector3(0, 0, 0))) {
                    console.warn("Monster Pos NaN fixed");
                }
                if (checkNaN(this.goldBoss.position, new THREE.Vector3(12, 5, -5))) {
                    console.warn("Gold Boss Pos NaN fixed");
                }

                updateState({
                    playerPos: this.playerPos.clone(),
                    monsterPos: this.monster.mesh.position.clone(),
                    goldBossPos: this.goldBoss.position.clone()
                });

                const safeDelta = (delta > 0 && delta < 0.5) ? delta : 0.016;
                this.npcManager.update(safeDelta, this.playerPos);

                if (this.goldBoss.visible) {
                    // Gold Boss Steering
                    const goldTargetId = state.goldTarget || 'player';
                    const goldTarget = this.npcManager.getTargetPosition(goldTargetId);
                    if (goldTarget) {
                        const desired = goldTarget.clone().sub(this.goldBoss.position);
                        if (!isNaN(desired.x) && !isNaN(desired.y) && !isNaN(desired.z) && desired.length() > 5) {
                            desired.normalize().multiplyScalar(0.1);
                            this.goldBoss.position.add(desired);
                        }
                    }

                    this.goldBoss.position.y = 5 + Math.sin(this.clock.elapsedTime * 2) * 0.5;
                    this.goldBoss.rotation.y += delta;
                    if (this.goldHalo) {
                        this.goldHalo.rotation.z += delta * 2;
                        this.goldHalo.scale.setScalar(1 + Math.sin(this.clock.elapsedTime * 4) * 0.1);
                    }
                }


                // Combo Timer
                if (this.comboTimer > 0) {
                    this.comboTimer -= delta;
                    if (this.comboTimer <= 0) { this.combo = 0; this.hud.updateCombo(0); }
                }

                // Monster AI Decision (Enabled)
                this.aiTimer += delta;
                if (this.aiTimer >= this.aiCooldown) {
                    this.aiTimer = 0;
                    // Void Boss targets Gold Boss or Strongest NPC
                    const targets = [{ id: 'gold_boss', level: 100 }, ...state.npcs.filter(n => n.hp > 0)];
                    // Sort by threat (Level)
                    targets.sort((a, b) => (b.level || 0) - (a.level || 0));

                    // 70% chance to hit top threat, 30% random
                    const target = Math.random() < 0.7 ? targets[0] : targets[Math.floor(Math.random() * targets.length)];

                    if (target) {
                        updateState({ monsterTarget: target.id });
                        this.handleMonsterAttack('normal', target.id, 'void_boss');
                    }
                }

                // Gold Boss AI Decision (Enabled)
                if (this.goldBoss.visible) {
                    this.goldBossTimer = (this.goldBossTimer || 0) + delta;
                    if (this.goldBossTimer >= 4) {
                        this.goldBossTimer = 0;
                        // Gold Boss targets Void Boss or Strongest NPC
                        const targets = [{ id: 'void_boss', level: 100 }, ...state.npcs.filter(n => n.hp > 0)];
                        targets.sort((a, b) => (b.level || 0) - (a.level || 0));

                        const target = Math.random() < 0.7 ? targets[0] : targets[Math.floor(Math.random() * targets.length)];

                        if (target) {
                            updateState({ goldTarget: target.id });
                            this.handleMonsterAttack('normal', target.id, 'gold_boss');
                        }
                    }
                }

                regenerateMana(delta);
                // Stamina Regeneration
                if (state.stamina < state.maxStamina) {
                    updateState({ stamina: Math.min(state.maxStamina, state.stamina + state.sRegen * delta) });
                }
            }

            const entities = [
                { id: 'player', position: this.playerPos, hp: state.hp, maxHp: state.maxHp, isPlayer: true },
                { id: 'void_boss', position: this.monster.mesh.position, hp: state.monsterHp, maxHp: state.maxMonsterHp, isMonster: true },
                { id: 'gold_boss', position: this.goldBoss.position, hp: state.bosses.gold.hp, maxHp: state.bosses.gold.maxHp, isGoldBoss: true },
                ...this.npcManager.npcs.filter(n => n.hp > 0)
            ];

            this.sceneManager.render(delta, this.monster.mesh.position, this.goldBoss.position, this.playerPos, entities);
        } catch (e) { console.error(e); }
    }
}
