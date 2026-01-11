import * as THREE from 'three';
import { state, updateState } from '../core/State.js';

export class EnvironmentManager {
    constructor(scene) {
        this.scene = scene;
        this.hazards = [];
        this.spawnTimer = 0;
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
                const dist = entity.position.distanceTo(h.mesh.position);
                if (dist < h.radius) {
                    this.applyEffect(h, entity, delta);
                }
            });

            if (h.life <= 0) {
                this.scene.remove(h.mesh);
                this.hazards.splice(i, 1);
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
}
