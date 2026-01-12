import { describe, it, expect } from 'vitest';
import { SpawnRules } from '../../src/game/rules/SpawnRules.js';

describe('SpawnRules', () => {
    describe('generateWeightedLevel', () => {
        it('should return level between 1 and 20', () => {
            for (let i = 0; i < 100; i++) {
                const level = SpawnRules.generateWeightedLevel();
                expect(level).toBeGreaterThanOrEqual(1);
                expect(level).toBeLessThanOrEqual(20);
            }
        });

        it('should return integer', () => {
            for (let i = 0; i < 100; i++) {
                const level = SpawnRules.generateWeightedLevel();
                expect(Number.isInteger(level)).toBe(true);
            }
        });

        it('should favor lower levels', () => {
            let lowLevelCount = 0;
            for (let i = 0; i < 1000; i++) {
                const level = SpawnRules.generateWeightedLevel();
                if (level <= 4) lowLevelCount++;
            }
            // Should have more low levels than high levels
            expect(lowLevelCount).toBeGreaterThan(400);
        });
    });

    describe('getInitialNPCConfigs', () => {
        it('should return array of configs', () => {
            const configs = SpawnRules.getInitialNPCConfigs();
            expect(Array.isArray(configs)).toBe(true);
            expect(configs.length).toBeGreaterThan(0);
        });

        it('should have required properties in each config', () => {
            const configs = SpawnRules.getInitialNPCConfigs();
            configs.forEach(config => {
                expect(config).toHaveProperty('id');
                expect(config).toHaveProperty('faction');
                expect(config).toHaveProperty('class');
                expect(config).toHaveProperty('index');
            });
        });

        it('should have valid factions', () => {
            const configs = SpawnRules.getInitialNPCConfigs();
            const validFactions = ['player', 'void', 'gold'];
            configs.forEach(config => {
                expect(validFactions).toContain(config.faction);
            });
        });
    });

    describe('generateRandomNPCConfig', () => {
        it('should return config with required properties', () => {
            const config = SpawnRules.generateRandomNPCConfig();
            expect(config).toHaveProperty('id');
            expect(config).toHaveProperty('faction');
            expect(config).toHaveProperty('class');
            expect(config).toHaveProperty('level');
            expect(config).toHaveProperty('index');
        });

        it('should have valid faction', () => {
            const validFactions = ['player', 'void', 'gold'];
            for (let i = 0; i < 100; i++) {
                const config = SpawnRules.generateRandomNPCConfig();
                expect(validFactions).toContain(config.faction);
            }
        });

        it('should have level within valid range', () => {
            for (let i = 0; i < 100; i++) {
                const config = SpawnRules.generateRandomNPCConfig();
                expect(config.level).toBeGreaterThanOrEqual(1);
                expect(config.level).toBeLessThanOrEqual(20);
            }
        });
    });
});
