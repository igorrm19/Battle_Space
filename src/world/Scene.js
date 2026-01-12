import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { EnvironmentManager } from './Environment.js';

const ChromaticAberrationShader = {
    uniforms: {
        "tDiffuse": { value: null },
        "amount": { value: 0.002 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float amount;
        varying vec2 vUv;
        void main() {
            vec4 cr = texture2D(tDiffuse, vUv + vec2(amount, 0.0));
            vec4 cg = texture2D(tDiffuse, vUv);
            vec4 cb = texture2D(tDiffuse, vUv - vec2(amount, 0.0));
            gl_FragColor = vec4(cr.r, cg.g, cb.b, cg.a);
        }
    `
};

const VoidDistortionShader = {
    uniforms: {
        "tDiffuse": { value: null },
        "time": { value: 0 },
        "intensity": { value: 0.01 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float time;
        uniform float intensity;
        varying vec2 vUv;
        void main() {
            vec2 uv = vUv;
            uv.x += sin(uv.y * 10.0 + time) * intensity;
            uv.y += cos(uv.x * 10.0 + time) * intensity;
            gl_FragColor = texture2D(tDiffuse, uv);
        }
    `
};

const VignetteShader = {
    uniforms: {
        "tDiffuse": { value: null },
        "offset": { value: 1.0 },
        "darkness": { value: 1.5 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float offset;
        uniform float darkness;
        varying vec2 vUv;
        void main() {
            vec4 texel = texture2D(tDiffuse, vUv);
            vec2 uv = (vUv - vec2(0.5)) * vec2(offset);
            gl_FragColor = vec4(texel.rgb * vec3(1.0 - dot(uv, uv) * darkness), texel.a);
        }
    `
};

export class SceneManager {
    constructor(container) {
        this.container = container;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x010102);
        this.scene.fog = new THREE.FogExp2(0x010102, 0.02); // Reduced fog for better visibility

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 10, 25);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.toneMapping = THREE.ReinhardToneMapping;
        this.container.appendChild(this.renderer.domElement);

        // Post-processing
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));

        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.5, 0.4, 0.85 // Reduced strength for clarity
        );
        this.composer.addPass(this.bloomPass);

        // Expose manager reference on scene so other objects can access scene manager features
        this.scene.__manager = this;

        this.chromaticAberration = new ShaderPass(ChromaticAberrationShader);
        this.composer.addPass(this.chromaticAberration);

        this.voidDistortion = new ShaderPass(VoidDistortionShader);
        this.composer.addPass(this.voidDistortion);

        this.vignette = new ShaderPass(VignetteShader);
        this.composer.addPass(this.vignette);

        this.initLights();
        this.initEnvironment();
        this.initRuins();
        this.initLoreOrbs();
        this.damageNumbers = [];
        this.screenShake = 0;
        this.initClickMarker();
        this.focusFn = null;
        this.focusTimer = 0;

        this.environment = new EnvironmentManager(this.scene);

        window.addEventListener('resize', () => this.onWindowResize());

        // Try to dynamically load additional post-processing passes if available (optional)
        import('three/examples/jsm/postprocessing/AfterimagePass.js').then(mod => {
            try {
                const AfterimagePass = mod.AfterimagePass;
                this.afterimagePass = new AfterimagePass(0.9);
                this.composer.addPass(this.afterimagePass);
                console.log('[Scene] AfterimagePass loaded');
            } catch (e) {
                console.warn('[Scene] AfterimagePass could not be initialized', e);
            }
        }).catch(() => {
            // Not available; skip silently
        });
    }

    initClickMarker() {
        const geo = new THREE.RingGeometry(0.5, 0.6, 32);
        const mat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0 });
        this.clickMarker = new THREE.Mesh(geo, mat);
    }

    /** Temporarily flash bloom strength for dramatic effects */
    flashBloom(strength = 2.5, durationMs = 300) {
        if (!this.bloomPass) return;
        const orig = this.bloomPass.strength || 1.0;
        this.bloomPass.strength = strength;
        const start = performance.now();
        const animate = (now) => {
            const t = Math.min((now - start) / durationMs, 1);
            // Smoothly damp from strength back to orig
            this.bloomPass.strength = strength * (1 - t) + orig * t;
            if (t < 1) requestAnimationFrame(animate);
            else this.bloomPass.strength = orig;
        };
        requestAnimationFrame(animate);
    }
        this.clickMarker.rotation.x = -Math.PI / 2;
        this.clickMarker.position.y = 0.1;
        this.scene.add(this.clickMarker);
    }

    updateClickMarker(pos) {
        if (pos) {
            this.clickMarker.position.set(pos.x, 0.1, pos.z);
            this.clickMarker.material.opacity = 1;
        } else {
            this.clickMarker.material.opacity = THREE.MathUtils.lerp(this.clickMarker.material.opacity, 0, 0.1);
        }
        this.clickMarker.scale.setScalar(1 + Math.sin(Date.now() * 0.01) * 0.2);
    }

    initLights() {
        this.scene.add(new THREE.AmbientLight(0x404040, 0.5));

        this.mainLight = new THREE.PointLight(0xff4500, 100, 50);
        this.mainLight.position.set(5, 10, 5);
        this.scene.add(this.mainLight);

        // Pulsing Void Light
        this.voidLight = new THREE.PointLight(0x4400ff, 50, 100);
        this.voidLight.position.set(0, 20, 0);
        this.scene.add(this.voidLight);

        this.rimLight = new THREE.PointLight(0x0066ff, 50, 50);
        this.rimLight.position.set(-5, 5, -5);
        this.scene.add(this.rimLight);
    }

    initEnvironment() {
        // Floor with grid (Energy Grid)
        const grid = new THREE.GridHelper(100, 50, 0x00ffff, 0x002222); // Cyan grid for better contrast
        grid.position.y = -0.1;
        this.scene.add(grid);

        // Invisible Floor for Raycasting
        const floorGeo = new THREE.PlaneGeometry(200, 200);
        const floorMat = new THREE.MeshBasicMaterial({ visible: false });
        this.floor = new THREE.Mesh(floorGeo, floorMat);
        this.floor.rotation.x = -Math.PI / 2;
        this.scene.add(this.floor);

        // Interspatial Nebulae (Semi-transparent planes)
        const nebulaGeo = new THREE.PlaneGeometry(100, 100);
        for (let i = 0; i < 5; i++) {
            const nebulaMat = new THREE.MeshBasicMaterial({
                color: i % 2 === 0 ? 0x440066 : 0x002244,
                transparent: true,
                opacity: 0.1,
                side: THREE.DoubleSide,
                depthWrite: false
            });
            const nebula = new THREE.Mesh(nebulaGeo, nebulaMat);
            nebula.position.set((Math.random() - 0.5) * 50, (Math.random() - 0.5) * 50, -20 - i * 10);
            nebula.rotation.z = Math.random() * Math.PI;
            this.scene.add(nebula);
        }

        // Detailed Space Debris (High-Poly Obsidian Shards)
        for (let i = 0; i < 40; i++) {
            const geo = new THREE.IcosahedronGeometry(Math.random() * 0.8 + 0.2, 1);
            const mat = new THREE.MeshPhysicalMaterial({
                color: 0x050505,
                roughness: 0.1,
                metalness: 1,
                emissive: 0x110000,
                emissiveIntensity: 0.2
            });
            const shard = new THREE.Mesh(geo, mat);
            shard.position.set(
                (Math.random() - 0.5) * 40,
                Math.random() * 15,
                (Math.random() - 0.5) * 40
            );
            shard.rotation.set(Math.random(), Math.random(), Math.random());
            this.scene.add(shard);
        }

        // Multi-layered Starfield
        const createStars = (count, size, color, opacity) => {
            const starGeo = new THREE.BufferGeometry();
            const starCoords = [];
            for (let i = 0; i < count; i++) {
                starCoords.push((Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200);
            }
            starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starCoords, 3));
            const starMat = new THREE.PointsMaterial({ color, size, transparent: true, opacity });
            return new THREE.Points(starGeo, starMat);
        };

        this.stars = [
            createStars(5000, 0.08, 0xffffff, 1.0), // More and brighter stars
            createStars(1000, 0.2, 0xffccaa, 0.7),
            createStars(500, 0.4, 0x00ffff, 0.5)
        ];
        this.stars.forEach(s => this.scene.add(s));

        // Static Background Stars (Infinite distance)
        const bgStarGeo = new THREE.BufferGeometry();
        const bgStarCoords = [];
        for (let i = 0; i < 10000; i++) {
            const r = 500;
            const theta = 2 * Math.PI * Math.random();
            const phi = Math.acos(2 * Math.random() - 1);
            bgStarCoords.push(
                r * Math.sin(phi) * Math.cos(theta),
                r * Math.sin(phi) * Math.sin(theta),
                r * Math.cos(phi)
            );
        }
        bgStarGeo.setAttribute('position', new THREE.Float32BufferAttribute(bgStarCoords, 3));
        const bgStarMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1, transparent: true, opacity: 0.5 });
        this.bgStars = new THREE.Points(bgStarGeo, bgStarMat);
        this.scene.add(this.bgStars);

        this.initVoidSmoke();
    }

    initRuins() {
        // Shattered Monoliths
        for (let i = 0; i < 12; i++) {
            const height = 5 + Math.random() * 10;
            const geo = new THREE.BoxGeometry(2, height, 2);
            const mat = new THREE.MeshPhysicalMaterial({
                color: 0x1a1a1a,
                roughness: 0.9,
                metalness: 0.2,
                emissive: 0x001122,
                emissiveIntensity: 0.5
            });
            const pillar = new THREE.Mesh(geo, mat);
            const angle = Math.random() * Math.PI * 2;
            const radius = 25 + Math.random() * 15;
            pillar.position.set(Math.cos(angle) * radius, height / 2 - 2, Math.sin(angle) * radius);
            pillar.rotation.set(Math.random() * 0.2, Math.random() * Math.PI, Math.random() * 0.2);
            this.scene.add(pillar);
        }
    }

    initLoreOrbs() {
        this.loreOrbs = [];
        const loreData = [
            { pos: new THREE.Vector3(-15, 2, -15), text: "O Vazio não é o fim, mas um novo começo." },
            { pos: new THREE.Vector3(15, 2, 15), text: "A Deusa do Ouro cobiça o que o Vazio consome." },
            { pos: new THREE.Vector3(0, 2, -30), text: "O equilíbrio entre luz e sombra foi quebrado." }
        ];

        loreData.forEach(data => {
            const geo = new THREE.IcosahedronGeometry(0.5, 1);
            const mat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.6 });
            const orb = new THREE.Mesh(geo, mat);
            orb.position.copy(data.pos);
            this.scene.add(orb);
            this.loreOrbs.push({ mesh: orb, text: data.text, discovered: false });
        });
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);
    }

    initVoidSmoke() {
        const particleCount = 100;
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(particleCount * 3);
        const vel = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 5;
            pos[i * 3 + 1] = 5 + (Math.random() - 0.5) * 5;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 5;
            vel[i * 3 + 1] = Math.random() * 0.02;
        }

        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({
            color: 0x220000,
            size: 0.5,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending
        });
        this.smoke = new THREE.Points(geo, mat);
        this.smokeVel = vel;
        this.scene.add(this.smoke);
    }

    spawnDamageNumber(value, position, isCrit = false) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 128;

        ctx.font = isCrit ? 'bold 80px Cinzel' : '60px Cinzel';
        ctx.fillStyle = isCrit ? '#ffaa00' : '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,1)';
        ctx.shadowBlur = 10;
        ctx.fillText(value, 128, 64);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMat);

        sprite.position.copy(position);
        sprite.position.y += 2;
        sprite.scale.set(3, 1.5, 1);

        this.scene.add(sprite);
        this.damageNumbers.push({ sprite, life: 1.0, vel: new THREE.Vector3((Math.random() - 0.5) * 0.1, 0.1, 0) });
    }

    updateParticles(delta, playerPos) {
        if (this.smoke) {
            const pos = this.smoke.geometry.attributes.position.array;
            for (let i = 0; i < 100; i++) {
                pos[i * 3 + 1] += this.smokeVel[i * 3 + 1];
                if (pos[i * 3 + 1] > 10) pos[i * 3 + 1] = 3;
            }
            this.smoke.geometry.attributes.position.needsUpdate = true;
        }

        // Star Parallax
        if (playerPos && this.stars) {
            this.stars.forEach((s, i) => {
                const factor = (i + 1) * 0.01;
                s.position.x = -playerPos.x * factor;
                s.position.z = -playerPos.z * factor;
            });
        }

        // Update Damage Numbers
        for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
            const dn = this.damageNumbers[i];
            dn.life -= delta;
            dn.sprite.position.add(dn.vel);
            dn.sprite.material.opacity = dn.life;
            if (dn.life <= 0) {
                this.scene.remove(dn.sprite);
                dn.sprite.material.dispose();
                this.damageNumbers.splice(i, 1);
            }
        }

        // Chromatic Aberration Damping
        if (this.chromaticAberration) {
            this.chromaticAberration.uniforms.amount.value = THREE.MathUtils.lerp(this.chromaticAberration.uniforms.amount.value, 0.002, 0.1);
        }
    }

    triggerImpactEffect() {
        if (this.chromaticAberration) {
            this.chromaticAberration.uniforms.amount.value = 0.02;
        }
        this.triggerScreenShake(0.5);
    }

    triggerScreenShake(intensity) {
        this.screenShake = intensity;
    }

    setFocus(targetFn) {
        this.focusFn = targetFn;
        this.focusTimer = 30.0; // Focus for 30 seconds
    }

    updateCamera(boss1Pos, boss2Pos, playerPos, delta) {
        if (!boss1Pos || !boss2Pos || !playerPos) return;

        let targetMid;
        let targetCamPos;

        if (this.focusFn && this.focusTimer > 0) {
            this.focusTimer -= delta;
            targetMid = this.focusFn();
            if (!targetMid) {
                this.focusFn = null;
                return;
            }
            targetCamPos = targetMid.clone().add(new THREE.Vector3(0, 8, 12)); // Closer view
        } else {
            this.focusFn = null;
            // Free Camera Mode
            targetCamPos = playerPos.clone().add(new THREE.Vector3(0, 0, 0)); // Camera is at playerPos
            targetMid = playerPos.clone().add(new THREE.Vector3(0, 0, -10)); // Look forward
        }

        // Smoothly lerp camera position
        this.camera.position.lerp(targetCamPos, delta * 3);

        // Smoothly lerp lookAt
        if (!this.camLookAt) this.camLookAt = new THREE.Vector3(0, 0, 0);
        this.camLookAt.lerp(targetMid, delta * 3);
        this.camera.lookAt(this.camLookAt);

        // Dynamic FOV
        const dist = boss1Pos.distanceTo(boss2Pos);
        const targetFOV = this.focusTarget ? 50 : Math.max(45, Math.min(75, 45 + dist * 1.5));
        this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFOV, delta);
        this.camera.updateProjectionMatrix();
    }

    render(delta, boss1Pos, boss2Pos, playerPos, entities) {
        this.updateParticles(delta, playerPos);
        if (this.environment) this.environment.update(delta, entities);

        // Update Shaders
        if (this.voidDistortion) {
            this.voidDistortion.uniforms.time.value += delta;
            this.voidDistortion.uniforms.intensity.value = 0.005 + Math.sin(Date.now() * 0.001) * 0.005;
        }

        // Dynamic Lighting
        if (this.mainLight) {
            this.mainLight.intensity = 100 + Math.sin(Date.now() * 0.002) * 20;
            if (boss1Pos) this.mainLight.position.lerp(boss1Pos, 0.1);
        }

        if (this.voidLight) {
            this.voidLight.intensity = 50 + Math.sin(Date.now() * 0.001) * 30;
            this.voidLight.position.x = Math.sin(Date.now() * 0.0005) * 20;
            this.voidLight.position.z = Math.cos(Date.now() * 0.0005) * 20;
        }

        // Update Screen Shake
        if (this.screenShake > 0) {
            this.camera.position.x += (Math.random() - 0.5) * this.screenShake;
            this.camera.position.y += (Math.random() - 0.5) * this.screenShake;
            this.screenShake *= 0.9;
            if (this.screenShake < 0.01) this.screenShake = 0;
        }

        // Update Lore Orbs
        if (playerPos) {
            this.loreOrbs.forEach(orb => {
                const dist = orb.mesh.position.distanceTo(playerPos);
                orb.mesh.rotation.y += delta * 2;
                orb.mesh.scale.setScalar(1 + Math.sin(Date.now() * 0.005) * 0.2);

                if (dist < 3 && !orb.discovered) {
                    orb.discovered = true;
                    // We'll handle notification in main.js via a callback or event
                    if (this.onLoreDiscovered) this.onLoreDiscovered(orb.text);
                }
            });
        }

        if (boss1Pos && boss2Pos && playerPos) {
            this.updateCamera(boss1Pos, boss2Pos, playerPos, delta);
        }

        if (this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }
}
