import { vi, describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { SceneManager } from '../src/world/Scene.js';

// Mock EffectComposer and other post-processing
vi.mock('three', async () => {
    const actual = await vi.importActual('three');
    return {
        ...actual,
        WebGLRenderer: vi.fn().mockImplementation(() => ({
            setSize: vi.fn(),
            setPixelRatio: vi.fn(),
            render: vi.fn(),
            domElement: document.createElement('canvas'),
            toneMapping: 0,
            shadowMap: {},
            capabilities: { isWebGL2: false },
            getContext: vi.fn(() => ({})),
        })),
    };
});

vi.mock('three/examples/jsm/postprocessing/EffectComposer.js', () => ({
    EffectComposer: vi.fn(() => ({
        addPass: vi.fn(),
        setSize: vi.fn(),
        render: vi.fn(),
    })),
}));

vi.mock('three/examples/jsm/postprocessing/RenderPass.js', () => ({
    RenderPass: vi.fn(),
}));

vi.mock('three/examples/jsm/postprocessing/UnrealBloomPass.js', () => ({
    UnrealBloomPass: vi.fn(),
}));

vi.mock('three/examples/jsm/postprocessing/ShaderPass.js', () => ({
    ShaderPass: vi.fn(),
}));

describe('SceneManager Camera System', () => {
    let container;
    let sceneManager;

    beforeEach(() => {
        container = document.createElement('div');
        sceneManager = new SceneManager(container);
    });

    it('should initialize with a cameraGroup', () => {
        expect(sceneManager.cameraGroup).toBeDefined();
        expect(sceneManager.cameraGroup.children).toContain(sceneManager.camera);
    });

    it('should have a smooth lerp factor in updateCamera', () => {
        const boss1 = new THREE.Vector3(10, 0, 0);
        const boss2 = new THREE.Vector3(-10, 0, 0);
        const player = new THREE.Vector3(0, 0, 20);

        const initialPos = sceneManager.cameraGroup.position.clone();
        sceneManager.updateCamera(boss1, boss2, player, 0.016);

        // Should move towards player
        expect(sceneManager.cameraGroup.position.z).toBeLessThan(25);
        expect(sceneManager.cameraGroup.position.z).toBeGreaterThan(0);
    });

    it('should damp screen shake over time', () => {
        sceneManager.triggerScreenShake(1.0);
        expect(sceneManager.screenShake).toBe(1.0);

        // Render one frame with delta
        sceneManager.render(0.1, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0), []);

        // Shake should be reduced
        expect(sceneManager.screenShake).toBeLessThan(1.0);
    });
});
