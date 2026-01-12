import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { PhysicsUtils, PHYSICS_CONSTANTS } from '../../src/utils/PhysicsUtils.js';

describe('PhysicsUtils', () => {
    describe('seek', () => {
        it('should return steering force towards target', () => {
            const position = new THREE.Vector3(0, 0, 0);
            const target = new THREE.Vector3(10, 0, 0);
            const velocity = new THREE.Vector3(0, 0, 0);
            const maxSpeed = 1.0;
            const maxForce = 0.5;

            const steer = PhysicsUtils.seek(position, target, velocity, maxSpeed, maxForce);
            expect(steer.length()).toBeLessThanOrEqual(maxForce);
            expect(steer.x).toBeGreaterThan(0);
        });

        it('should return zero vector for NaN target', () => {
            const position = new THREE.Vector3(0, 0, 0);
            const target = new THREE.Vector3(NaN, 0, 0);
            const velocity = new THREE.Vector3(0, 0, 0);
            const steer = PhysicsUtils.seek(position, target, velocity, 1.0, 0.5);
            expect(steer.length()).toBe(0);
        });

        it('should return zero vector for null target', () => {
            const position = new THREE.Vector3(0, 0, 0);
            const steer = PhysicsUtils.seek(position, null, new THREE.Vector3(), 1.0, 0.5);
            expect(steer.length()).toBe(0);
        });
    });

    describe('separate', () => {
        it('should return separation force away from neighbors', () => {
            const position = new THREE.Vector3(0, 0, 0);
            const others = [
                { position: new THREE.Vector3(1, 0, 0) },
                { position: new THREE.Vector3(0, 1, 0) }
            ];
            const neighborDist = 5.0;
            const maxSpeed = 1.0;
            const maxForce = 0.5;

            const steer = PhysicsUtils.separate(position, others, neighborDist, maxSpeed, maxForce);
            expect(steer.length()).toBeGreaterThan(0);
            expect(steer.length()).toBeLessThanOrEqual(maxForce * PHYSICS_CONSTANTS.SEPARATION_STRENGTH_MULTIPLIER);
        });

        it('should ignore entities beyond neighbor distance', () => {
            const position = new THREE.Vector3(0, 0, 0);
            const others = [
                { position: new THREE.Vector3(10, 0, 0) } // Too far
            ];
            const steer = PhysicsUtils.separate(position, others, 5.0, 1.0, 0.5);
            expect(steer.length()).toBe(0);
        });

        it('should handle entities with radius', () => {
            const position = new THREE.Vector3(0, 0, 0);
            const others = [
                { position: new THREE.Vector3(3, 0, 0), radius: 2.0 } // Within 5.0 (3 + 2)
            ];
            const steer = PhysicsUtils.separate(position, others, 4.0, 1.0, 0.5, new THREE.Vector3());
            expect(steer.length()).toBeGreaterThan(0);
        });

        it('should handle empty others array', () => {
            const position = new THREE.Vector3(0, 0, 0);
            const steer = PhysicsUtils.separate(position, [], 5.0, 1.0, 0.5);
            expect(steer.length()).toBe(0);
        });
    });

    describe('wander', () => {
        it('should return wander force and angle', () => {
            const velocity = new THREE.Vector3(1, 0, 0);
            const wanderAngle = 0;
            const maxForce = 0.5;

            const result = PhysicsUtils.wander(velocity, wanderAngle, maxForce);
            expect(result).toHaveProperty('force');
            expect(result).toHaveProperty('wanderAngle');
            expect(result.force).toBeInstanceOf(THREE.Vector3);
            expect(typeof result.wanderAngle).toBe('number');
        });

        it('should return force with correct magnitude', () => {
            const velocity = new THREE.Vector3(1, 0, 0);
            const maxForce = 0.5;
            const result = PhysicsUtils.wander(velocity, 0, maxForce);
            expect(result.force.length()).toBeLessThanOrEqual(maxForce * 0.5);
        });
    });

    describe('applyForce', () => {
        it('should apply valid force to acceleration', () => {
            const acceleration = new THREE.Vector3(0, 0, 0);
            const force = new THREE.Vector3(1, 0, 0);
            const applied = PhysicsUtils.applyForce(acceleration, force);
            expect(applied).toBe(true);
            expect(acceleration.x).toBe(1);
        });

        it('should not apply NaN force', () => {
            const acceleration = new THREE.Vector3(0, 0, 0);
            const force = new THREE.Vector3(NaN, 0, 0);
            const applied = PhysicsUtils.applyForce(acceleration, force);
            expect(applied).toBe(false);
            expect(acceleration.x).toBe(0);
        });

        it('should not apply null force', () => {
            const acceleration = new THREE.Vector3(0, 0, 0);
            const applied = PhysicsUtils.applyForce(acceleration, null);
            expect(applied).toBe(false);
            expect(acceleration.length()).toBe(0);
        });
    });

    describe('updatePhysics', () => {
        it('should update position based on velocity and acceleration', () => {
            const position = new THREE.Vector3(0, 0, 0);
            const velocity = new THREE.Vector3(0, 0, 0);
            const acceleration = new THREE.Vector3(1, 0, 0);
            const maxSpeed = 2.0;

            PhysicsUtils.updatePhysics(position, velocity, acceleration, maxSpeed);
            expect(position.x).toBeGreaterThan(0);
            expect(acceleration.length()).toBe(0); // Should be reset
        });

        it('should clamp velocity to maxSpeed', () => {
            const position = new THREE.Vector3(0, 0, 0);
            const velocity = new THREE.Vector3(0, 0, 0);
            const acceleration = new THREE.Vector3(10, 0, 0); // Large acceleration
            const maxSpeed = 1.0;

            PhysicsUtils.updatePhysics(position, velocity, acceleration, maxSpeed);
            expect(velocity.length()).toBeLessThanOrEqual(maxSpeed);
        });
    });
});
