export const MathUtils = {
    randFloat: (min, max) => Math.random() * (max - min) + min,
    randInt: (min, max) => Math.floor(Math.random() * (max - min + 1) + min),
    clamp: (val, min, max) => Math.min(Math.max(val, min), max),
    lerp: (start, end, t) => start * (1 - t) + end * t
};
