import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { VectorUtils } from '../../src/utils/VectorUtils.js';

describe('VectorUtils', () => {
    describe('clampVector', () => {
        it('should clamp vector components to boundaries', () => {
            const vec = new THREE.Vector3(10, 20, 30);
            const min = new THREE.Vector3(0, 0, 0);
            const max = new THREE.Vector3(15, 25, 35);
            VectorUtils.clampVector(vec, min, max);
            expect(vec.x).toBe(10);
            expect(vec.y).toBe(20);
            expect(vec.z).toBe(30);
        });

        it('should clamp values above max', () => {
            const vec = new THREE.Vector3(20, 30, 40);
            const min = new THREE.Vector3(0, 0, 0);
            const max = new THREE.Vector3(15, 25, 35);
            VectorUtils.clampVector(vec, min, max);
            expect(vec.x).toBe(15);
            expect(vec.y).toBe(25);
            expect(vec.z).toBe(35);
        });

        it('should clamp values below min', () => {
            const vec = new THREE.Vector3(-5, -10, -15);
            const min = new THREE.Vector3(0, 0, 0);
            const max = new THREE.Vector3(15, 25, 35);
            VectorUtils.clampVector(vec, min, max);
            expect(vec.x).toBe(0);
            expect(vec.y).toBe(0);
            expect(vec.z).toBe(0);
        });
    });

    describe('clampToBox', () => {
        it('should clamp vector to symmetric box boundaries', () => {
            const vec = new THREE.Vector3(10, 20, 30);
            VectorUtils.clampToBox(vec, 25);
            expect(vec.x).toBe(10);
            expect(vec.y).toBe(20);
            expect(vec.z).toBe(25); // clamped to 25
        });

        it('should handle negative values', () => {
            const vec = new THREE.Vector3(-30, -40, -50);
            VectorUtils.clampToBox(vec, 25);
            expect(vec.x).toBe(-25);
            expect(vec.y).toBe(-25);
            expect(vec.z).toBe(-25);
        });
    });

    describe('fixNaN', () => {
        it('should fix NaN values in vector', () => {
            const vec = new THREE.Vector3(NaN, 5, NaN);
            const defaultValue = new THREE.Vector3(0, 0, 0);
            const fixed = VectorUtils.fixNaN(vec, defaultValue);
            expect(fixed).toBe(true);
            expect(vec.x).toBe(0);
            expect(vec.y).toBe(0);
            expect(vec.z).toBe(0);
        });

        it('should return false if no NaN found', () => {
            const vec = new THREE.Vector3(1, 2, 3);
            const defaultValue = new THREE.Vector3(0, 0, 0);
            const fixed = VectorUtils.fixNaN(vec, defaultValue);
            expect(fixed).toBe(false);
            expect(vec.x).toBe(1);
        });
    });

    describe('safeDistance', () => {
        it('should calculate distance correctly', () => {
            const v1 = new THREE.Vector3(0, 0, 0);
            const v2 = new THREE.Vector3(3, 4, 0);
            const dist = VectorUtils.safeDistance(v1, v2);
            expect(dist).toBe(5); // 3-4-5 triangle
        });

        it('should return Infinity for NaN vectors', () => {
            const v1 = new THREE.Vector3(NaN, 0, 0);
            const v2 = new THREE.Vector3(0, 0, 0);
            const dist = VectorUtils.safeDistance(v1, v2);
            expect(dist).toBe(Infinity);
        });

        it('should return Infinity for null vectors', () => {
            const dist = VectorUtils.safeDistance(null, new THREE.Vector3(0, 0, 0));
            expect(dist).toBe(Infinity);
        });
    });

    describe('directionTo', () => {
        it('should calculate normalized direction vector', () => {
            const source = new THREE.Vector3(0, 0, 0);
            const target = new THREE.Vector3(3, 0, 4);
            const dir = VectorUtils.directionTo(source, target);
            expect(dir.length()).toBeCloseTo(1, 5);
            expect(dir.x).toBeCloseTo(0.6, 1);
            expect(dir.z).toBeCloseTo(0.8, 1);
        });

        it('should return zero vector for same position', () => {
            const source = new THREE.Vector3(5, 5, 5);
            const target = new THREE.Vector3(5, 5, 5);
            const dir = VectorUtils.directionTo(source, target);
            expect(dir.length()).toBe(0);
        });

        it('should return zero vector for null inputs', () => {
            const dir = VectorUtils.directionTo(null, new THREE.Vector3(0, 0, 0));
            expect(dir.length()).toBe(0);
        });
    });
});
