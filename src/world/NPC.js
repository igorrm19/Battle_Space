import * as THREE from 'three';
import { state } from '../core/State.js';
import { CONSTANTS } from '../data/Constants.js';
import { MathUtils } from '../utils/MathUtils.js';
import { GAME_RULES } from '../data/GameRules.js';
import { StatRules } from '../game/rules/StatRules.js';

export class NPC {
    constructor(scene, config) {
        this.scene = scene;
        this.id = config.id;
        this.faction = config.faction;
        this.class = config.class; // 'green', 'yellow', 'red', 'purple', 'brown'

        this.mesh = new THREE.Group();
        this.initModel();
        // Tag mesh with ID for instance lookups (used by abilities)
        this.mesh.name = this.id;
        this.mesh.userData = this.mesh.userData || {};
        this.mesh.userData.npcId = this.id;
        this.scene.add(this.mesh);

        // Physics
        this.position = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
        this.acceleration = new THREE.Vector3();
        
        // Yellow NPC has much higher speed
        if (this.class === 'yellow') {
            this.maxSpeed = GAME_RULES.YELLOW_BASE_SPEED + Math.random() * 0.02;
            this.baseMaxSpeed = this.maxSpeed;
        } else {
            this.maxSpeed = 0.08 + Math.random() * 0.02;
        }
        this.maxForce = 0.02;
        if (isNaN(this.maxSpeed) || this.maxSpeed <= 0) this.maxSpeed = 0.1;
        if (isNaN(this.maxForce) || this.maxForce <= 0) this.maxForce = 0.02;
        this.targetPos = null;
        
        // Yellow NPC specific: Momentum system
        if (this.class === 'yellow') {
            this.momentum = 1.0;
            this.lastPosition = new THREE.Vector3();
            this.totalDistanceTraveled = 0;
            this.isCharging = false;
            this.energy = GAME_RULES.YELLOW_BASE_ENERGY + (this.level * GAME_RULES.YELLOW_ENERGY_PER_LEVEL);
            this.maxEnergy = this.energy;
        }

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
        this.maxXp = StatRules.calculateMaxXP(this.level, this.class);
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
        let fovRadius;
        if (this.class === 'yellow') {
            // Yellow NPC has reduced FOV, but increases when charging
            fovRadius = this.isCharging ? GAME_RULES.YELLOW_CHARGE_FOV : GAME_RULES.YELLOW_BASE_FOV;
        } else {
            fovRadius = 5 + (this.level * 1.0);
        }
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

        // Freeze prevents movement
        if (this.statusEffects?.includes('freeze')) {
            this.velocity.set(0, 0, 0);
            this.acceleration.set(0, 0, 0);
            this.mesh.position.copy(this.position);
            // Still update visual animations and VFX
            this.updateVFX(delta);
            return;
        }

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

        // Yellow NPC specific: Momentum, Charge and Energy system
        if (this.class === 'yellow') {
            // Calculate distance traveled
            if (this.lastPosition) {
                const distance = this.position.distanceTo(this.lastPosition);
                this.totalDistanceTraveled += distance;
                
                // Increase momentum based on distance traveled
                if (distance > 0.001) {
                    this.momentum = Math.min(
                        GAME_RULES.YELLOW_MOMENTUM_MAX,
                        this.momentum + (distance * GAME_RULES.YELLOW_MOMENTUM_GAIN)
                    );
                }
            }
            this.lastPosition = this.position.clone();
            
            // Momentum decay
            this.momentum *= GAME_RULES.YELLOW_MOMENTUM_DECAY;
            if (this.momentum < 1.0) this.momentum = 1.0;
            
            // Apply momentum to speed
            this.maxSpeed = this.baseMaxSpeed * this.momentum;
            
            // Energy system
            if (!this.isCharging) {
                // Energy drains over time
                this.energy = Math.max(0, this.energy - (GAME_RULES.YELLOW_ENERGY_DRAIN * delta));
                
                // Recharge energy when at high speed or if moving for a while
                if (this.velocity.length() > GAME_RULES.YELLOW_MIN_MOVEMENT_TO_RECHARGE) {
                    this.energy = Math.min(
                        this.maxEnergy,
                        this.energy + (GAME_RULES.YELLOW_ENERGY_RECHARGE_SPEED * delta)
                    );
                }
            } else {
                // While charging, lock movement slightly and increment timer
                this.acceleration.multiplyScalar(0.1);
                this.velocity.multiplyScalar(0.98);
                this.chargeTimer += delta;
                if (this.chargeTimer >= GAME_RULES.YELLOW_CHARGE_TIME) {
                    this.completeCharge();
                }
            }
            
            // Update FOV based on charging state
            const fovRadius = this.isCharging ? GAME_RULES.YELLOW_CHARGE_FOV : GAME_RULES.YELLOW_BASE_FOV;
            this.fovRing.scale.setScalar(fovRadius);
            
            // Visual effect for high momentum (yellow/lightning aura)
            if (this.momentum > 1.5) {
                const intensity = 1 + (this.momentum - 1.0) * 0.5;
                this.body.material.emissiveIntensity = intensity * 3;
                this.body.material.emissive.setHex(0xffff00);
            } else {
                if (!this.isCharging) {
                    this.body.material.emissiveIntensity = 1.0;
                    this.body.material.emissive.setHex(CONSTANTS.NPC_COLORS.yellow);
                }
            }

            // Collision Ram Damage: deal damage if colliding at high speed
            if (!this._ramTimestamps) this._ramTimestamps = {};
            const ramThreshold = 0.08;
            const collisionRange = 1.2;
            if (this.velocity.length() > ramThreshold) {
                others.forEach(o => {
                    if (o.id === this.id || o.hp <= 0) return;
                    const d = this.position.distanceTo(o.position || new THREE.Vector3());
                    if (d < collisionRange) {
                        const last = this._ramTimestamps[o.id] || 0;
                        const now = Date.now();
                        if (now - last > 1000) { // 1s cooldown per target
                            this._ramTimestamps[o.id] = now;
                            const dmg = this.velocity.length() * GAME_RULES.YELLOW_COLLISION_SPEED_DAMAGE_MULTIPLIER * (this.stats?.atk || 30);
                            dealDamage(o.id, dmg, false, []);
                            // Knockback: push other away
                            const dir = o.position ? o.position.clone().sub(this.position).normalize() : new THREE.Vector3(0,0,1);
                            // Attempt to apply force to instance if available
                            const inst = this.scene.children.find(c => c.id === o.id);
                            if (inst && inst.applyForce) inst.applyForce(dir.multiplyScalar(0.5));
                        }
                    }
                });
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
        const oldPos = this.position.clone();
        
        // Departure effect - swirling particles (performance optimized)
        const teleportParticles = CONSTANTS.VFX.MAX_TELEPORT_PARTICLES;
        for (let i = 0; i < teleportParticles; i++) {
            const particleGeo = new THREE.SphereGeometry(0.08, 8, 8);
            const particleMat = new THREE.MeshBasicMaterial({
                color: 0xaa00ff,
                emissive: 0xff00ff,
                emissiveIntensity: 3,
                transparent: true,
                opacity: 1
            });
            const particle = new THREE.Mesh(particleGeo, particleMat);
            particle.position.copy(oldPos);
            particle.position.add(new THREE.Vector3(
                (Math.random() - 0.5) * 1.5,
                (Math.random() - 0.5) * 1.5,
                (Math.random() - 0.5) * 1.5
            ));
            this.scene.add(particle);
            
            const angle = (i / teleportParticles) * Math.PI * 2;
            const radius = 0.5;
            let particleLife = 0.8;
            const particleAnimate = () => {
                particleLife -= 0.04;
                if (particleLife > 0) {
                    const currentAngle = angle + (1 - particleLife) * Math.PI * 4;
                    particle.position.set(
                        oldPos.x + Math.cos(currentAngle) * radius * (1 - particleLife) * 3,
                        oldPos.y + (1 - particleLife) * 2,
                        oldPos.z + Math.sin(currentAngle) * radius * (1 - particleLife) * 3
                    );
                    particle.scale.setScalar(1 + (1 - particleLife) * 2);
                    particle.material.opacity = particleLife;
                    requestAnimationFrame(particleAnimate);
                } else {
                    particle.geometry.dispose();
                    particle.material.dispose();
                    this.scene.remove(particle);
                }
            };
            particleAnimate();
        }
        
        // Departure burst
        this.createAuraBurst(0xaa00ff);
        
        // Teleport to new position
        const range = 40;
        const newPos = new THREE.Vector3(
            (Math.random() - 0.5) * range,
            1,
            (Math.random() - 0.5) * range
        );
        this.position.copy(newPos);
        this.mesh.position.copy(newPos);
        
        // Arrival effect - burst and particles
        setTimeout(() => {
            this.createAuraBurst(0xaa00ff);
            
            // Arrival particles (performance optimized)
            for (let i = 0; i < teleportParticles; i++) {
                const particleGeo = new THREE.SphereGeometry(0.08, 8, 8);
                const particleMat = new THREE.MeshBasicMaterial({
                    color: 0xaa00ff,
                    emissive: 0xff00ff,
                    emissiveIntensity: 3,
                    transparent: true,
                    opacity: 1
                });
                const particle = new THREE.Mesh(particleGeo, particleMat);
                particle.position.copy(newPos);
                this.scene.add(particle);
                
                const dir = new THREE.Vector3(
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 2
                ).normalize();
                let particleLife = 0.6;
                const particleAnimate = () => {
                    particleLife -= 0.05;
                    if (particleLife > 0) {
                        particle.position.add(dir.clone().multiplyScalar(0.4));
                        particle.scale.setScalar(1 + (1 - particleLife) * 3);
                        particle.material.opacity = particleLife;
                        requestAnimationFrame(particleAnimate);
                    } else {
                        particle.geometry.dispose();
                        particle.material.dispose();
                        this.scene.remove(particle);
                    }
                };
                particleAnimate();
            }
        }, 100);
        
        this.body.material.emissiveIntensity = 50;
        setTimeout(() => this.body.material.emissiveIntensity = 1.0, 200);
    }

    gainXp(amount) {
        this.xp += amount;
        if (this.xp >= this.maxXp) {
            this.xp -= this.maxXp;
            this.level = Math.min(GAME_RULES.MAX_NPC_LEVEL, this.level + 1);
            this.maxXp = StatRules.calculateMaxXP(this.level, this.class);
            
            // Update yellow NPC energy when leveling up
            if (this.class === 'yellow') {
                this.maxEnergy = GAME_RULES.YELLOW_BASE_ENERGY + (this.level * GAME_RULES.YELLOW_ENERGY_PER_LEVEL);
                this.energy = this.maxEnergy; // Refill energy on level up
            }
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
            const npcName = this.class ? this.class.toUpperCase() : this.id.toUpperCase();
            window.dispatchEvent(new CustomEvent('game-log', {
                detail: { 
                    message: `${npcName} alcançou o Nível ${this.level}!`, 
                    type: 'levelup',
                    data: {
                        npcName: npcName,
                        newLevel: this.level
                    }
                }
            }));
        }
    }

    createLightning(targetPos) {
        if (!targetPos) return;
        const startPos = this.position.clone().add(new THREE.Vector3(0, 1, 0));
        
        // Create main lightning bolts (performance optimized)
        const boltCount = CONSTANTS.VFX.MAX_LIGHTNING_BOLTS;
        for (let i = 0; i < boltCount; i++) {
            const points = [];
            points.push(startPos.clone());
            const segments = 20; // More segments for smoother but jagged look
            const step = targetPos.clone().sub(startPos).divideScalar(segments);
            for (let j = 1; j < segments; j++) {
                const p = startPos.clone().add(step.clone().multiplyScalar(j));
                const jitter = (1 - j / segments) * 2.5; // Less jitter near target
                p.x += (Math.random() - 0.5) * jitter;
                p.y += (Math.random() - 0.5) * jitter;
                p.z += (Math.random() - 0.5) * jitter;
                points.push(p);
            }
            points.push(targetPos.clone());
            
            const curve = new THREE.CatmullRomCurve3(points);
            const thickness = 0.08 + Math.random() * 0.04;
            const geo = new THREE.TubeGeometry(curve, 32, thickness, 8, false);
            
            // Brighter, more electric color with emissive
            const mat = new THREE.MeshBasicMaterial({ 
                color: 0xffff00,
                emissive: 0xffff66,
                emissiveIntensity: 3.0,
                transparent: true, 
                opacity: 1 
            });
            const bolt = new THREE.Mesh(geo, mat);
            this.scene.add(bolt);
            
            let life = 0.3; // Faster, more flash-like
            const animate = () => {
                life -= 0.15;
                if (life > 0) {
                    bolt.material.opacity = life;
                    bolt.material.emissiveIntensity = life * 3;
                    requestAnimationFrame(animate);
                } else {
                    bolt.geometry.dispose();
                    bolt.material.dispose();
                    this.scene.remove(bolt);
                }
            };
            animate();
        }
        
        // Add glowing particles at impact point (performance optimized)
        const particleCount = CONSTANTS.VFX.MAX_LIGHTNING_PARTICLES;
        for (let i = 0; i < particleCount; i++) {
            const geo = new THREE.SphereGeometry(0.15, 8, 8);
            const mat = new THREE.MeshBasicMaterial({ 
                color: 0xffffff,
                emissive: 0xffff00,
                emissiveIntensity: 3,
                transparent: true, 
                opacity: 1 
            });
            const particle = new THREE.Mesh(geo, mat);
            particle.position.copy(targetPos);
            particle.position.add(new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            ));
            this.scene.add(particle);
            
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.3,
                (Math.random() - 0.5) * 0.3,
                (Math.random() - 0.5) * 0.3
            );
            let life = 1.0;
            const animate = () => {
                life -= 0.08;
                if (life > 0) {
                    particle.position.add(velocity);
                    particle.scale.setScalar(life);
                    particle.material.opacity = life;
                    requestAnimationFrame(animate);
                } else {
                    particle.geometry.dispose();
                    particle.material.dispose();
                    this.scene.remove(particle);
                }
            };
            animate();
        }
        
        // Add electric glow sphere at impact
        const glowGeo = new THREE.SphereGeometry(1.5, 16, 16);
        const glowMat = new THREE.MeshBasicMaterial({ 
            color: 0xffffaa,
            transparent: true, 
            opacity: 0.6 
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.copy(targetPos);
        this.scene.add(glow);
        let glowLife = 0.5;
        const animateGlow = () => {
            glowLife -= 0.1;
            if (glowLife > 0) {
                glow.scale.setScalar(1 + (0.5 - glowLife) * 2);
                glow.material.opacity = glowLife * 0.6;
                requestAnimationFrame(animateGlow);
            } else {
                glow.geometry.dispose();
                glow.material.dispose();
                this.scene.remove(glow);
            }
        };
        animateGlow();
    }

    /** Begin charging lightning for a specific target or multi-target */
    beginCharge(targetId = null, type = 'single', targetInstance = null) {
        if (this.isCharging) return;
        this.isCharging = true;
        this.chargeTimer = 0;
        this.chargeType = type; // 'single' | 'multi'
        this.chargeTargetId = targetId;
        this.chargeTargetInstance = targetInstance || null;
        // Visual feedback for charging
        this.body.material.emissive.setHex(0xffff00);
        this.body.material.emissiveIntensity = 10;
        // Expand fov visually
        this.fovRing.scale.setScalar(GAME_RULES.YELLOW_CHARGE_FOV);
    }

    /** Apply slow to a target instance and schedule revert */
    applySlowToInstance(targetInstance, slowMultiplier, durationMs) {
        if (!targetInstance) return;
        if (!targetInstance._originalMaxSpeed) targetInstance._originalMaxSpeed = targetInstance.maxSpeed || 0.1;
        // If already slowed, refresh timer
        if (targetInstance._slowTimeout) clearTimeout(targetInstance._slowTimeout);
        targetInstance.maxSpeed = (targetInstance._originalMaxSpeed || 0.1) * slowMultiplier;
        targetInstance._isSlowed = true;
        targetInstance._slowTimeout = setTimeout(() => {
            targetInstance.maxSpeed = targetInstance._originalMaxSpeed || targetInstance.maxSpeed;
            targetInstance._isSlowed = false;
            targetInstance._slowTimeout = null;
        }, durationMs);
    }

    /** Complete a charge and fire single or multi lightning */
    completeCharge() {
        // Require energy to fire
        const type = this.chargeType || 'single';
        if (type === 'single') {
            if (this.energy < GAME_RULES.YELLOW_CHARGE_COST_SINGLE) {
                // Not enough energy: abort
                this.isCharging = false;
                this.chargeTimer = 0;
                this.body.material.emissiveIntensity = 1;
                this.fovRing.scale.setScalar(GAME_RULES.YELLOW_BASE_FOV);
                return;
            }
            this.energy = Math.max(0, this.energy - GAME_RULES.YELLOW_CHARGE_COST_SINGLE);

            // Resolve target position
            let targetPos = null;
            let targetId = this.chargeTargetId;
            let targetInst = this.chargeTargetInstance;
            if (targetInst && targetInst.position) targetPos = targetInst.position.clone();
            else if (targetId) {
                // Try to find in state.npcs
                const t = state.npcs.find(n => n.id === targetId);
                if (t && t.position) targetPos = t.position.clone();
            }

            if (targetPos) {
                this.createLightning(targetPos);
                // Apply damage and slow to the target via Combat
                if (targetId) {
                    dealDamage(targetId, GAME_RULES.YELLOW_SINGLE_DAMAGE, false, []);
                    if (targetInst) this.applySlowToInstance(targetInst, GAME_RULES.YELLOW_SINGLE_SLOW_AMOUNT, GAME_RULES.YELLOW_SINGLE_SLOW_DURATION);
                }
            }
        } else { // multi
            if (this.energy < GAME_RULES.YELLOW_CHARGE_COST_MULTI) {
                this.isCharging = false;
                this.chargeTimer = 0;
                this.body.material.emissiveIntensity = 1;
                this.fovRing.scale.setScalar(GAME_RULES.YELLOW_BASE_FOV);
                return;
            }
            this.energy = Math.max(0, this.energy - GAME_RULES.YELLOW_CHARGE_COST_MULTI);

            // Find nearby enemies to target
            const enemies = state.npcs.filter(n => n.faction !== this.faction && n.hp > 0);
            // Sort by distance to this NPC instance (we have position)
            enemies.sort((a, b) => {
                const aPos = a.position || new THREE.Vector3();
                const bPos = b.position || new THREE.Vector3();
                const da = this.position.distanceTo(aPos);
                const db = this.position.distanceTo(bPos);
                return da - db;
            });

            const count = Math.min(GAME_RULES.YELLOW_MULTI_COUNT, enemies.length);
            for (let i = 0; i < count; i++) {
                const e = enemies[i];
                const pos = e.position ? e.position.clone() : this.position.clone();
                this.createLightning(pos);
                // Apply damage and slow
                dealDamage(e.id, GAME_RULES.YELLOW_MULTI_DAMAGE, false, []);
                // Try to find instance in scene to apply slow visual
                const inst = this.scene.children.find(c => c.id === e.id);
                if (inst) this.applySlowToInstance(inst, GAME_RULES.YELLOW_MULTI_SLOW_AMOUNT, GAME_RULES.YELLOW_MULTI_SLOW_DURATION);
            }
        }

        // Reset charging visuals
        this.isCharging = false;
        this.chargeTimer = 0;
        this.chargeType = null;
        this.chargeTargetId = null;
        this.chargeTargetInstance = null;
        this.body.material.emissiveIntensity = 1;
        this.fovRing.scale.setScalar(GAME_RULES.YELLOW_BASE_FOV);
    }

    /** Create multi-target lightning (wrapper, optional use) */
    createMultiLightning(targetPositions) {
        if (!Array.isArray(targetPositions)) return;
        targetPositions.forEach(pos => this.createLightning(pos));
    }

    createFire(targetPos) {
        if (!targetPos) return;
        const startPos = this.position.clone();
        const dir = targetPos.clone().sub(startPos).normalize();
        const distance = startPos.distanceTo(targetPos);
        
        // Create fireball with trail
        const fireballGeo = new THREE.SphereGeometry(0.5, 16, 16);
        const fireballMat = new THREE.MeshBasicMaterial({
            color: 0xff8800,
            emissive: 0xff4400,
            emissiveIntensity: 3,
            transparent: true,
            opacity: 1
        });
        const fireball = new THREE.Mesh(fireballGeo, fireballMat);
        fireball.position.copy(startPos);
        this.scene.add(fireball);
        
        // Animate fireball trajectory
        let fireballLife = distance / 0.8;
        const fireballAnimate = () => {
            fireballLife -= 0.016;
            if (fireballLife > 0) {
                const progress = 1 - (fireballLife / (distance / 0.8));
                fireball.position.lerpVectors(startPos, targetPos, progress);
                
                // Add trailing particles
                if (Math.random() > 0.7) {
                    const trailGeo = new THREE.SphereGeometry(0.1, 8, 8);
                    const trailMat = new THREE.MeshBasicMaterial({
                        color: 0xff4400,
                        emissive: 0xff8800,
                        emissiveIntensity: 2,
                        transparent: true,
                        opacity: 0.8
                    });
                    const trail = new THREE.Mesh(trailGeo, trailMat);
                    trail.position.copy(fireball.position);
                    this.scene.add(trail);
                    let trailLife = 0.5;
                    const trailAnimate = () => {
                        trailLife -= 0.03;
                        if (trailLife > 0) {
                            trail.scale.setScalar(1 + (0.5 - trailLife) * 2);
                            trail.material.opacity = trailLife;
                            requestAnimationFrame(trailAnimate);
                        } else {
                            trail.geometry.dispose();
                            trail.material.dispose();
                            this.scene.remove(trail);
                        }
                    };
                    trailAnimate();
                }
                requestAnimationFrame(fireballAnimate);
            } else {
                // Explosion effect at impact (performance optimized)
                const explosionParticles = CONSTANTS.VFX.MAX_FIRE_PARTICLES;
                for (let i = 0; i < explosionParticles; i++) {
                    const geo = new THREE.SphereGeometry(0.15 + Math.random() * 0.25, 8, 8);
                    const color = Math.random() > 0.5 ? 
                        (Math.random() > 0.5 ? 0xff4400 : 0xffff00) : 
                        (Math.random() > 0.5 ? 0xff0000 : 0xff8800);
                    const mat = new THREE.MeshBasicMaterial({
                        color: color,
                        emissive: color,
                        emissiveIntensity: 2,
                        transparent: true,
                        opacity: 1
                    });
                    const p = new THREE.Mesh(geo, mat);
                    p.position.copy(targetPos);
                    this.scene.add(p);
                    const expDir = new THREE.Vector3(
                        (Math.random() - 0.5) * 2,
                        Math.random() * 1.5,
                        (Math.random() - 0.5) * 2
                    ).normalize();
                    let life = 1.0;
                    const animate = () => {
                        life -= 0.025;
                        if (life > 0) {
                            p.position.add(expDir.clone().multiplyScalar(0.6));
                            p.position.y -= 0.01; // Gravity effect
                            p.scale.setScalar(1 + (1 - life) * 1.5);
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
                
                // Smoke cloud (performance optimized)
                const smokeParticles = CONSTANTS.VFX.MAX_FIRE_SMOKE;
                for (let i = 0; i < smokeParticles; i++) {
                    const smokeGeo = new THREE.SphereGeometry(0.2 + Math.random() * 0.3, 8, 8);
                    const smokeMat = new THREE.MeshBasicMaterial({
                        color: 0x333333,
                        transparent: true,
                        opacity: 0.4
                    });
                    const smoke = new THREE.Mesh(smokeGeo, smokeMat);
                    smoke.position.copy(targetPos);
                    smoke.position.add(new THREE.Vector3(
                        (Math.random() - 0.5) * 3,
                        Math.random() * 2,
                        (Math.random() - 0.5) * 3
                    ));
                    this.scene.add(smoke);
                    const smokeVel = new THREE.Vector3(
                        (Math.random() - 0.5) * 0.1,
                        Math.random() * 0.15 + 0.05,
                        (Math.random() - 0.5) * 0.1
                    );
                    let smokeLife = 1.5;
                    const smokeAnimate = () => {
                        smokeLife -= 0.015;
                        if (smokeLife > 0) {
                            smoke.position.add(smokeVel);
                            smoke.scale.addScalar(0.03);
                            smoke.material.opacity = smokeLife * 0.4;
                            requestAnimationFrame(smokeAnimate);
                        } else {
                            smoke.geometry.dispose();
                            smoke.material.dispose();
                            this.scene.remove(smoke);
                        }
                    };
                    smokeAnimate();
                }
                
                // Explosion glow
                const expGlowGeo = new THREE.SphereGeometry(2, 16, 16);
                const expGlowMat = new THREE.MeshBasicMaterial({
                    color: 0xff4400,
                    transparent: true,
                    opacity: 0.8
                });
                const expGlow = new THREE.Mesh(expGlowGeo, expGlowMat);
                expGlow.position.copy(targetPos);
                this.scene.add(expGlow);
                let expGlowLife = 0.6;
                const expGlowAnimate = () => {
                    expGlowLife -= 0.1;
                    if (expGlowLife > 0) {
                        expGlow.scale.setScalar(1 + (0.6 - expGlowLife) * 2);
                        expGlow.material.opacity = expGlowLife * 0.8;
                        requestAnimationFrame(expGlowAnimate);
                    } else {
                        expGlow.geometry.dispose();
                        expGlow.material.dispose();
                        this.scene.remove(expGlow);
                    }
                };
                expGlowAnimate();
                
                fireball.geometry.dispose();
                fireball.material.dispose();
                this.scene.remove(fireball);
            }
        };
        fireballAnimate();
    }

    createGravityWave() {
        // Multiple expanding rings for more impact
        for (let ring = 0; ring < 3; ring++) {
            const geo = new THREE.TorusGeometry(1 + ring * 0.3, 0.08, 32, 100);
            const mat = new THREE.MeshBasicMaterial({ 
                color: 0x8b4513,
                emissive: 0x4400aa,
                emissiveIntensity: 1.5,
                transparent: true, 
                opacity: 0.8 
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(this.position);
            mesh.rotation.x = Math.PI / 2;
            this.scene.add(mesh);
            let life = 1.0;
            const delay = ring * 0.05;
            const animate = () => {
                life -= 0.015;
                if (life > 0) {
                    const scale = 1 + (1 - life) * 25;
                    mesh.scale.setScalar(scale);
                    mesh.material.opacity = life * 0.8;
                    mesh.material.emissiveIntensity = life * 1.5;
                    requestAnimationFrame(animate);
                } else {
                    mesh.geometry.dispose();
                    mesh.material.dispose();
                    this.scene.remove(mesh);
                }
            };
            setTimeout(() => animate(), delay * 1000);
        }
    }

    createGravityWell(pos) {
        // Enhanced gravity well with multiple layers
        // Core black hole
        const coreGeo = new THREE.SphereGeometry(1.5, 32, 32);
        const coreMat = new THREE.MeshPhongMaterial({ 
            color: 0x000000, 
            emissive: 0x220044,
            emissiveIntensity: 3,
            transparent: true, 
            opacity: 0.9 
        });
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.position.copy(pos);
        this.scene.add(core);
        
        // Outer energy sphere
        const outerGeo = new THREE.SphereGeometry(2.5, 32, 32);
        const outerMat = new THREE.MeshBasicMaterial({ 
            color: 0x4400ff,
            emissive: 0x6600ff,
            emissiveIntensity: 2,
            transparent: true, 
            opacity: 0.4,
            wireframe: false
        });
        const outer = new THREE.Mesh(outerGeo, outerMat);
        outer.position.copy(pos);
        this.scene.add(outer);
        
        // Particle stream effect (particles being pulled in - performance optimized)
        const gravityParticles = CONSTANTS.VFX.MAX_GRAVITY_PARTICLES;
        for (let i = 0; i < gravityParticles; i++) {
            const particleGeo = new THREE.SphereGeometry(0.1, 8, 8);
            const particleMat = new THREE.MeshBasicMaterial({
                color: 0x4400ff,
                emissive: 0x6600ff,
                emissiveIntensity: 2,
                transparent: true,
                opacity: 0.8
            });
            const particle = new THREE.Mesh(particleGeo, particleMat);
            
            // Start from random position around the well
            const angle = Math.random() * Math.PI * 2;
            const radius = 5 + Math.random() * 3;
            particle.position.set(
                pos.x + Math.cos(angle) * radius,
                pos.y + (Math.random() - 0.5) * 2,
                pos.z + Math.sin(angle) * radius
            );
            this.scene.add(particle);
            
            let particleLife = 1.0;
            const particleAnimate = () => {
                particleLife -= 0.02;
                if (particleLife > 0) {
                    // Pull towards center
                    const toCenter = pos.clone().sub(particle.position).normalize().multiplyScalar(0.3);
                    particle.position.add(toCenter);
                    particle.scale.setScalar(1 + (1 - particleLife) * 2);
                    particle.material.opacity = particleLife * 0.8;
                    requestAnimationFrame(particleAnimate);
                } else {
                    particle.geometry.dispose();
                    particle.material.dispose();
                    this.scene.remove(particle);
                }
            };
            setTimeout(() => particleAnimate(), Math.random() * 200);
        }
        
        // Animate core and outer sphere
        let life = 2.0;
        const animate = () => {
            life -= 0.015;
            if (life > 0) {
                const pulse = Math.sin(Date.now() * 0.005) * 0.15 + 1;
                core.scale.setScalar(pulse);
                outer.scale.setScalar(pulse * 1.2);
                
                core.material.opacity = life * 0.9;
                outer.material.opacity = life * 0.4;
                core.material.emissiveIntensity = life * 3;
                outer.material.emissiveIntensity = life * 2;
                
                // Rotate the outer sphere
                outer.rotation.y += 0.02;
                core.rotation.x += 0.01;
                
                requestAnimationFrame(animate);
            } else {
                core.geometry.dispose();
                core.material.dispose();
                this.scene.remove(core);
                outer.geometry.dispose();
                outer.material.dispose();
                this.scene.remove(outer);
            }
        };
        animate();
    }

    createVoidOrbe(targetPos) {
        if (!targetPos) return;
        const startPos = this.position.clone();
        const dir = targetPos.clone().sub(startPos).normalize();
        const distance = startPos.distanceTo(targetPos);
        
        // Main void orb with pulsing energy
        const geo = new THREE.SphereGeometry(0.9, 32, 32);
        const mat = new THREE.MeshPhongMaterial({ 
            color: 0xaa00ff, 
            emissive: 0xff00ff,
            emissiveIntensity: 4, 
            transparent: true, 
            opacity: 0.95 
        });
        const orbe = new THREE.Mesh(geo, mat);
        orbe.position.copy(startPos);
        this.scene.add(orbe);
        
        // Outer aura ring
        const auraGeo = new THREE.TorusGeometry(1.2, 0.1, 16, 32);
        const auraMat = new THREE.MeshBasicMaterial({
            color: 0xff00ff,
            emissive: 0xff00ff,
            emissiveIntensity: 3,
            transparent: true,
            opacity: 0.7
        });
        const aura = new THREE.Mesh(auraGeo, auraMat);
        aura.position.copy(startPos);
        aura.lookAt(targetPos);
        this.scene.add(aura);
        
        // Distortion particles around the orb (performance optimized)
        const particles = [];
        const voidParticleCount = CONSTANTS.VFX.MAX_VOID_PARTICLES;
        for (let i = 0; i < voidParticleCount; i++) {
            const pGeo = new THREE.SphereGeometry(0.08, 8, 8);
            const pMat = new THREE.MeshBasicMaterial({
                color: 0xaa00ff,
                emissive: 0xff00ff,
                emissiveIntensity: 3,
                transparent: true,
                opacity: 0.8
            });
            const particle = new THREE.Mesh(pGeo, pMat);
            const angle = (i / voidParticleCount) * Math.PI * 2;
            const radius = 1.5;
            particle.position.set(
                startPos.x + Math.cos(angle) * radius,
                startPos.y + (Math.random() - 0.5) * 0.5,
                startPos.z + Math.sin(angle) * radius
            );
            this.scene.add(particle);
            particles.push({ mesh: particle, angle, radius, offset: Math.random() * Math.PI * 2 });
        }
        
        let life = distance / 0.5;
        const animate = () => {
            life -= 0.016;
            if (life > 0) {
                const progress = 1 - (life / (distance / 0.5));
                const currentPos = startPos.clone().lerp(targetPos, progress);
                orbe.position.copy(currentPos);
                aura.position.copy(currentPos);
                
                // Pulsing effect
                const pulse = 1 + Math.sin(Date.now() * 0.02) * 0.3;
                orbe.scale.setScalar(pulse);
                aura.scale.setScalar(pulse);
                
                // Rotate aura
                aura.rotation.z += 0.05;
                orbe.rotation.y += 0.03;
                
                // Animate particles
                particles.forEach((p, i) => {
                    const time = Date.now() * 0.001 + p.offset;
                    const newRadius = 1.5 + Math.sin(time * 2) * 0.3;
                    p.mesh.position.set(
                        currentPos.x + Math.cos(p.angle + time) * newRadius,
                        currentPos.y + Math.sin(time * 3 + p.offset) * 0.5,
                        currentPos.z + Math.sin(p.angle + time) * newRadius
                    );
                    p.mesh.material.opacity = 0.8;
                });
                
                requestAnimationFrame(animate);
            } else {
                // Impact effect (performance optimized)
                const impactParticles = CONSTANTS.VFX.MAX_VOID_PARTICLES * 2;
                for (let i = 0; i < impactParticles; i++) {
                    const impactGeo = new THREE.SphereGeometry(0.1, 8, 8);
                    const impactMat = new THREE.MeshBasicMaterial({
                        color: 0xff00ff,
                        emissive: 0xff00ff,
                        emissiveIntensity: 4,
                        transparent: true,
                        opacity: 1
                    });
                    const impact = new THREE.Mesh(impactGeo, impactMat);
                    impact.position.copy(targetPos);
                    impact.position.add(new THREE.Vector3(
                        (Math.random() - 0.5) * 3,
                        (Math.random() - 0.5) * 3,
                        (Math.random() - 0.5) * 3
                    ));
                    this.scene.add(impact);
                    const impactVel = new THREE.Vector3(
                        (Math.random() - 0.5) * 0.4,
                        (Math.random() - 0.5) * 0.4,
                        (Math.random() - 0.5) * 0.4
                    );
                    let impactLife = 1.0;
                    const impactAnimate = () => {
                        impactLife -= 0.05;
                        if (impactLife > 0) {
                            impact.position.add(impactVel);
                            impact.scale.setScalar(1 + (1 - impactLife) * 3);
                            impact.material.opacity = impactLife;
                            requestAnimationFrame(impactAnimate);
                        } else {
                            impact.geometry.dispose();
                            impact.material.dispose();
                            this.scene.remove(impact);
                        }
                    };
                    impactAnimate();
                }
                
                // Cleanup
                orbe.geometry.dispose();
                orbe.material.dispose();
                this.scene.remove(orbe);
                aura.geometry.dispose();
                aura.material.dispose();
                this.scene.remove(aura);
                particles.forEach(p => {
                    p.mesh.geometry.dispose();
                    p.mesh.material.dispose();
                    this.scene.remove(p.mesh);
                });
            }
        };
        animate();
    }

    createIceShards(targetPos) {
        if (!targetPos) return;
        const startPos = this.position.clone();
        const dir = targetPos.clone().sub(startPos).normalize();
        
        // Create ice shards with more variety (performance optimized)
        const shardCount = CONSTANTS.VFX.MAX_ICE_SHARDS;
        for (let i = 0; i < shardCount; i++) {
            // Vary the geometry - mix of cones and octahedrons for variety
            const useCone = Math.random() > 0.5;
            const geo = useCone ? 
                new THREE.ConeGeometry(0.15 + Math.random() * 0.15, 0.6 + Math.random() * 0.4, 6) :
                new THREE.OctahedronGeometry(0.2 + Math.random() * 0.15, 0);
            
            const mat = new THREE.MeshPhongMaterial({ 
                color: 0x88eeff,
                emissive: 0x00ffff,
                emissiveIntensity: 2.5,
                transparent: true, 
                opacity: 0.9,
                shininess: 100,
                specular: 0xffffff
            });
            const shard = new THREE.Mesh(geo, mat);
            shard.position.copy(startPos);
            shard.position.add(new THREE.Vector3(
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5
            ));
            
            // Orient towards target with random spread
            shard.lookAt(targetPos);
            shard.rotateX(Math.PI / 2);
            shard.rotateX((Math.random() - 0.5) * 0.5);
            shard.rotateY((Math.random() - 0.5) * 0.5);
            shard.rotateZ((Math.random() - 0.5) * 0.5);
            
            this.scene.add(shard);
            const shardDir = dir.clone();
            shardDir.x += (Math.random() - 0.5) * 0.4;
            shardDir.y += (Math.random() - 0.5) * 0.4;
            shardDir.z += (Math.random() - 0.5) * 0.4;
            shardDir.normalize();
            
            let life = 1.0;
            const spinSpeed = 0.3 + Math.random() * 0.3;
            const animate = () => {
                life -= 0.025;
                if (life > 0) {
                    shard.position.add(shardDir.clone().multiplyScalar(1.0));
                    // Realistic spinning
                    shard.rotateX(spinSpeed);
                    shard.rotateY(spinSpeed * 0.7);
                    shard.rotateZ(spinSpeed * 0.5);
                    shard.material.opacity = life * 0.9;
                    requestAnimationFrame(animate);
                } else {
                    shard.geometry.dispose();
                    shard.material.dispose();
                    this.scene.remove(shard);
                }
            };
            animate();
        }
        
        // Add ice particles trailing behind (performance optimized)
        const iceParticleCount = CONSTANTS.VFX.MAX_ICE_PARTICLES;
        for (let i = 0; i < iceParticleCount; i++) {
            const particleGeo = new THREE.SphereGeometry(0.08, 8, 8);
            const particleMat = new THREE.MeshBasicMaterial({
                color: 0x88eeff,
                emissive: 0x00ffff,
                emissiveIntensity: 2,
                transparent: true,
                opacity: 0.7
            });
            const particle = new THREE.Mesh(particleGeo, particleMat);
            particle.position.copy(startPos);
            particle.position.add(new THREE.Vector3(
                (Math.random() - 0.5) * 1,
                (Math.random() - 0.5) * 1,
                (Math.random() - 0.5) * 1
            ));
            this.scene.add(particle);
            const particleDir = dir.clone();
            particleDir.x += (Math.random() - 0.5) * 0.5;
            particleDir.y += (Math.random() - 0.5) * 0.5;
            particleDir.z += (Math.random() - 0.5) * 0.5;
            particleDir.normalize();
            let particleLife = 0.8;
            const particleAnimate = () => {
                particleLife -= 0.03;
                if (particleLife > 0) {
                    particle.position.add(particleDir.clone().multiplyScalar(0.7));
                    particle.material.opacity = particleLife * 0.7;
                    requestAnimationFrame(particleAnimate);
                } else {
                    particle.geometry.dispose();
                    particle.material.dispose();
                    this.scene.remove(particle);
                }
            };
            setTimeout(() => particleAnimate(), Math.random() * 100);
        }
    }

    createFreezeAura() {
        // Multiple expanding rings for freezing effect
        for (let ring = 0; ring < 4; ring++) {
            const geo = new THREE.TorusGeometry(2 + ring * 0.3, 0.08, 32, 100);
            const mat = new THREE.MeshBasicMaterial({ 
                color: 0x00ffff,
                emissive: 0x88eeff,
                emissiveIntensity: 2,
                transparent: true, 
                opacity: 0.7 
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.rotation.x = Math.PI / 2;
            mesh.position.copy(this.position);
            this.scene.add(mesh);
            let scale = 1.0;
            const delay = ring * 0.03;
            const animate = () => {
                scale += 0.12;
                mesh.scale.set(scale, scale, 1);
                const opacity = Math.max(0, 0.7 - (scale - 1) * 0.15);
                mesh.material.opacity = opacity;
                if (opacity > 0) requestAnimationFrame(animate);
                else {
                    mesh.geometry.dispose();
                    mesh.material.dispose();
                    this.scene.remove(mesh);
                }
            };
            setTimeout(() => animate(), delay * 1000);
        }
        
        // Ice crystal burst at center
        for (let i = 0; i < 12; i++) {
            const crystalGeo = new THREE.ConeGeometry(0.1, 0.4, 6);
            const crystalMat = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                emissive: 0x88eeff,
                emissiveIntensity: 2,
                transparent: true,
                opacity: 0.9
            });
            const crystal = new THREE.Mesh(crystalGeo, crystalMat);
            crystal.position.copy(this.position);
            const angle = (i / 12) * Math.PI * 2;
            crystal.rotation.z = angle;
            crystal.rotation.x = Math.PI / 2;
            this.scene.add(crystal);
            let crystalLife = 1.0;
            const crystalAnimate = () => {
                crystalLife -= 0.04;
                if (crystalLife > 0) {
                    crystal.scale.setScalar(1 + (1 - crystalLife) * 2);
                    crystal.material.opacity = crystalLife * 0.9;
                    crystal.rotation.y += 0.1;
                    requestAnimationFrame(crystalAnimate);
                } else {
                    crystal.geometry.dispose();
                    crystal.material.dispose();
                    this.scene.remove(crystal);
                }
            };
            crystalAnimate();
        }
    }

    createAuraBurst(color) {
        // Enhanced aura burst with multiple layers
        const geo = new THREE.SphereGeometry(0.5, 16, 16);
        const mat = new THREE.MeshBasicMaterial({ 
            color, 
            emissive: color,
            emissiveIntensity: 2,
            transparent: true, 
            opacity: 0.9 
        });
        const burst = new THREE.Mesh(geo, mat);
        burst.position.copy(this.position);
        this.scene.add(burst);
        
        // Outer glow ring for more impact
        const ringGeo = new THREE.RingGeometry(0.6, 1.0, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 1.5,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(this.position);
        ring.rotation.x = -Math.PI / 2;
        this.scene.add(ring);
        
        let life = 1.0;
        const animate = () => {
            life -= 0.04;
            if (life > 0) {
                const scale = 1 + (1 - life) * 12;
                burst.scale.setScalar(scale);
                burst.material.opacity = life * 0.9;
                burst.material.emissiveIntensity = life * 2;
                
                ring.scale.setScalar(scale * 1.2);
                ring.material.opacity = life * 0.6;
                ring.rotation.z += 0.05;
                
                requestAnimationFrame(animate);
            } else {
                burst.geometry.dispose();
                burst.material.dispose();
                this.scene.remove(burst);
                ring.geometry.dispose();
                ring.material.dispose();
                this.scene.remove(ring);
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
