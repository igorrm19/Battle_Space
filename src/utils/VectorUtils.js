import * as THREE from 'three';

/**
 * Vector3 utilities for common operations
 */
export const VectorUtils = {
    /**
     * Clamp vector components to boundaries
     * @param {THREE.Vector3} vec - Vector to clamp
     * @param {THREE.Vector3} min - Minimum bounds
     * @param {THREE.Vector3} max - Maximum bounds
     * @returns {THREE.Vector3} Clamped vector
     */
    clampVector(vec, min, max) {
        vec.x = THREE.MathUtils.clamp(vec.x, min.x, max.x);
        vec.y = THREE.MathUtils.clamp(vec.y, min.y, max.y);
        vec.z = THREE.MathUtils.clamp(vec.z, min.z, max.z);
        return vec;
    },

    /**
     * Clamp vector to box boundaries (symmetric)
     * @param {THREE.Vector3} vec - Vector to clamp
     * @param {number} bound - Boundary distance from origin
     * @returns {THREE.Vector3} Clamped vector
     */
    clampToBox(vec, bound) {
        vec.x = THREE.MathUtils.clamp(vec.x, -bound, bound);
        vec.y = THREE.MathUtils.clamp(vec.y, -bound, bound);
        vec.z = THREE.MathUtils.clamp(vec.z, -bound, bound);
        return vec;
    },

    /**
     * Check if vector has NaN values and fix them
     * @param {THREE.Vector3} vec - Vector to check
     * @param {THREE.Vector3} defaultValue - Default value to use if NaN found
     * @returns {boolean} True if NaN was found and fixed
     */
    fixNaN(vec, defaultValue) {
        if (isNaN(vec.x) || isNaN(vec.y) || isNaN(vec.z)) {
            vec.copy(defaultValue);
            return true;
        }
        return false;
    },

    /**
     * Safe distance calculation (handles NaN)
     * @param {THREE.Vector3} v1 - First vector
     * @param {THREE.Vector3} v2 - Second vector
     * @returns {number} Distance or Infinity if invalid
     */
    safeDistance(v1, v2) {
        if (!v1 || !v2) return Infinity;
        if (isNaN(v1.x) || isNaN(v1.y) || isNaN(v1.z) || 
            isNaN(v2.x) || isNaN(v2.y) || isNaN(v2.z)) {
            return Infinity;
        }
        return v1.distanceTo(v2);
    },

    /**
     * Create a normalized direction vector from source to target
     * @param {THREE.Vector3} source - Source position
     * @param {THREE.Vector3} target - Target position
     * @returns {THREE.Vector3} Normalized direction vector, or zero vector if invalid
     */
    directionTo(source, target) {
        if (!source || !target) return new THREE.Vector3();
        const dir = target.clone().sub(source);
        if (dir.lengthSq() < 0.0001) return new THREE.Vector3();
        return dir.normalize();
    }
};





