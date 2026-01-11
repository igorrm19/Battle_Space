import * as THREE from 'three';
import { state } from '../core/State.js';
import { CONSTANTS } from '../data/Constants.js';
import { MathUtils } from '../utils/MathUtils.js';

export class NPC {
    constructor(scene, config) {
        this.scene = scene;
        this.id = config.id;
        this.faction = config.faction;
        this.class = config.class; // 'green', 'yellow', 'red', 'purple', 'brown'

        this.mesh = new THREE.Group();
        this.initModel();
        this.scene.add(this.mesh);

        // Physics
        this.position = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
        this.acceleration = new THREE.Vector3();
        this.maxSpeed = 0.08 + Math.random() * 0.02;
        this.maxForce = 0.02;
        if (isNaN(this.maxSpeed) || this.maxSpeed <= 0) this.maxSpeed = 0.1;
        if (isNaN(this.maxForce) || this.maxForce <= 0) this.maxForce = 0.02;
        this.targetPos = null;

        this.setInitialPosition(config.index || 0);

        // VFX State
        this.lightningLine = null;
        this.lightningExpiry = 0;
        this.fireParticles = [];
        this.isZombie = config.isZombie || false;
        this.masterId = config.masterId || null;
        this.trails = [];
        this.maxTrails = 10;
        this.trailTimer = 0;

        // Evolution
        this.level = Number(config.level) || 1;
        if (isNaN(this.level)) {
            console.error('NPC Level is NaN, defaulting to 1', config);
            this.level = 1;
        }
        this.xp = 0;
        this.maxXp = 100 * Math.pow(1.5, this.level - 1);
        this.baseScale = 1.0; // Fixed: Do not pre-calculate level scaling here

        // Level-based Stats
        this.stats = config.stats || {
            atk: 30 + (this.level * 10),
            def: 10 + (this.level * 5),
            eva: 0.1 + (this.level * 0.01),
            int: (['purple', 'blue', 'green'].includes(config.class) ? 20 : 5) + (this.level * 5) // New Intelligence Stat
        };
        this.maxHp = 500 + (this.level * 100);
        this.hp = config.hp !== undefined ? config.hp : this.maxHp;

        this.strategy = Math.random() > 0.5 ? 'aggressive' : 'farmer';
        if (this.class === 'pink') this.strategy = 'tactician';

        // Learning System
        this.battleTime = 0;
        this.learningTimer = 0;
    }

    initModel() {
        const color = this.isZombie ? 0x444444 : (CONSTANTS.NPC_COLORS[this.class] || 0xffffff);

        // Unique Geometries per Class
        let geo;
        switch (this.class) {
            case 'green': // Healer
                geo = new THREE.IcosahedronGeometry(0.2, 1);
                break;
            case 'yellow': // Lightning
                geo = new THREE.OctahedronGeometry(0.2, 0);
                break;
            case 'red': // Fire
                geo = new THREE.ConeGeometry(0.15, 0.4, 8);
                break;
            case 'purple': // Mage
                geo = new THREE.DodecahedronGeometry(0.2, 0);
                break;
            case 'brown': // Gravity
                geo = new THREE.BoxGeometry(0.25, 0.25, 0.25);
                break;
            case 'pink': // Leader
                geo = new THREE.CylinderGeometry(0.15, 0.15, 0.4, 8);
                break;
            case 'blue': // Ice
                geo = new THREE.TetrahedronGeometry(0.25, 0);
                break;
            case 'darkgreen': // Necro
                geo = new THREE.TorusKnotGeometry(0.12, 0.04, 64, 8);
                break;
            default:
                geo = new THREE.IcosahedronGeometry(0.2, 1);
        }

        const mat = new THREE.MeshPhysicalMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 1.0, // Reduced for better clarity
            roughness: 0.3,
            metalness: 0.7,
            flatShading: true // Better look for low poly shapes
        });
        this.body = new THREE.Mesh(geo, mat);
        this.mesh.add(this.body);

        // Faction Aura (Persistent Ring)
        const auraGeo = new THREE.RingGeometry(0.7, 0.9, 32);
        const auraMat = new THREE.MeshBasicMaterial({
            color: CONSTANTS.FACTION_COLORS[this.faction],
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide,
            depthWrite: false // Prevent z-fighting
        });
        this.aura = new THREE.Mesh(auraGeo, auraMat);
        this.aura.rotation.x = Math.PI / 2;
        this.aura.position.y = -0.7;
        this.mesh.add(this.aura);

        // Floating Particles
        this.particles = new THREE.Group();
        this.mesh.add(this.particles);
        for (let i = 0; i < 5; i++) {
            const pGeo = new THREE.SphereGeometry(0.1, 8, 8);
            const pMat = new THREE.MeshBasicMaterial({ color: color });
            const p = new THREE.Mesh(pGeo, pMat);
            p.position.set(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            );
            this.particles.add(p);
        }

        // Visual Field (FOV Ring)
        let fovRadius = 5 + (this.level * 1.0);
        if (isNaN(fovRadius) || fovRadius <= 0.2) fovRadius = 6; // Safety fallback
        const fovGeo = new THREE.RingGeometry(fovRadius - 0.2, fovRadius, 32);
        const fovMat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.15,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        this.fovRing = new THREE.Mesh(fovGeo, fovMat);
        this.fovRing.rotation.x = Math.PI / 2;
        this.fovRing.position.y = -0.6;
        this.mesh.add(this.fovRing);
    }

    setInitialPosition(index) {
        const angle = (index / 4) * Math.PI * 2;
        const radius = 15;
        let factionOffset = 0;
        if (this.faction === 'void') factionOffset = Math.PI * 0.6;
        if (this.faction === 'gold') factionOffset = Math.PI * 1.2;

        this.position.set(
            Math.cos(angle + factionOffset) * radius,
            1,
            Math.sin(angle + factionOffset) * radius
        );
        this.mesh.position.copy(this.position);
    }

    applyForce(force) {
        if (force && !isNaN(force.x) && !isNaN(force.y) && !isNaN(force.z)) {
            this.acceleration.add(force);
        }
    }

    seek(target) {
        const desired = target.clone().sub(this.position);
        desired.normalize().multiplyScalar(this.maxSpeed);
        const steer = desired.sub(this.velocity);
        steer.clampLength(0, this.maxForce);
        return steer;
    }

    separate(others, playerPos, monsterPos, goldBossPos) {
        const steer = new THREE.Vector3();
        let count = 0;
        const neighDist = 4.0;

        const allOthers = [...others];
        if (playerPos) allOthers.push({ position: playerPos });
        if (monsterPos) allOthers.push({ position: monsterPos, radius: 3.0 }); // Larger avoidance for monster
        if (goldBossPos) allOthers.push({ position: goldBossPos, radius: 3.0 }); // Larger avoidance for gold boss

        allOthers.forEach(other => {
            const d = this.position.distanceTo(other.position);
            const avoidanceDist = other.radius ? neighDist + other.radius : neighDist;

            if (d > 0.001 && d < avoidanceDist) {
                const diff = this.position.clone().sub(other.position);
                diff.normalize().divideScalar(d);
                steer.add(diff);
                count++;
            }
        });

        if (count > 0) {
            steer.divideScalar(count);
        }

        if (steer.length() > 0) {
            steer.normalize().multiplyScalar(this.maxSpeed).sub(this.velocity);
            steer.clampLength(0, this.maxForce * 3.0); // Even stronger separation
        }
        return steer;
    }

    wander() {
        // Randomly change wander angle
        if (Math.random() < 0.05) {
            this.wanderAngle = (this.wanderAngle || 0) + (Math.random() - 0.5) * 2.0;
        }
        const center = this.velocity.clone().normalize().multiplyScalar(2.0);
        const offset = new THREE.Vector3(Math.cos(this.wanderAngle || 0), 0, Math.sin(this.wanderAngle || 0));
        const force = center.add(offset).normalize().multiplyScalar(this.maxForce * 0.5);
        return force;
    }

    update(delta, others, playerPos, monsterPos, goldBossPos) {
        if (this.hp <= 0) return;
        if (!delta || delta <= 0 || isNaN(delta)) delta = 0.016; // Safety fallback for delta

        this.acceleration.set(0, 0, 0); // Reset acceleration each frame

        // Learning Logic: Learn every 10 seconds of survival
        this.battleTime += delta;
        this.learningTimer += delta;
        if (this.learningTimer >= 10) {
            this.learningTimer = 0;
            // Learn: Improve Intelligence and Evasion
            if (!this.stats.int) this.stats.int = 0;
            this.stats.int += 1; // Smarter
            this.stats.eva = Math.min(0.5, this.stats.eva + 0.005); // Harder to hit

            // Visual feedback for learning (Subtle blue pulse)
            // this.createAuraBurst(0x0000ff); // Optional, might be too noisy
        }

        // Flocking Behaviors
        const separation = this.separate(others, playerPos, monsterPos, goldBossPos);
        // Placeholder for align and cohesion, assuming they will be implemented later
        // For now, they return zero vectors or are not applied.
        const alignment = new THREE.Vector3(); // this.align(others);
        const cohesion = new THREE.Vector3(); // this.cohesion(others);

        this.applyForce(separation.multiplyScalar(1.5));
        this.applyForce(alignment);
        this.applyForce(cohesion);

        if (this.targetPos) {
            const seek = this.seek(this.targetPos);
            this.applyForce(seek);

            if (this.position.distanceTo(this.targetPos) < 5) {
                this.targetPos = null;
            }
        } else {
            // Healer AI: Flee from enemies
            if (this.class === 'green') {
                const nearestEnemy = others.find(n => n.faction !== this.faction && this.position.distanceTo(n.position) < 8);
                if (nearestEnemy) {
                    const fleeDir = this.position.clone().sub(nearestEnemy.position).normalize();
                    this.targetPos = this.position.clone().add(fleeDir.multiplyScalar(10));
                }
            }

            // Default Wander
            this.applyForce(this.wander());
        }

        // Zombie AI: Follow Master
        if (this.isZombie && this.masterId) {
            const master = others.find(n => n.id === this.masterId);
            if (master) {
                const distToMaster = this.position.distanceTo(master.position);
                if (distToMaster > 5) {
                    const followDir = master.position.clone().sub(this.position).normalize();
                    this.applyForce(followDir.multiplyScalar(this.maxForce));
                }
            }
        }

        // Update Physics (FOR ALL NPCs)
        this.velocity.add(this.acceleration);
        this.velocity.clampLength(0, this.maxSpeed);
        this.position.add(this.velocity);

        // NaN Safety Check
        if (isNaN(this.position.x) || isNaN(this.position.y) || isNaN(this.position.z)) {
            this.position.set(0, 1, 0); // Reset to center
            this.velocity.set(0, 0, 0);
            this.acceleration.set(0, 0, 0);
        }

        // Boundary Check (Simple box)
        const bound = 45;
        this.position.x = THREE.MathUtils.clamp(this.position.x, -bound, bound);
        this.position.z = THREE.MathUtils.clamp(this.position.z, -bound, bound);

        this.mesh.position.copy(this.position);

        // Growth Scaling (Clamped)
        let targetScale = this.baseScale + (this.level - 1) * 0.05;
        targetScale = Math.min(targetScale, 3.0);
        this.mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);

        // Visual Animations
        this.body.rotation.y += delta;
        this.body.position.y = Math.sin(Date.now() * 0.002) * 0.2;
        this.aura.rotation.z += delta * 0.5;
        this.aura.scale.setScalar(1 + Math.sin(Date.now() * 0.005) * 0.1);

        this.particles.children.forEach((p, i) => {
            p.position.y += Math.sin(Date.now() * 0.001 + i) * 0.01;
            p.rotation.x += delta;
        });

        // Update FOV Ring Visual
        const fovScale = (this.class === 'purple') ? 20 : 1;
        this.fovRing.scale.setScalar(fovScale);
        this.fovRing.material.opacity = (this.class === 'purple') ? 0.05 : 0.15;

        // Update VFX
        this.updateVFX(delta);

        // --- Advanced Graphics: Motion Trails ---
        this.trailTimer += delta;
        if (this.velocity.length() > 0.05 && this.trailTimer > 0.1) {
            this.createTrail();
            this.trailTimer = 0;
        }
        this.updateTrails(delta);

        // --- Advanced Graphics: Low HP Visuals ---
        if (this.hp < this.maxHp * 0.25) {
            if (Math.random() > 0.8) this.createSmokeBurst(0x555555);
            this.body.material.emissiveIntensity = 2 + Math.sin(Date.now() * 0.01) * 2;
        }

        if (window.debugNPCs && this.id.includes('aliado_1')) {
            console.log(`NPC ${this.id}: Pos(${this.position.x.toFixed(2)}, ${this.position.z.toFixed(2)}) Vel(${this.velocity.length().toFixed(3)}) Acc(${this.acceleration.length().toFixed(3)}) Delta(${delta})`);
        }
    }

    performAttack(targetPos) {
        const originalPos = this.mesh.position.clone();
        const dir = targetPos.clone().sub(this.mesh.position).normalize();

        // Visual lunge
        this.mesh.position.add(dir.multiplyScalar(2));
        setTimeout(() => this.mesh.position.copy(originalPos), 200);
    }

    performAbility(type, targetPos) {
        if (type === 'heal') {
            this.body.material.emissiveIntensity = 10;
            this.createAuraBurst(0x00ff00);
            setTimeout(() => this.body.material.emissiveIntensity = 2, 500);
        } else if (type === 'lightning') {
            this.createLightning(targetPos);
        } else if (type === 'fire') {
            this.createFire(targetPos);
        } else if (type === 'gravity') {
            this.createGravityWave();
            if (targetPos) this.createGravityWell(targetPos);
        } else if (type === 'teleport') {
            this.teleport();
        } else if (type === 'void') {
            this.createVoidOrbe(targetPos);
        } else if (type === 'freeze') {
            this.createIceShards(targetPos);
            this.createFreezeAura();
        } else if (type === 'convert') {
            this.body.material.emissiveIntensity = 30;
            this.mesh.scale.setScalar(1.5);
            this.createAuraBurst(0xff00ff); // Pink burst
            setTimeout(() => {
                this.body.material.emissiveIntensity = 1.0;
                this.mesh.scale.setScalar(1.0);
            }, 500);
        } else if (type === 'zombie') {
            this.body.material.color.setHex(0x444444);
            this.body.material.emissive.setHex(0x00ff00);
            this.body.material.emissiveIntensity = 20;
            this.createSmokeBurst(0x00ff00); // Green smoke
            setTimeout(() => this.body.material.emissiveIntensity = 1.0, 500);
        }
    }

    teleport() {
        this.createAuraBurst(0xaa00ff);
        const range = 40;
        this.position.set(
            (Math.random() - 0.5) * range,
            1,
            (Math.random() - 0.5) * range
        );
        this.mesh.position.copy(this.position);
        this.createAuraBurst(0xaa00ff);
        this.body.material.emissiveIntensity = 50;
        setTimeout(() => this.body.material.emissiveIntensity = 1.0, 100);
    }

    gainXp(amount) {
        this.xp += amount;
        if (this.xp >= this.maxXp) {
            this.xp -= this.maxXp;
            this.level = Math.min(50, this.level + 1);
            this.maxXp *= 1.5;
            this.maxHp += 100;
            this.hp = this.maxHp;
            this.stats.atk += 10;
            this.stats.def += 5;
            this.stats.eva += 0.01;

            // Visual level up
            this.createAuraBurst(0xffffff);
            this.body.scale.multiplyScalar(1.2);
            setTimeout(() => this.body.scale.setScalar(1), 500);

            // Log Event
            window.dispatchEvent(new CustomEvent('game-log', {
                detail: { message: `${this.class.toUpperCase()} alcançou o Nível ${this.level}!`, type: 'levelup' }
            }));
        }
    }

    createLightning(targetPos) {
        if (!targetPos) return;
        for (let i = 0; i < 5; i++) { // Increased bolts
            const points = [];
            let current = this.position.clone().add(new THREE.Vector3(0, 1, 0));
            points.push(current.clone());
            const segments = 12; // More segments for jagged look
            const step = targetPos.clone().sub(current).divideScalar(segments);
            for (let j = 1; j < segments; j++) {
                const p = current.clone().add(step.clone().multiplyScalar(j));
                p.x += (Math.random() - 0.5) * 1.5; // More jitter
                p.y += (Math.random() - 0.5) * 1.5;
                p.z += (Math.random() - 0.5) * 1.5;
                points.push(p);
            }
            points.push(targetPos.clone());
            const curve = new THREE.CatmullRomCurve3(points);
            const geo = new THREE.TubeGeometry(curve, 20, 0.05, 8, false);
            const mat = new THREE.MeshBasicMaterial({ color: 0xffffaa, transparent: true, opacity: 1 }); // Brighter color
            const bolt = new THREE.Mesh(geo, mat);
            this.scene.add(bolt);
            let life = 1.0;
            const animate = () => {
                life -= 0.1; // Faster fade
                bolt.material.opacity = life;
                if (life > 0) requestAnimationFrame(animate);
                else {
                    bolt.geometry.dispose();
                    bolt.material.dispose();
                    this.scene.remove(bolt);
                }
            };
            animate();
        }
    }

    createFire(targetPos) {
        if (!targetPos) return;
        for (let i = 0; i < 25; i++) { // More particles
            const geo = new THREE.SphereGeometry(0.2 + Math.random() * 0.3, 8, 8);
            const mat = new THREE.MeshBasicMaterial({
                color: Math.random() > 0.3 ? 0xff4400 : 0xffff00, // More yellow for core
                transparent: true,
                opacity: 0.9
            });
            const p = new THREE.Mesh(geo, mat);
            p.position.copy(this.position);
            this.scene.add(p);
            const dir = targetPos.clone().sub(this.position).normalize();
            dir.x += (Math.random() - 0.5) * 0.6;
            dir.y += (Math.random() - 0.5) * 0.6;
            dir.z += (Math.random() - 0.5) * 0.6;
            let life = 1.0;
            const animate = () => {
                life -= 0.02;
                if (life > 0) {
                    p.position.add(dir.clone().multiplyScalar(0.7));
                    p.position.y += 0.02; // Rise effect
                    p.scale.setScalar(life);
                    p.material.opacity = life;
                    requestAnimationFrame(animate);
                } else {
                    p.geometry.dispose();
                    p.material.dispose();
                    this.scene.remove(p);
                }
            };
            animate();
        }
    }

    createGravityWave() {
        const geo = new THREE.TorusGeometry(1, 0.05, 16, 100);
        const mat = new THREE.MeshBasicMaterial({ color: 0x8b4513, transparent: true, opacity: 0.6 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(this.position);
        mesh.rotation.x = Math.PI / 2;
        this.scene.add(mesh);
        let life = 1.0;
        const animate = () => {
            life -= 0.02;
            if (life > 0) {
                mesh.scale.setScalar(1 + (1 - life) * 20);
                mesh.material.opacity = life * 0.6;
                requestAnimationFrame(animate);
            } else {
                mesh.geometry.dispose();
                mesh.material.dispose();
                this.scene.remove(mesh);
            }
        };
        animate();
    }

    createGravityWell(pos) {
        const geo = new THREE.SphereGeometry(2, 32, 32);
        const mat = new THREE.MeshPhongMaterial({ color: 0x000000, emissive: 0x4400ff, emissiveIntensity: 2, transparent: true, opacity: 0.5 });
        const well = new THREE.Mesh(geo, mat);
        well.position.copy(pos);
        this.scene.add(well);
        let life = 1.0;
        const animate = () => {
            life -= 0.01;
            if (life > 0) {
                well.scale.setScalar(Math.sin(Date.now() * 0.01) * 0.2 + 1);
                well.material.opacity = life * 0.5;
                requestAnimationFrame(animate);
            } else {
                well.geometry.dispose();
                well.material.dispose();
                this.scene.remove(well);
            }
        };
        animate();
    }

    createVoidOrbe(targetPos) {
        if (!targetPos) return;
        const geo = new THREE.SphereGeometry(0.8, 16, 16);
        const mat = new THREE.MeshPhongMaterial({ color: 0xaa00ff, emissive: 0xaa00ff, emissiveIntensity: 5, transparent: true, opacity: 0.8 });
        const orbe = new THREE.Mesh(geo, mat);
        orbe.position.copy(this.position);
        this.scene.add(orbe);
        const dir = targetPos.clone().sub(this.position).normalize();
        let life = 1.0;
        const animate = () => {
            life -= 0.01;
            if (life > 0) {
                orbe.position.add(dir.clone().multiplyScalar(0.4));
                orbe.scale.setScalar(1 + Math.sin(Date.now() * 0.01) * 0.2);
                orbe.material.opacity = life;
                requestAnimationFrame(animate);
            } else {
                orbe.geometry.dispose();
                orbe.material.dispose();
                this.scene.remove(orbe);
            }
        };
        animate();
    }

    createIceShards(targetPos) {
        if (!targetPos) return;
        for (let i = 0; i < 12; i++) {
            const geo = new THREE.ConeGeometry(0.2, 0.8, 4);
            const mat = new THREE.MeshPhongMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 2, transparent: true, opacity: 0.8 });
            const shard = new THREE.Mesh(geo, mat);
            shard.position.copy(this.position);
            shard.lookAt(targetPos);
            shard.rotateX(Math.PI / 2);
            this.scene.add(shard);
            const dir = targetPos.clone().sub(this.position).normalize();
            dir.x += (Math.random() - 0.5) * 0.3;
            dir.y += (Math.random() - 0.5) * 0.3;
            dir.z += (Math.random() - 0.5) * 0.3;
            let life = 1.0;
            const animate = () => {
                life -= 0.02;
                if (life > 0) {
                    shard.position.add(dir.clone().multiplyScalar(0.8));
                    shard.rotateY(0.2);
                    shard.material.opacity = life;
                    requestAnimationFrame(animate);
                } else {
                    shard.geometry.dispose();
                    shard.material.dispose();
                    this.scene.remove(shard);
                }
            };
            animate();
        }
    }

    createFreezeAura() {
        const geo = new THREE.TorusGeometry(2, 0.05, 16, 100);
        const mat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.5 });
        const ring = new THREE.Mesh(geo, mat);
        ring.rotation.x = Math.PI / 2;
        ring.position.copy(this.position);
        this.scene.add(ring);
        let scale = 1.0;
        const animate = () => {
            scale += 0.1;
            ring.scale.set(scale, scale, 1);
            ring.material.opacity -= 0.02;
            if (ring.material.opacity > 0) requestAnimationFrame(animate);
            else {
                ring.geometry.dispose();
                ring.material.dispose();
                this.scene.remove(ring);
            }
        };
        animate();
    }

    createAuraBurst(color) {
        const geo = new THREE.SphereGeometry(0.5, 16, 16);
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 });
        const burst = new THREE.Mesh(geo, mat);
        burst.position.copy(this.position);
        this.scene.add(burst);
        let life = 1.0;
        const animate = () => {
            life -= 0.05;
            if (life > 0) {
                burst.scale.setScalar(1 + (1 - life) * 10);
                burst.material.opacity = life * 0.8;
                requestAnimationFrame(animate);
            } else {
                burst.geometry.dispose();
                burst.material.dispose();
                this.scene.remove(burst);
            }
        };
        animate();
    }

    createSmokeBurst(color) {
        for (let i = 0; i < 15; i++) {
            const geo = new THREE.SphereGeometry(0.3, 8, 8);
            const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4 });
            const p = new THREE.Mesh(geo, mat);
            p.position.copy(this.position);
            p.position.y += (Math.random() - 0.5) * 1;
            this.scene.add(p);
            const vel = new THREE.Vector3((Math.random() - 0.5) * 0.1, Math.random() * 0.1, (Math.random() - 0.5) * 0.1);
            let life = 1.0;
            const animate = () => {
                life -= 0.02;
                if (life > 0) {
                    p.position.add(vel);
                    p.scale.addScalar(0.02);
                    p.material.opacity = life * 0.4;
                    requestAnimationFrame(animate);
                } else {
                    p.geometry.dispose();
                    p.material.dispose();
                    this.scene.remove(p);
                }
            };
            animate();
        }
    }

    createTrail() {
        const geo = this.body.geometry.clone();
        const mat = this.body.material.clone();
        mat.transparent = true;
        mat.opacity = 0.3;
        const trail = new THREE.Mesh(geo, mat);
        trail.position.copy(this.mesh.position);
        trail.rotation.copy(this.mesh.rotation);
        trail.scale.copy(this.mesh.scale);
        this.scene.add(trail);
        this.trails.push({ mesh: trail, life: 1.0 });
    }

    updateVFX(delta) {
        this.updateTrails(delta);
        // Add other continuous VFX updates here if needed
    }

    updateTrails(delta) {
        for (let i = this.trails.length - 1; i >= 0; i--) {
            const t = this.trails[i];
            t.life -= delta * 2;
            t.mesh.material.opacity = t.life * 0.3;
            if (t.life <= 0) {
                this.scene.remove(t.mesh);
                this.trails.splice(i, 1);
            }
        }
    }

    destroy() {
        this.scene.remove(this.mesh);
        if (this.lightningLine) { this.scene.remove(this.lightningLine); }
    }
}
