import * as THREE from 'three';
import { state, updateState } from '../core/State.js';

export class EnvironmentManager {
    constructor(scene) {
        this.scene = scene;
        this.hazards = [];
        this.powerUps = [];
        this.spawnTimer = 0;
        this.powerUpTimer = 0;
    }

    update(delta, entities) {
        this.spawnTimer += delta;
        if (this.spawnTimer > 10) { // Spawn every 10 seconds
            this.spawnHazard();
            this.spawnTimer = 0;
        }

        for (let i = this.hazards.length - 1; i >= 0; i--) {
            const h = this.hazards[i];
            h.life -= delta;

            // Visual updates
            h.mesh.rotation.y += delta * 2;
            const pulse = 1 + Math.sin(Date.now() * 0.005) * 0.1;
            h.mesh.scale.setScalar(pulse);

            // Effect logic
            entities.forEach(entity => {
                if (entity && entity.position) {
                    const ePos = entity.position;
                    const hPos = h.mesh.position;
                    // Robust distance calculation (handles Vector3 and plain objects)
                    const dx = (ePos.x || 0) - (hPos.x || 0);
                    const dy = (ePos.y || 0) - (hPos.y || 0);
                    const dz = (ePos.z || 0) - (hPos.z || 0);
                    const distSq = dx * dx + dy * dy + dz * dz;

                    if (distSq < h.radius * h.radius) {
                        this.applyEffect(h, entity, delta);
                    }
                }
            });

            if (h.life <= 0) {
                this.scene.remove(h.mesh);
                this.hazards.splice(i, 1);
            }
        }

        // PowerUp Logic
        this.powerUpTimer += delta;
        if (this.powerUpTimer > 8) { // Spawn every 8 seconds
            this.spawnPowerUp();
            this.powerUpTimer = 0;
        }

        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const p = this.powerUps[i];
            p.life -= delta;
            p.mesh.rotation.x += delta;
            p.mesh.rotation.y += delta;
            p.mesh.position.y = 1 + Math.sin(Date.now() * 0.003) * 0.2; // Float

            let collected = false;
            for (const entity of entities) {
                if (entity && entity.position && entity.hp > 0) {
                    const ePos = entity.position;
                    const pPos = p.mesh.position;
                    const dx = (ePos.x || 0) - (pPos.x || 0);
                    const dy = (ePos.y || 0) - (pPos.y || 0);
                    const dz = (ePos.z || 0) - (pPos.z || 0);
                    const distSq = dx * dx + dy * dy + dz * dz;

                    if (distSq < 6.25) { // 2.5 * 2.5
                        this.applyPowerUp(p, entity);
                        collected = true;
                        break;
                    }
                }
            }

            if (collected || p.life <= 0) {
                if (collected) {
                    // Visual feedback for collection
                    // Could add a particle burst here if we had access to a particle system
                }
                this.scene.remove(p.mesh);
                this.powerUps.splice(i, 1);
            }
        }
    }

    spawnHazard() {
        const isRift = Math.random() > 0.5;
        const type = isRift ? 'rift' : 'well';
        const color = isRift ? 0xff00ff : 0xffd700;
        const radius = isRift ? 5 : 4;

        const geo = new THREE.TorusKnotGeometry(radius * 0.5, 0.2, 64, 8);
        const mat = new THREE.MeshPhysicalMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 2,
            transparent: true,
            opacity: 0.6,
            wireframe: true
        });
        const mesh = new THREE.Mesh(geo, mat);

        const range = 40;
        mesh.position.set(
            (Math.random() - 0.5) * range,
            1,
            (Math.random() - 0.5) * range
        );
        mesh.rotation.x = Math.PI / 2;

        this.scene.add(mesh);

        this.hazards.push({
            type,
            mesh,
            radius,
            life: 15 + Math.random() * 10 // Lasts 15-25 seconds
        });

        // Dispatch event for HUD notification
        window.dispatchEvent(new CustomEvent('hazardSpawned', {
            detail: { type, pos: mesh.position.clone() }
        }));
    }

    applyEffect(hazard, entity, delta) {
        const amount = (hazard.type === 'rift' ? -20 : 30) * delta;

        if (entity.isPlayer) {
            updateState({ hp: Math.max(0, Math.min(state.maxHp, state.hp + amount)) });
        } else if (entity.isMonster) {
            updateState({ monsterHp: Math.max(0, Math.min(state.maxMonsterHp, state.monsterHp + amount)) });
        } else if (entity.isGoldBoss) {
            state.bosses.gold.hp = Math.max(0, Math.min(state.bosses.gold.maxHp, state.bosses.gold.hp + amount));
            updateState({ bosses: { ...state.bosses } });
        } else {
            // NPC Instance
            entity.hp = Math.max(0, Math.min(entity.maxHp, entity.hp + amount));
        }
    }

    spawnPowerUp() {
        const types = ['heal', 'atk', 'def', 'maxhp'];
        const type = types[Math.floor(Math.random() * types.length)];

        let color;
        if (type === 'heal') color = 0x00ff00; // Green
        if (type === 'atk') color = 0xff0000; // Red
        if (type === 'def') color = 0x0000ff; // Blue
        if (type === 'maxhp') color = 0x00ffff; // Cyan

        const geo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const mat = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.5,
            metalness: 0.8,
            roughness: 0.2
        });
        const mesh = new THREE.Mesh(geo, mat);

        const range = 45;
        mesh.position.set(
            (Math.random() - 0.5) * range,
            1,
            (Math.random() - 0.5) * range
        );

        this.scene.add(mesh);

        this.powerUps.push({
            type,
            mesh,
            life: 20 // Lasts 20 seconds
        });
    }

    applyPowerUp(powerUp, entity) {
        let msg = "";
        let color = "#ffffff";

        if (powerUp.type === 'heal') {
            const heal = entity.maxHp * 0.2;
            entity.hp = Math.min(entity.maxHp, entity.hp + heal);
            msg = "Vida Recuperada!";
            color = "#00ff00";
        } else if (powerUp.type === 'atk') {
            if (entity.stats) {
                entity.stats.atk += 2;
                msg = "ATK Aumentado!";
                color = "#ff0000";
            }
        } else if (powerUp.type === 'def') {
            if (entity.stats) {
                entity.stats.def += 1;
                msg = "DEF Aumentada!";
                color = "#0000ff";
            }
        } else if (powerUp.type === 'maxhp') {
            entity.maxHp += 50;
            entity.hp += 50;
            msg = "Vitalidade Aumentada!";
            color = "#00ffff";
        }

        // Update Global State if needed (for bosses/player)
        if (entity.isPlayer) {
            updateState({ hp: state.hp, maxHp: state.maxHp }); // Sync
        } else if (entity.isMonster) {
            updateState({ monsterHp: state.monsterHp, maxMonsterHp: state.maxMonsterHp });
        }

        // Log/Notification (Optional, maybe too spammy for log, but good for visual pop-up if we had one)
        // For now, just a console log or subtle effect could suffice.
        // Or dispatch a log event if it's a significant entity.
        if (entity.class || entity.id.includes('boss')) {
            const name = entity.class ? entity.class.toUpperCase() : (entity.id === 'void_boss' ? 'VAZIO' : 'OURO');
            // window.dispatchEvent(new CustomEvent('game-log', {
            //    detail: { message: `${name} pegou ${powerUp.type.toUpperCase()}!`, type: 'info' }
            // }));
        }

        // Visual Burst on Entity
        if (entity.createAuraBurst) {
            entity.createAuraBurst(parseInt(color.replace('#', '0x')));
        }
    }
}
