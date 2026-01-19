import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { EnvironmentManager } from './Environment.js';
import { CONSTANTS } from '../data/Constants.js';

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

// --- NEW PREMIUM SHADERS ---

const GravitationalLensingShader = {
    uniforms: {
        "tDiffuse": { value: null },
        "center": { value: new THREE.Vector2(0.5, 0.5) },
        "radius": { value: 0.2 },
        "strength": { value: 0.1 }
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
        uniform vec2 center;
        uniform float radius;
        uniform float strength;
        varying vec2 vUv;
        void main() {
            vec2 dir = vUv - center;
            float dist = length(dir);
            if (dist < radius) {
                float f = dist / radius;
                float distortion = (1.0 - f * f) * strength;
                gl_FragColor = texture2D(tDiffuse, vUv - dir * distortion);
            } else {
                gl_FragColor = texture2D(tDiffuse, vUv);
            }
        }
    `
};

const DiffractionSpikeShader = {
    uniforms: {
        "tDiffuse": { value: null },
        "intensity": { value: 0.5 }
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
        uniform float intensity;
        varying vec2 vUv;
        void main() {
            vec4 color = texture2D(tDiffuse, vUv);
            // Simulate 6 or 8 pointed James Webb spikes
            float spike = 0.0;
            vec2 uv = (vUv - 0.5) * 2.0;
            float angle = atan(uv.y, uv.x);
            float dist = length(uv);
            
            // 6-pointed star pattern
            for(int i=0; i<3; i++) {
                float strike = 1.0 - abs(sin(angle + float(i)*1.047)); // 60 degrees
                spike += pow(strike, 100.0) / (dist * 10.0);
            }
            
            gl_FragColor = color + vec4(vec3(spike * intensity), 0.0);
        }
    `
};

const FilmGrainShader = {
    uniforms: {
        "tDiffuse": { value: null },
        "time": { value: 0 },
        "amount": { value: 0.05 }
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
        uniform float amount;
        varying vec2 vUv;
        float rand(vec2 co) {
            return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
        }
        void main() {
            vec4 color = texture2D(tDiffuse, vUv);
            float noise = rand(vUv + time);
            gl_FragColor = color + vec4(vec3(noise * amount), 0.0);
        }
    `
};

const GlitchShader = {
    uniforms: {
        "tDiffuse": { value: null },
        "time": { value: 0 },
        "intensity": { value: 0 }
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
            if (intensity > 0.0) {
                uv.x += (fract(sin(time * 10.0) * 43758.5453) - 0.5) * intensity;
                if (fract(time * 5.0) > 0.8) {
                    uv.y += (fract(cos(time * 8.0) * 43758.5453) - 0.5) * intensity;
                }
            }
            gl_FragColor = texture2D(tDiffuse, uv);
        }
    `
};

const AccretionDiskShader = {
    uniforms: {
        "time": { value: 0 },
        "color1": { value: new THREE.Color(0xff4400) },
        "color2": { value: new THREE.Color(0xff0088) }, // More pinkish for Marvel pop
        "pulse": { value: 1.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        void main() {
            vUv = uv;
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
    `,
    fragmentShader: `
        uniform float time;
        uniform vec3 color1;
        uniform vec3 color2;
        uniform float pulse;
        varying vec2 vUv;
        varying vec3 vPosition;

        float noise(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }

        void main() {
            float dist = length(vPosition.xy);
            float angle = atan(vPosition.y, vPosition.x);
            
            // Swirly energy pattern + Rainbow spectrum
            float spiral = sin(dist * 0.4 - time * 4.0 + angle * 6.0);
            float alpha = smoothstep(70.0, 50.0, dist) * smoothstep(12.0, 25.0, dist);
            
            // Dynamic color shift (Spectrum feel)
            vec3 dynamicColor = mix(color1, color2, sin(time + dist * 0.2) * 0.5 + 0.5);
            dynamicColor = mix(dynamicColor, vec3(1.0, 1.0, 1.0), pow(max(0.0, spiral), 4.0) * 0.6); // White-hot highlights
            
            // Outer prismatic edge
            vec3 edgeColor = vec3(0.0, 0.5, 1.0) * smoothstep(40.0, 50.0, dist);
            finalColor = mix(dynamicColor, edgeColor, 0.4);
            
            finalColor += vec3(1.0, 0.4, 0.2) * pow(max(0.0, spiral), 2.0) * pulse * 2.0;
            
            gl_FragColor = vec4(finalColor, alpha);
        }
    `
};

const EventHorizonShader = {
    uniforms: {
        "time": { value: 0 },
        "color": { value: new THREE.Color(0x110022) }
    },
    vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
    `,
    fragmentShader: `
        uniform float time;
        uniform vec3 color;
        varying vec2 vUv;
        varying vec3 vNormal;
        void main() {
            float fresnel = pow(1.0 - dot(vNormal, vec3(0,0,1)), 3.0);
            float pulse = 0.8 + 0.2 * sin(time * 2.0);
            gl_FragColor = vec4(color * pulse, fresnel * 0.9);
        }
    `
};

export class SceneManager {
    constructor(container) {
        this.container = container;
        this.focusId = null;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x020005); // Deep space dark blue/purple
        this.scene.fog = new THREE.FogExp2(0x020005, 0.001); // Near-zero fog to see nebula background

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 0, 0); // Position relative to group

        this.cameraGroup = new THREE.Group();
        this.cameraGroup.position.set(0, 10, 25);
        this.cameraGroup.add(this.camera);
        this.scene.add(this.cameraGroup);
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
            1.5, // Strength - Reduced for clarity
            1.0, // Radius
            0.6  // Threshold - Higher to avoid bleaching everything
        );
        this.composer.addPass(this.bloomPass);

        this.outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), this.scene, this.camera);
        this.outlinePass.edgeStrength = 8.0;
        this.outlinePass.edgeGlow = 1.0;
        this.outlinePass.edgeThickness = 3.0;
        this.outlinePass.pulsePeriod = 2; // Subtle pulsing
        this.outlinePass.visibleEdgeColor.set('#4488ff'); // Subtle bluish-glow instead of raw white
        this.outlinePass.hiddenEdgeColor.set('#000000');
        this.composer.addPass(this.outlinePass);

        // Expose manager reference on scene so other objects can access scene manager features
        this.scene.__manager = this;

        this.chromaticAberration = new ShaderPass(ChromaticAberrationShader);
        this.composer.addPass(this.chromaticAberration);

        this.voidDistortion = new ShaderPass(VoidDistortionShader);
        this.composer.addPass(this.voidDistortion);

        this.vignette = new ShaderPass(VignetteShader);
        this.composer.addPass(this.vignette);

        // --- Premium Passes ---
        this.lensingPass = new ShaderPass(GravitationalLensingShader);
        this.composer.addPass(this.lensingPass);

        this.spikePass = new ShaderPass(DiffractionSpikeShader);
        this.composer.addPass(this.spikePass);

        this.grainPass = new ShaderPass(FilmGrainShader);
        this.composer.addPass(this.grainPass);

        this.glitchPass = new ShaderPass(GlitchShader);
        this.composer.addPass(this.glitchPass);

        this.nebulae = [];
        this.celestialBodies = [];
        this.planets = [];
        this.energyArcs = [];
        this.shards = [];
        this.stars = [];
        this.loreOrbs = [];
        this.damageNumbers = [];
        this.screenShake = 0;
        this.focusFn = null;
        this.focusTimer = 0;

        this.initLights();
        this.initEnvironment();
        this.initRuins();
        this.initLoreOrbs();
        this.initSpacePollen();
        this.initClickMarker();

        this.environment = new EnvironmentManager(this.scene);

        window.addEventListener('resize', () => this.onWindowResize());

        // Try to dynamically load additional post-processing passes if available (optional)
        import('three/examples/jsm/postprocessing/AfterimagePass.js').then(mod => {
            try {
                const AfterimagePass = mod.AfterimagePass;
                const damp = (CONSTANTS && CONSTANTS.VFX && CONSTANTS.VFX.REDUCED_SHAKE) ? 0.4 : 0.6;
                this.afterimagePass = new AfterimagePass(damp);
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
        this.clickMarker.rotation.x = -Math.PI / 2;
        this.clickMarker.position.y = 0.1;
        this.scene.add(this.clickMarker);
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

    updateClickMarker(pos, delta = 0.016) {
        if (pos) {
            this.clickMarker.position.set(pos.x, 0.1, pos.z);
            this.clickMarker.material.opacity = 1;
        } else {
            const lerpFactor = 1 - Math.exp(-10 * delta);
            this.clickMarker.material.opacity = THREE.MathUtils.lerp(this.clickMarker.material.opacity, 0, lerpFactor);
        }
        const time = (this.totalTime || 0);
        this.clickMarker.scale.setScalar(1 + Math.sin(time * 10) * 0.2);
    }

    initLights() {
        this.scene.add(new THREE.AmbientLight(0x050515, 0.8)); // Melancholic deep space ambient
        this.scene.fog = new THREE.FogExp2(0x010102, 0.005); // More subtle fog

        // Singularity Core Light
        this.mainLight = new THREE.PointLight(0xff7700, 200, 150);
        this.mainLight.position.set(0, 80, -200);
        this.scene.add(this.mainLight);

        // Moody Faction Highlights
        this.voidLight = new THREE.PointLight(0x6600ff, 100, 150);
        this.voidLight.position.set(-50, 30, -100);
        this.scene.add(this.voidLight);

        this.rimLight = new THREE.PointLight(0x00ffff, 150, 200);
        this.rimLight.position.set(50, -20, -100);
        this.scene.add(this.rimLight);
    }

    initEnvironment() {
        if (!this.nebulae) this.nebulae = [];
        if (!this.celestialBodies) this.celestialBodies = [];
        if (!this.energyArcs) this.energyArcs = [];
        if (!this.shards) this.shards = [];

        // Floor with grid (Neon Grid)
        const grid = new THREE.GridHelper(300, 150, 0x00ffff, 0x002222);
        grid.position.y = -1.0;
        this.scene.add(grid);

        // Reflective Dark Floor
        const floorGeo = new THREE.PlaneGeometry(300, 300);
        const floorMat = new THREE.MeshPhysicalMaterial({
            color: 0x050505,
            metalness: 0.8,
            roughness: 0.2,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        this.floor = new THREE.Mesh(floorGeo, floorMat);
        this.floor.rotation.x = -Math.PI / 2;
        this.floor.position.y = -1.1; // Slightly below grid
        this.scene.add(this.floor);

        const createNebulaTexture = (color = '#ff00ff', intensity = 1.0, multiColor = false) => {
            const canvas = document.createElement('canvas');
            canvas.width = 1024;
            canvas.height = 1024;
            const ctx = canvas.getContext('2d');

            // Premium Gas Clouds (Vibrant Marvel Style)
            for (let j = 0; j < 60; j++) {
                const x = Math.random() * 1024;
                const y = Math.random() * 1024;
                const radX = 300 + Math.random() * 700;
                const radY = 150 + Math.random() * 400;

                const gradient = ctx.createRadialGradient(x, y, 0, x, y, radX);

                const palette = [
                    'rgba(255, 0, 255, 0)', // Intense Magenta
                    'rgba(0, 255, 255, 0)', // Electric Cyan
                    'rgba(255, 120, 0, 0)', // Solar Gold
                    'rgba(120, 0, 255, 0)', // Deep Void Violet
                    'rgba(255, 255, 255, 0)' // Energy White
                ];
                const baseColor = palette[Math.floor(Math.random() * palette.length)];
                const alpha = (0.12 + Math.random() * 0.3) * intensity;
                const rgba = baseColor.replace('0)', `${alpha})`);

                gradient.addColorStop(0, rgba);
                gradient.addColorStop(0.5, rgba.replace(`${alpha})`, `${alpha * 0.4})`));
                gradient.addColorStop(1, 'rgba(0,0,0,0)');

                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(Math.random() * Math.PI);
                ctx.scale(1.0, radY / radX);
                ctx.filter = `blur(${10 + Math.random() * 20}px)`;
                ctx.fillStyle = gradient;
                ctx.globalCompositeOperation = 'screen';
                ctx.beginPath();
                ctx.arc(0, 0, radX, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // High-Detail Filaments (Cosmic Dust)
            ctx.globalCompositeOperation = 'overlay';
            for (let k = 0; k < 30; k++) {
                ctx.beginPath();
                ctx.strokeStyle = `rgba(255, 255, 255, 0.1)`;
                ctx.lineWidth = 1 + Math.random() * 40;
                let sx = Math.random() * 1024;
                let sy = Math.random() * 1024;
                ctx.moveTo(sx, sy);
                for (let step = 0; step < 8; step++) {
                    sx += (Math.random() - 0.5) * 400;
                    sy += (Math.random() - 0.5) * 400;
                    ctx.lineTo(sx, sy);
                }
                ctx.stroke();
            }

            return new THREE.CanvasTexture(canvas);
        };

        // Improved Nebula: Multiple Layers for Deep Parallax (James Webb Style)
        const layers = [
            { color: 'rgb(120, 0, 255)', z: -800, scale: 3.5, opacity: 0.4, speed: 0.005 }, // Deepest Void
            { color: 'rgb(255, 0, 150)', z: -600, scale: 3.0, opacity: 0.35, speed: 0.01 },  // Magenta Clouds
            { color: 'rgb(0, 255, 255)', z: -400, scale: 2.5, opacity: 0.3, speed: 0.02 },  // Cyan Energy
            { color: 'rgb(255, 200, 0)', z: -200, scale: 2.0, opacity: 0.2, speed: 0.03 }   // Solar Dust
        ];

        layers.forEach(layer => {
            for (let i = 0; i < 4; i++) {
                const geo = new THREE.PlaneGeometry(1500 * layer.scale, 1500 * layer.scale);
                const mat = new THREE.MeshBasicMaterial({
                    map: createNebulaTexture(layer.color, 1.0, true), // Lower intensity
                    transparent: true,
                    opacity: layer.opacity,
                    depthWrite: false,
                    blending: THREE.AdditiveBlending,
                    side: THREE.DoubleSide
                });
                const nebula = new THREE.Mesh(geo, mat);
                nebula.position.set(
                    (Math.random() - 0.5) * 1200,
                    (Math.random() - 0.5) * 800,
                    layer.z + (Math.random() - 0.5) * 100
                );
                nebula.rotation.z = Math.random() * Math.PI;
                nebula.userData.rotSpeed = (Math.random() - 0.5) * layer.speed;
                this.scene.add(nebula);
                this.nebulae.push(nebula);
            }
        });

        // --- BACKGROUND PLANETS (Subtle, Dark, Marvel Aesthetic) ---
        const planetGeometries = [
            new THREE.SphereGeometry(30, 64, 64),
            new THREE.SphereGeometry(45, 64, 64),
            new THREE.IcosahedronGeometry(25, 3)
        ];
        const planetPositions = [
            new THREE.Vector3(-200, 100, -500),
            new THREE.Vector3(300, -50, -600),
            new THREE.Vector3(-400, -150, -450)
        ];

        planetPositions.forEach((pos, i) => {
            const geo = planetGeometries[i % planetGeometries.length];
            const mat = new THREE.MeshPhysicalMaterial({
                color: 0x010101,
                emissive: i === 0 ? 0x330066 : (i === 1 ? 0x003366 : 0x442200),
                emissiveIntensity: 0.2,
                roughness: 0.8,
                metalness: 0.2,
                sheen: 1.0,
                sheenColor: 0x555555
            });
            const planet = new THREE.Mesh(geo, mat);
            planet.position.copy(pos);
            this.scene.add(planet);
            this.planets.push(planet);

            // Subtle ring for one planet
            if (i === 1) {
                const ringGeo = new THREE.TorusGeometry(70, 0.5, 2, 100);
                const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.2 });
                const ring = new THREE.Mesh(ringGeo, ringMat);
                ring.rotation.x = Math.PI / 2.5;
                planet.add(ring);
            }
        });

        // 2. The "Singularity" Boss Background (Re-engineered for Power)
        const singularityGroup = new THREE.Group();
        singularityGroup.position.set(0, 120, -350);

        // Core Shader
        const coreGeo = new THREE.SphereGeometry(35, 64, 64);
        const coreMat = new THREE.ShaderMaterial({
            uniforms: THREE.UniformsUtils.clone(EventHorizonShader.uniforms),
            vertexShader: EventHorizonShader.vertexShader,
            fragmentShader: EventHorizonShader.fragmentShader,
            transparent: true,
            blending: THREE.NormalBlending
        });
        const core = new THREE.Mesh(coreGeo, coreMat);
        singularityGroup.add(core);

        // Accretion Disk (Larger, more intense)
        const diskGeo = new THREE.TorusGeometry(80, 15, 2, 256);
        const diskMat = new THREE.ShaderMaterial({
            uniforms: THREE.UniformsUtils.clone(AccretionDiskShader.uniforms),
            vertexShader: AccretionDiskShader.vertexShader,
            fragmentShader: AccretionDiskShader.fragmentShader,
            transparent: true,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        const disk = new THREE.Mesh(diskGeo, diskMat);
        disk.rotation.x = Math.PI / 2.1;
        singularityGroup.add(disk);

        // Corona Halo
        const glowGeo = new THREE.PlaneGeometry(400, 400);
        const glowMat = new THREE.MeshBasicMaterial({
            map: createNebulaTexture('rgb(255, 60, 0)', 4.0, true),
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const corona = new THREE.Mesh(glowGeo, glowMat);
        corona.position.z = -5;
        singularityGroup.add(corona);

        // 2c. Multi-Colored Jets (The "Marvel" Beam)
        this.jets = [];
        for (let i = 0; i < 2; i++) {
            const jetGeo = new THREE.CylinderGeometry(5, 40, 1000, 32, 1, true);
            const jetMat = new THREE.MeshBasicMaterial({
                color: i === 0 ? 0x00ffff : 0xff00ff,
                transparent: true,
                opacity: 0.15,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide,
                depthWrite: false
            });
            const jet = new THREE.Mesh(jetGeo, jetMat);
            jet.rotation.x = Math.PI / 2;
            if (i === 1) jet.rotation.z = Math.PI;
            singularityGroup.add(jet);
            this.jets.push(jet);
        }

        // 2b. God Rays / Light Beams from Singularity
        for (let i = 0; i < 6; i++) {
            const rayGeo = new THREE.PlaneGeometry(100, 1000);
            const rayMat = new THREE.MeshBasicMaterial({
                color: 0xffaa00,
                transparent: true,
                opacity: 0.1,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const ray = new THREE.Mesh(rayGeo, rayMat);
            ray.rotation.z = (i / 6) * Math.PI * 2;
            singularityGroup.add(ray);
        }

        this.celestialBodies.push({ group: singularityGroup, disk, corona, core });
        this.scene.add(singularityGroup);

        // 3. Multi-Layered Deep Starfield
        const createStars = (count, size, color, opacity, distance) => {
            const starGeo = new THREE.BufferGeometry();
            const positions = new Float32Array(count * 3);
            for (let i = 0; i < count; i++) {
                const r = distance + Math.random() * 200;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.random() * Math.PI;
                positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
                positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
                positions[i * 3 + 2] = r * Math.cos(phi);
            }
            starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            const starMat = new THREE.PointsMaterial({ color, size, transparent: true, opacity, sizeAttenuation: true });
            return new THREE.Points(starGeo, starMat);
        };

        this.stars = [
            createStars(15000, 0.2, 0xffffff, 0.9, 100),
            createStars(5000, 0.5, 0x00ffff, 0.7, 200),
            createStars(2000, 1.2, 0xffaa00, 0.5, 300)
        ];
        this.stars.forEach(s => this.scene.add(s));

        // 4. Energy Arcs (Marvel Style)
        this.energyArcs = [];
        for (let i = 0; i < 5; i++) {
            const curve = new THREE.CatmullRomCurve3([
                new THREE.Vector3((Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100, -100),
                new THREE.Vector3((Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100, -150),
                new THREE.Vector3((Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100, -200)
            ]);
            const tubeGeo = new THREE.TubeGeometry(curve, 20, 0.2, 8, false);
            const tubeMat = new THREE.MeshStandardMaterial({
                color: i % 2 === 0 ? 0x00ffff : 0xff00ff,
                emissive: i % 2 === 0 ? 0x00ffff : 0xff00ff,
                emissiveIntensity: 10,
                transparent: true,
                opacity: 0.4
            });
            const arc = new THREE.Mesh(tubeGeo, tubeMat);
            this.scene.add(arc);
            this.energyArcs.push(arc);
        }

        // 5. Obsidian Shards (Sinister Cosmic Debris)
        this.shards = [];
        for (let i = 0; i < 50; i++) {
            const geo = new THREE.IcosahedronGeometry(Math.random() * 1.5 + 0.5, 0);
            const mat = new THREE.MeshPhysicalMaterial({
                color: 0x050505,
                metalness: 1,
                roughness: 0.1,
                emissive: 0x220033,
                emissiveIntensity: 0.5,
                transmission: 0.1,
                thickness: 0.5
            });
            const shard = new THREE.Mesh(geo, mat);
            shard.position.set((Math.random() - 0.5) * 200, (Math.random() - 0.5) * 150, (Math.random() - 0.5) * 200);
            shard.rotation.set(Math.random(), Math.random(), Math.random());
            shard.userData.rotSpeed = new THREE.Vector3(Math.random() * 0.01, Math.random() * 0.01, Math.random() * 0.01);
            this.scene.add(shard);
            this.shards.push(shard);
        }

        // 5. Cosmic Energy Wisps (Marvel Style)
        this.energyWisps = [];
        for (let i = 0; i < 12; i++) {
            const curve = new THREE.CatmullRomCurve3([
                new THREE.Vector3((Math.random() - 0.5) * 400, (Math.random() - 0.5) * 300, -200 - Math.random() * 200),
                new THREE.Vector3((Math.random() - 0.5) * 400, (Math.random() - 0.5) * 300, -200 - Math.random() * 200),
                new THREE.Vector3((Math.random() - 0.5) * 400, (Math.random() - 0.5) * 300, -200 - Math.random() * 200)
            ]);
            const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.5, 8, false);
            const tubeMat = new THREE.MeshBasicMaterial({
                color: i % 2 === 0 ? 0xff00ff : 0x00ffff,
                transparent: true,
                opacity: 0.2,
                blending: THREE.AdditiveBlending
            });
            const wisp = new THREE.Mesh(tubeGeo, tubeMat);
            this.scene.add(wisp);
            this.energyWisps.push({ mesh: wisp, offset: Math.random() * 10 });
        }

        this.initVoidSmoke();
    }

    initRuins() {
        // Ethereal Monoliths - Marvel style floaty structures
        for (let i = 0; i < 15; i++) {
            const height = 10 + Math.random() * 15;
            const geo = new THREE.CylinderGeometry(1, 1, height, 4);
            const mat = new THREE.MeshPhysicalMaterial({
                color: 0x010101,
                emissive: 0x00ffff,
                emissiveIntensity: 0.2,
                metalness: 1,
                roughness: 0.2
            });
            const pillar = new THREE.Mesh(geo, mat);
            const angle = Math.random() * Math.PI * 2;
            const radius = 40 + Math.random() * 20;
            pillar.position.set(Math.cos(angle) * radius, height / 2 - 5, Math.sin(angle) * radius);
            pillar.rotation.set((Math.random() - 0.5) * 0.5, Math.random() * Math.PI, (Math.random() - 0.5) * 0.4);
            pillar.userData.floating = true;
            pillar.userData.offset = Math.random() * 10;
            this.scene.add(pillar);
            this.shards.push(pillar); // Reuse shards array for animation
        }
    }

    initLoreOrbs() {
        this.loreOrbs = [];
        const lorePoints = [
            { pos: new THREE.Vector3(30, 2, 30), text: "The Singularity consumes all light, yet births infinite possibilities." },
            { pos: new THREE.Vector3(-40, 2, -20), text: "These ruins predate the emergence of the Gold Boss." },
            { pos: new THREE.Vector3(0, 2, -80), text: "The accretion disk's pulse is the only clock in this void." }
        ];

        lorePoints.forEach(data => {
            const geo = new THREE.SphereGeometry(1, 16, 16);
            const mat = new THREE.MeshBasicMaterial({
                color: 0x00ffff,
                transparent: true,
                opacity: 0.6,
                blending: THREE.AdditiveBlending
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(data.pos);
            this.scene.add(mesh);
            this.loreOrbs.push({ mesh, text: data.text, discovered: false });
        });
    }

    initSpacePollen() {
        // 5. Space Pollen (Vibrant Particles)
        const pollenGeo = new THREE.BufferGeometry();
        const pollenCount = 1000;
        const pollenPos = new Float32Array(pollenCount * 3);
        const pollenCols = new Float32Array(pollenCount * 3);
        const rand = (min, max) => Math.random() * (max - min) + min;

        for (let i = 0; i < pollenCount; i++) {
            pollenPos[i * 3] = rand(-150, 150);
            pollenPos[i * 3 + 1] = rand(-150, 150);
            pollenPos[i * 3 + 2] = rand(-150, 150);
            const c = new THREE.Color().setHSL(Math.random(), 1.0, 0.5);
            pollenCols[i * 3] = c.r;
            pollenCols[i * 3 + 1] = c.g;
            pollenCols[i * 3 + 2] = c.b;
        }
        pollenGeo.setAttribute('position', new THREE.BufferAttribute(pollenPos, 3));
        pollenGeo.setAttribute('color', new THREE.BufferAttribute(pollenCols, 3));
        const pollenMat = new THREE.PointsMaterial({
            size: 0.5,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        this.pollen = new THREE.Points(pollenGeo, pollenMat);
        this.scene.add(this.pollen);
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
            color: 0x440088, // Purple/Void smoke
            size: 0.8,
            transparent: true,
            opacity: 0.2,
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
        if (!this.damageNumbers) this.damageNumbers = [];
        this.damageNumbers.push({ sprite, life: 1.0, vel: new THREE.Vector3((Math.random() - 0.5) * 0.1, 0.1, 0) });
    }

    updateParticles(delta, playerPos) {
        if (this.smoke) {
            const pos = this.smoke.geometry.attributes.position.array;
            const factor = delta * 60;
            for (let i = 0; i < 100; i++) {
                pos[i * 3 + 1] += this.smokeVel[i * 3 + 1] * factor;
                if (pos[i * 3 + 1] > 20) pos[i * 3 + 1] = 0;
                // Add swirly noise to smoke
                pos[i * 3] += Math.sin(this.totalTime + i) * 0.02;
            }
            this.smoke.geometry.attributes.position.needsUpdate = true;
        }

        if (this.pollen) {
            this.pollen.rotation.y += delta * 0.05;
            this.pollen.rotation.z += delta * 0.02;
            const s = 1 + Math.sin(this.totalTime * 0.5) * 0.05;
            this.pollen.scale.set(s, s, s);
        }

        // Space Parallax (James Webb Depth)
        if (playerPos) {
            if (this.stars) {
                this.stars.forEach((s, i) => {
                    const factor = 0.002 * (i + 1);
                    s.position.x = -playerPos.x * factor;
                    s.position.z = -playerPos.z * factor;
                    s.rotation.y += delta * 0.005;
                });
            }

            if (this.nebulae) {
                this.nebulae.forEach((n, i) => {
                    const factor = 0.005 + (Math.abs(n.position.z) / 10000);
                    n.position.x += -playerPos.x * factor * 0.5;
                    n.position.y += -playerPos.y * factor * 0.2;
                });
            }

            if (this.planets) {
                this.planets.forEach(p => {
                    const factor = 0.001;
                    p.position.x += -playerPos.x * factor;
                    p.rotation.y += delta * 0.01;
                });
            }
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

        // Update Energy Wisps
        if (this.energyWisps) {
            this.energyWisps.forEach((w, i) => {
                w.mesh.rotation.z += delta * 0.1;
                w.mesh.material.opacity = 0.1 + Math.sin(this.totalTime + w.offset) * 0.1;
            });
        }

        // Chromatic Aberration Damping (Cinematic pulse)
        if (this.chromaticAberration) {
            const pulse = 0.002 + Math.sin(this.totalTime * 2.0) * 0.001;
            this.chromaticAberration.uniforms.amount.value = THREE.MathUtils.lerp(
                this.chromaticAberration.uniforms.amount.value,
                pulse,
                1 - Math.exp(-3.0 * delta)
            );
        }
    }

    triggerImpactEffect() {
        if (this.chromaticAberration) {
            this.chromaticAberration.uniforms.amount.value = 0.012; // Reduced from 0.02
        }
        this.triggerScreenShake(0.35); // Reduced from 0.5
        this.triggerGlitch(0.1);
    }

    triggerGlitch(intensity) {
        if (this.glitchPass) {
            this.glitchPass.uniforms.intensity.value = intensity;
        }
    }

    triggerScreenShake(intensity) {
        this.screenShake = intensity;
    }

    setFocus(targetFn, duration = 3.0) {
        this.focusFn = targetFn;
        this.focusTimer = duration;
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
            targetCamPos = playerPos.clone(); // Camera is at playerPos
            targetMid = playerPos.clone().add(new THREE.Vector3(0, 0, -10)); // Look forward
        }

        // Smoothly lerp camera group position
        // Using frame-rate independent lerp approx: target = current + (target - current) * (1 - exp(-speed * delta))
        const lerpSpeed = 5.0;
        const lerpFactor = 1 - Math.exp(-lerpSpeed * delta);
        this.cameraGroup.position.lerp(targetCamPos, lerpFactor);

        // Smoothly lerp lookAt
        if (!this.camLookAt) this.camLookAt = new THREE.Vector3(0, 0, 0);
        this.camLookAt.lerp(targetMid, lerpFactor);
        this.camera.lookAt(this.camLookAt);

        // Dynamic FOV
        const dist = boss1Pos.distanceTo(boss2Pos);
        const targetFOV = this.focusTarget ? 50 : Math.max(45, Math.min(75, 45 + dist * 1.5));
        this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFOV, lerpFactor);
        this.camera.updateProjectionMatrix();
    }

    render(delta, boss1Pos, boss2Pos, playerPos, entities) {
        if (!this.totalTime) this.totalTime = 0;
        this.totalTime += delta;
        const time = this.totalTime;

        // Animate Environment
        this.nebulae.forEach(n => {
            n.rotation.z += n.userData.rotSpeed * delta;
        });

        this.celestialBodies.forEach(b => {
            if (b.disk) {
                if (b.disk.material.uniforms) {
                    b.disk.material.uniforms.time.value = time;
                }
            }
            if (b.corona) {
                b.corona.rotation.z -= delta * 0.15;
                b.corona.scale.setScalar(1 + Math.sin(time * 0.8) * 0.1);
                // Vibrant Spectrum Shift 
                const hue = (time * 0.05) % 1.0;
                b.corona.material.color.setHSL(hue, 0.9, 0.6);
            }
            if (b.core && b.core.material.uniforms) {
                b.core.material.uniforms.time.value = time;
            }
        });

        if (this.jets) {
            this.jets.forEach((j, i) => {
                j.rotation.y += delta * 0.5;
                j.scale.x = 1 + Math.sin(time * 2 + i) * 0.2;
                j.material.opacity = 0.1 + Math.sin(time * 3 + i) * 0.05;
            });
        }

        if (this.shards) {
            this.shards.forEach(s => {
                s.rotation.x += s.userData.rotSpeed?.x || 0.001;
                s.rotation.y += s.userData.rotSpeed?.y || 0.001;
                if (s.userData.floating) {
                    s.position.y += Math.sin(time + (s.userData.offset || 0)) * 0.01;
                }
            });
        }

        if (this.energyArcs) {
            this.energyArcs.forEach((a, i) => {
                a.material.emissiveIntensity = 5 + Math.sin(time * 3 + i) * 5;
                a.rotation.y += delta * 0.1;
            });
        }

        this.updateParticles(delta, playerPos);
        if (this.environment) this.environment.update(delta, entities);

        // Update Shaders
        if (this.voidDistortion) {
            this.voidDistortion.uniforms.time.value = time;
            this.voidDistortion.uniforms.intensity.value = 0.002 + Math.sin(time * 0.5) * 0.001; // Very subtle
        }

        // Dynamic Lighting
        if (this.mainLight) {
            this.mainLight.intensity = 100 + Math.sin(time * 4) * 20;
            if (boss1Pos) {
                const lerpFactor = 1 - Math.exp(-6.0 * delta);
                this.mainLight.position.lerp(boss1Pos, lerpFactor);
            }
        }

        if (this.voidLight) {
            this.voidLight.intensity = 50 + Math.sin(time * 2) * 30;
            this.voidLight.position.x = Math.sin(time * 1) * 20;
            this.voidLight.position.z = Math.cos(time * 1) * 20;
        }

        // Update Screen Shake (Applied to internal camera position relative to group)
        if (this.screenShake > 0) {
            this.camera.position.x = (Math.random() - 0.5) * this.screenShake;
            this.camera.position.y = (Math.random() - 0.5) * this.screenShake;

            // Delta-based damping for screen shake
            const shakeDamping = Math.pow(0.01, delta); // Damps significantly over 1 second
            this.screenShake *= shakeDamping;

            if (this.screenShake < 0.01) {
                this.screenShake = 0;
                this.camera.position.set(0, 0, 0);
            }
        } else {
            this.camera.position.set(0, 0, 0);
        }

        // Update Lore Orbs
        if (playerPos) {
            this.loreOrbs.forEach(orb => {
                const dist = orb.mesh.position.distanceTo(playerPos);
                orb.mesh.rotation.y += delta * 2;
                orb.mesh.scale.setScalar(1 + Math.sin(time * 5) * 0.2);

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
            // Update Selected Objects for Outline
            const highlightObjects = [];
            if (entities) {
                entities.forEach(ent => {
                    // Skip the NPC being viewed (the focused one) to keep it clean
                    if (this.focusId === ent.id) return;

                    const obj = this.scene.getObjectByName(ent.id);
                    if (obj) highlightObjects.push(obj);
                });
            }
            if (this.outlinePass) this.outlinePass.selectedObjects = highlightObjects;

            // Update Premium Shader values
            if (this.lensingPass && this.celestialBodies.length > 0) {
                const singularity = this.celestialBodies[0].group;
                if (singularity) {
                    const vector = singularity.position.clone();
                    vector.project(this.camera);

                    this.lensingPass.uniforms.center.value.set(
                        (vector.x + 1) / 2,
                        (vector.y + 1) / 2
                    );

                    // Adjust strength based on distance to center
                    const distToPlayer = playerPos ? 1.0 - (singularity.position.clone().setY(0).distanceTo(playerPos.clone().setY(0)) / 200) : 0.5;
                    this.lensingPass.uniforms.strength.value = 0.1 + Math.max(0, distToPlayer) * 0.25;
                }
            }

            if (this.vignette) {
                this.vignette.uniforms.offset.value = 1.25;
                this.vignette.uniforms.darkness.value = 1.3;
            }

            if (this.spikePass) {
                this.spikePass.uniforms.intensity.value = 0.5 + Math.sin(time * 0.5) * 0.3;
            }

            if (this.grainPass) {
                this.grainPass.uniforms.time.value = time;
            }

            if (this.glitchPass) {
                this.glitchPass.uniforms.time.value = time;
                // Slowly decay glitch
                this.glitchPass.uniforms.intensity.value *= 0.92;
            }

            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }
}
