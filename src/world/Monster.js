import * as THREE from 'three';

export class Monster {
    constructor(scene) {
        this.scene = scene;
        this.mesh = new THREE.Group();
        this.state = 'idle'; // 'idle', 'hurt', 'charging', 'attack', 'stagger'
        this.phase = 1;
        this.attackType = 'normal';
        this.time = 0;
        this.hitFlash = 0;
        this.mousePos = new THREE.Vector2();
        this.targetRotation = new THREE.Euler();
        this.recoilOffset = new THREE.Vector3();

        this.initModel();
        this.scene.add(this.mesh);

        // Initial position
        this.mesh.position.set(0, 5, 0);

        // Physics
        this.velocity = new THREE.Vector3();
        this.acceleration = new THREE.Vector3();
        this.maxSpeed = 0.05;
        this.maxForce = 0.005;
    }

    seek(target) {
        if (!target || isNaN(target.x)) return new THREE.Vector3();
        const desired = target.clone().sub(this.mesh.position);
        desired.normalize().multiplyScalar(this.maxSpeed);
        const steer = desired.sub(this.velocity);
        steer.clampLength(0, this.maxForce);
        return steer;
    }

    initModel() {
        // Core (The Eye)
        const coreGeo = new THREE.IcosahedronGeometry(1.2, 2);
        this.coreMat = new THREE.MeshPhysicalMaterial({
            color: 0x440000,
            emissive: 0xff4500,
            emissiveIntensity: 1,
            roughness: 0.2,
            metalness: 0.8,
            flatShading: true
        });
        this.core = new THREE.Mesh(coreGeo, this.coreMat);
        this.mesh.add(this.core);

        // Outer Glow
        const glowGeo = new THREE.SphereGeometry(1.6, 32, 32);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.15,
            side: THREE.BackSide
        });
        this.glowMesh = new THREE.Mesh(glowGeo, glowMat);
        this.mesh.add(this.glowMesh);

        // Orbiting Shards
        this.shards = [];
        for (let i = 0; i < 12; i++) {
            const shardGeo = new THREE.ConeGeometry(0.3, 1, 4);
            const shardMat = new THREE.MeshPhysicalMaterial({
                color: 0x111111,
                emissive: 0xff0000,
                emissiveIntensity: 0.5,
                metalness: 1,
                roughness: 0.1
            });
            const shard = new THREE.Mesh(shardGeo, shardMat);
            this.mesh.add(shard);
            this.shards.push({
                mesh: shard,
                angle: (i / 12) * Math.PI * 2,
                radius: 4,
                speed: 1 + Math.random() * 2,
                offset: Math.random() * Math.PI
            });
        }

        // Eye Group (for look-at)
        this.eyeGroup = new THREE.Group();
        this.mesh.add(this.eyeGroup);

        const pupilGeo = new THREE.SphereGeometry(0.5, 16, 16);
        const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        this.pupil = new THREE.Mesh(pupilGeo, pupilMat);
        this.pupil.position.z = 1.8;
        this.eyeGroup.add(this.pupil);

        // Point Light
        this.glow = new THREE.PointLight(0xff0000, 5, 15);
        this.mesh.add(this.glow);
    }

    update(deltaTime, mouse, state) {
        // NaN Safety Check
        if (isNaN(this.mesh.position.x) || isNaN(this.mesh.position.y) || isNaN(this.mesh.position.z)) {
            this.mesh.position.set(0, 5, 0);
            this.velocity.set(0, 0, 0);
            this.acceleration.set(0, 0, 0);
        }

        this.time += deltaTime;
        if (mouse) this.mousePos.copy(mouse);

        // Phase Check
        if (state.monsterHp < state.maxMonsterHp * 0.5 && this.phase === 1) {
            this.phase = 2;
            this.coreMat.color.setHex(0xff0000);
            this.glow.color.setHex(0xff0000);
        }

        const isCharging = this.state === 'charging';
        const isHurt = this.state === 'hurt';
        const isStagger = this.state === 'stagger';
        const isAttacking = this.state === 'attack';

        // Technical Animation: Breathing & Jitter
        const breathSpeed = isCharging ? 10 : (this.phase === 2 ? 4 : 2);
        const breathIntensity = isCharging ? 0.15 : 0.05;
        const breathScale = 1 + Math.sin(this.time * breathSpeed) * breathIntensity;

        const jitterIntensity = (isHurt || isStagger) ? 0.1 : (isCharging ? 0.1 : 0.02);
        const jitter = (Math.random() - 0.5) * jitterIntensity;

        this.core.scale.setScalar(breathScale + jitter);

        // Hit Flash Logic
        if (this.hitFlash > 0) {
            this.coreMat.emissiveIntensity = 20;
            this.coreMat.emissive.setHex(0xffffff);
            this.hitFlash -= deltaTime * 10;
        } else {
            this.coreMat.emissiveIntensity = (1 + Math.sin(this.time * 4) * 0.5) * (isHurt ? 5 : 1);
            this.coreMat.emissive.setHex(this.phase === 2 ? 0xff0000 : 0xff4500);
            if (this.phase === 2) this.coreMat.emissiveIntensity *= 2;
            if (isCharging) this.coreMat.emissiveIntensity *= 3;
        }

        this.glow.intensity = (5 + Math.sin(this.time * 4) * 2) * (isHurt ? 10 : 1);
        if (this.phase === 2) this.glow.intensity *= 1.5;

        // Shard Orbit
        this.shards.forEach(s => {
            s.angle += deltaTime * s.speed * (isCharging ? 3 : 1);
            const r = s.radius + Math.sin(this.time * 2 + s.offset) * 0.5;
            s.mesh.position.x = Math.cos(s.angle) * r;
            s.mesh.position.y = Math.sin(s.angle) * r;
            s.mesh.position.z = Math.sin(s.angle * 0.5) * 2;
            s.mesh.lookAt(this.mesh.position);
        });

        // Technical Animation: Look-At (Smooth)
        let targetLook = new THREE.Vector3();
        if (state.monsterTarget !== 'player' && state.npcPos) {
            targetLook.copy(state.npcPos);
        } else {
            targetLook.set((this.mousePos.x - 0.5) * 10, -(this.mousePos.y - 0.5) * 10, 5);
        }
        const targetQuat = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 0, 1),
            targetLook.clone().normalize()
        );
        this.eyeGroup.quaternion.slerp(targetQuat, 0.1);

        // Physics Update
        this.velocity.add(this.acceleration);
        this.velocity.clampLength(0, this.maxSpeed);
        this.mesh.position.add(this.velocity);
        this.acceleration.set(0, 0, 0);

        // Recoil Smoothing (Applied on top of movement)
        this.recoilOffset.lerp(new THREE.Vector3(0, 0, 0), 0.1);
        this.mesh.position.add(this.recoilOffset.clone().multiplyScalar(0.1));
    }

    applyForce(force) {
        this.acceleration.add(force);
    }

    takeDamage(isCrit = false) {
        this.state = isCrit ? 'stagger' : 'hurt';
        this.hitFlash = 1.0;

        const recoil = isCrit ? 4 : 2;
        this.recoilOffset.set((Math.random() - 0.5) * recoil, (Math.random() - 0.5) * recoil, -recoil);

        setTimeout(() => {
            this.state = 'idle';
        }, isCrit ? 300 : 150);
    }

    chargeAttack(type = 'normal') {
        this.state = 'charging';
        this.attackType = type;
    }

    performAttack(targetPos) {
        this.state = 'attack';
        const originalPos = this.mesh.position.clone();

        if (targetPos) {
            const dir = targetPos.clone().sub(this.mesh.position).normalize();
            this.mesh.position.add(dir.multiplyScalar(5));
        } else {
            this.mesh.position.z += 5;
        }

        setTimeout(() => {
            this.mesh.position.copy(originalPos);
            this.state = 'idle';
        }, 200);
    }
}
