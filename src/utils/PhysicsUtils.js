import * as THREE from 'three';

/**
 * Physics constants
 */
export const PHYSICS_CONSTANTS = {
    DEFAULT_MAX_SPEED: 0.08,
    DEFAULT_MAX_FORCE: 0.02,
    DEFAULT_NEIGHBOR_DISTANCE: 4.0,
    DEFAULT_ARRIVAL_DISTANCE: 5.0,
    WANDER_ANGLE_CHANGE_RATE: 0.05,
    WANDER_CIRCLE_DISTANCE: 2.0,
    SEPARATION_MULTIPLIER: 1.5,
    SEPARATION_STRENGTH_MULTIPLIER: 3.0
};

/**
 * Physics utilities for boids and movement behaviors
 */
export const PhysicsUtils = {
    /**
     * Seek behavior: steer towards a target
     * @param {THREE.Vector3} position - Current position
     * @param {THREE.Vector3} target - Target position
     * @param {THREE.Vector3} velocity - Current velocity
     * @param {number} maxSpeed - Maximum speed
     * @param {number} maxForce - Maximum steering force
     * @returns {THREE.Vector3} Steering force
     */
    seek(position, target, velocity, maxSpeed, maxForce) {
        if (!target || isNaN(target.x)) return new THREE.Vector3();
        const desired = target.clone().sub(position);
        desired.normalize().multiplyScalar(maxSpeed);
        const steer = desired.sub(velocity);
        steer.clampLength(0, maxForce);
        return steer;
    },

    /**
     * Separation behavior: steer away from neighbors
     * @param {THREE.Vector3} position - Current position
     * @param {Array} others - Array of other entities with position property
     * @param {number} neighborDist - Distance to consider as neighbor
     * @param {number} maxSpeed - Maximum speed
     * @param {number} maxForce - Maximum steering force
     * @param {THREE.Vector3} velocity - Current velocity (optional)
     * @returns {THREE.Vector3} Steering force
     */
    separate(position, others, neighborDist, maxSpeed, maxForce, velocity) {
        const steer = new THREE.Vector3();
        let count = 0;

        others.forEach(other => {
            if (!other || !other.position) return;
            const d = position.distanceTo(other.position);
            const avoidanceDist = other.radius ? neighborDist + other.radius : neighborDist;

            if (d > 0.001 && d < avoidanceDist) {
                const diff = position.clone().sub(other.position);
                diff.normalize().divideScalar(d);
                steer.add(diff);
                count++;
            }
        });

        if (count > 0) {
            steer.divideScalar(count);
        }

        if (steer.length() > 0) {
            steer.normalize().multiplyScalar(maxSpeed);
            steer.sub(velocity || new THREE.Vector3());
            steer.clampLength(0, maxForce * PHYSICS_CONSTANTS.SEPARATION_STRENGTH_MULTIPLIER);
        }
        return steer;
    },

    /**
     * Wander behavior: random walk
     * @param {THREE.Vector3} velocity - Current velocity
     * @param {number} wanderAngle - Current wander angle (will be mutated)
     * @param {number} maxForce - Maximum steering force
     * @returns {Object} { force: THREE.Vector3, wanderAngle: number }
     */
    wander(velocity, wanderAngle, maxForce) {
        // Randomly change wander angle
        let newAngle = wanderAngle || 0;
        if (Math.random() < PHYSICS_CONSTANTS.WANDER_ANGLE_CHANGE_RATE) {
            newAngle += (Math.random() - 0.5) * 2.0;
        }

        const normalizedVel = velocity.clone().normalize();
        const center = normalizedVel.multiplyScalar(PHYSICS_CONSTANTS.WANDER_CIRCLE_DISTANCE);
        const offset = new THREE.Vector3(
            Math.cos(newAngle),
            0,
            Math.sin(newAngle)
        );
        const force = center.add(offset).normalize().multiplyScalar(maxForce * 0.5);
        
        return { force, wanderAngle: newAngle };
    },

    /**
     * Apply force to acceleration (with NaN safety)
     * @param {THREE.Vector3} acceleration - Acceleration vector to modify
     * @param {THREE.Vector3} force - Force to apply
     * @returns {boolean} True if force was valid and applied
     */
    applyForce(acceleration, force) {
        if (!force || isNaN(force.x) || isNaN(force.y) || isNaN(force.z)) {
            return false;
        }
        acceleration.add(force);
        return true;
    },

    /**
     * Update physics: apply velocity to position
     * @param {THREE.Vector3} position - Position to update
     * @param {THREE.Vector3} velocity - Velocity vector
     * @param {THREE.Vector3} acceleration - Acceleration vector
     * @param {number} maxSpeed - Maximum speed to clamp to
     */
    updatePhysics(position, velocity, acceleration, maxSpeed) {
        velocity.add(acceleration);
        velocity.clampLength(0, maxSpeed);
        position.add(velocity);
        acceleration.set(0, 0, 0);
    }
};
