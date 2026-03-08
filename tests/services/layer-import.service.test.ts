/**
 * Unit tests for LayerImportService
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { layerImportService } from '../../src/services/layer-import.service';
import type { KeyboardInfo } from '../../src/types/vial.types';
import type { ViableFileContent } from '../../src/types/layout-library';

describe('LayerImportService', () => {
    let targetKeyboard: KeyboardInfo;
    let sourceLayout: ViableFileContent;

    beforeEach(() => {
        // Create a basic target keyboard
        targetKeyboard = {
            rows: 4,
            cols: 4,
            layers: 4,
            keymap: [
                [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], // Layer 0
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],       // Layer 1 (empty)
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],       // Layer 2 (empty)
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],       // Layer 3 (empty)
            ],
            macros: [],
            combos: [],
            tapdances: [],
            macro_count: 8,
            combo_count: 16,
            tapdance_count: 8,
        };

        // Create a source layout
        sourceLayout = {
            keymap: [
                [101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116], // Layer 0
                [201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216], // Layer 1
            ],
            macros: [
                { mid: 0, actions: [['tap', 'KC_A'], ['tap', 'KC_B']] },
                { mid: 1, actions: [['tap', 'KC_C']] },
            ],
            combos: [
                { cmbid: 0, keys: ['KC_A', 'KC_S'], output: 'KC_ESC' },
            ],
            tapdances: [
                { idx: 0, tap: 'KC_A', hold: 'KC_LCTL', doubletap: 'KC_B', taphold: 'KC_C', tapping_term: 200 },
            ],
            cosmetic: {
                layer: {
                    '0': 'Base',
                    '1': 'Nav',
                },
            },
        };
    });

    describe('importFullLayout', () => {
        it('imports entire keymap', () => {
            const result = layerImportService.importFullLayout(
                sourceLayout,
                targetKeyboard,
                { includeMacros: false, includeCombos: false, includeTapdances: false }
            );

            expect(result.success).toBe(true);
            expect(result.layersImported).toBe(2);
            expect(targetKeyboard.keymap![0]).toEqual(sourceLayout.keymap![0]);
            expect(targetKeyboard.keymap![1]).toEqual(sourceLayout.keymap![1]);
        });

        it('preserves additional target layers', () => {
            // Set layer 3 to have some content
            targetKeyboard.keymap![3] = [31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46];

            layerImportService.importFullLayout(
                sourceLayout,
                targetKeyboard,
                { includeMacros: false, includeCombos: false, includeTapdances: false }
            );

            // Layers 0 and 1 from source, layer 2 and 3 preserved from target
            expect(targetKeyboard.keymap!.length).toBe(4);
            expect(targetKeyboard.keymap![3]).toEqual([31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46]);
        });

        it('imports macros when option enabled', () => {
            const result = layerImportService.importFullLayout(
                sourceLayout,
                targetKeyboard,
                { includeMacros: true, includeCombos: false, includeTapdances: false }
            );

            expect(result.macrosImported).toBe(2);
            expect(targetKeyboard.macros).toHaveLength(2);
            expect(targetKeyboard.macros![0].actions).toEqual([['tap', 'KC_A'], ['tap', 'KC_B']]);
        });

        it('imports combos when option enabled', () => {
            const result = layerImportService.importFullLayout(
                sourceLayout,
                targetKeyboard,
                { includeMacros: false, includeCombos: true, includeTapdances: false }
            );

            expect(result.combosImported).toBe(1);
            expect(targetKeyboard.combos).toHaveLength(1);
            expect(targetKeyboard.combos![0].keys).toEqual(['KC_A', 'KC_S']);
        });

        it('imports tapdances when option enabled', () => {
            const result = layerImportService.importFullLayout(
                sourceLayout,
                targetKeyboard,
                { includeMacros: false, includeCombos: false, includeTapdances: true }
            );

            expect(result.tapdancesImported).toBe(1);
            expect(targetKeyboard.tapdances).toHaveLength(1);
            expect(targetKeyboard.tapdances![0].tap).toBe('KC_A');
        });

        it('imports cosmetic data', () => {
            layerImportService.importFullLayout(
                sourceLayout,
                targetKeyboard,
                { includeMacros: false, includeCombos: false, includeTapdances: false }
            );

            expect(targetKeyboard.cosmetic?.layer?.['0']).toBe('Base');
            expect(targetKeyboard.cosmetic?.layer?.['1']).toBe('Nav');
        });

        it('warns on key count mismatch', () => {
            // Source has 16 keys, but let's make it different
            sourceLayout.keymap = [[1, 2, 3, 4, 5, 6, 7, 8]]; // Only 8 keys

            const result = layerImportService.importFullLayout(
                sourceLayout,
                targetKeyboard,
                { includeMacros: false, includeCombos: false, includeTapdances: false }
            );

            expect(result.success).toBe(true);
            expect(result.warnings).toHaveLength(1);
            expect(result.warnings[0]).toContain('Key count mismatch');
        });

        it('handles key count resize by padding with KC_NO', () => {
            sourceLayout.keymap = [[1, 2, 3, 4, 5, 6, 7, 8]]; // 8 keys -> 16 needed

            layerImportService.importFullLayout(
                sourceLayout,
                targetKeyboard,
                { includeMacros: false, includeCombos: false, includeTapdances: false }
            );

            expect(targetKeyboard.keymap![0]).toHaveLength(16);
            expect(targetKeyboard.keymap![0].slice(0, 8)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
            expect(targetKeyboard.keymap![0].slice(8)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
        });
    });

    describe('importLayers', () => {
        it('imports specific layers with mapping', () => {
            const layerMapping = new Map<number, number>();
            layerMapping.set(0, 2); // Import source layer 0 to target layer 2
            layerMapping.set(1, 3); // Import source layer 1 to target layer 3

            const result = layerImportService.importLayers({
                source: sourceLayout,
                target: targetKeyboard,
                layerMapping,
                includeMacros: false,
                includeCombos: false,
                includeTapdances: false,
            });

            expect(result.success).toBe(true);
            expect(result.layersImported).toBe(2);

            // Original layers preserved
            expect(targetKeyboard.keymap![0]).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
            expect(targetKeyboard.keymap![1]).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

            // Imported layers
            expect(targetKeyboard.keymap![2]).toEqual(sourceLayout.keymap![0]);
            expect(targetKeyboard.keymap![3]).toEqual(sourceLayout.keymap![1]);
        });

        it('imports cosmetic layer names for mapped layers', () => {
            const layerMapping = new Map<number, number>();
            layerMapping.set(0, 2); // Import "Base" to layer 2
            layerMapping.set(1, 3); // Import "Nav" to layer 3

            layerImportService.importLayers({
                source: sourceLayout,
                target: targetKeyboard,
                layerMapping,
                includeMacros: false,
                includeCombos: false,
                includeTapdances: false,
            });

            expect(targetKeyboard.cosmetic?.layer?.['2']).toBe('Base');
            expect(targetKeyboard.cosmetic?.layer?.['3']).toBe('Nav');
        });

        it('warns on out of bounds source layer', () => {
            const layerMapping = new Map<number, number>();
            layerMapping.set(10, 0); // Source layer 10 doesn't exist

            const result = layerImportService.importLayers({
                source: sourceLayout,
                target: targetKeyboard,
                layerMapping,
                includeMacros: false,
                includeCombos: false,
                includeTapdances: false,
            });

            expect(result.layersImported).toBe(0);
            expect(result.warnings).toContain('Source layer 10 out of bounds');
        });

        it('warns on out of bounds target layer', () => {
            const layerMapping = new Map<number, number>();
            layerMapping.set(0, 10); // Target layer 10 doesn't exist

            const result = layerImportService.importLayers({
                source: sourceLayout,
                target: targetKeyboard,
                layerMapping,
                includeMacros: false,
                includeCombos: false,
                includeTapdances: false,
            });

            expect(result.layersImported).toBe(0);
            expect(result.warnings).toContain('Target layer 10 out of bounds');
        });

        it('returns failure if keymap missing', () => {
            const result = layerImportService.importLayers({
                source: {} as ViableFileContent,
                target: targetKeyboard,
                layerMapping: new Map(),
                includeMacros: false,
                includeCombos: false,
                includeTapdances: false,
            });

            expect(result.success).toBe(false);
            expect(result.warnings).toContain('Source or target keymap is missing');
        });
    });

    describe('exportLayer', () => {
        it('exports a single layer', () => {
            const exported = layerImportService.exportLayer(targetKeyboard, 0);

            expect(exported).not.toBeNull();
            expect(exported!.layerIndex).toBe(0);
            expect(exported!.keymap).toEqual(targetKeyboard.keymap![0]);
            expect(exported!.layerName).toBe('Layer 0');
        });

        it('uses cosmetic layer name', () => {
            targetKeyboard.cosmetic = {
                layer: { '0': 'Custom Name' },
            };

            const exported = layerImportService.exportLayer(targetKeyboard, 0);

            expect(exported!.layerName).toBe('Custom Name');
        });

        it('returns null for invalid layer index', () => {
            expect(layerImportService.exportLayer(targetKeyboard, -1)).toBeNull();
            expect(layerImportService.exportLayer(targetKeyboard, 100)).toBeNull();
        });

        it('returns a copy of the layer', () => {
            const exported = layerImportService.exportLayer(targetKeyboard, 0)!;
            exported.keymap[0] = 999;

            expect(targetKeyboard.keymap![0][0]).toBe(1); // Original unchanged
        });
    });

    describe('checkCompatibility', () => {
        it('returns compatible for matching layouts', () => {
            const result = layerImportService.checkCompatibility(sourceLayout, targetKeyboard);

            expect(result.compatible).toBe(true);
            expect(result.warnings).toHaveLength(0);
        });

        it('warns on key count mismatch', () => {
            sourceLayout.keymap = [[1, 2, 3, 4]]; // Only 4 keys

            const result = layerImportService.checkCompatibility(sourceLayout, targetKeyboard);

            expect(result.compatible).toBe(false);
            expect(result.warnings[0]).toContain('Key count differs');
        });

        it('warns when source has more layers', () => {
            sourceLayout.keymap = [
                [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
                [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
                [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
                [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
                [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
                [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
            ];

            const result = layerImportService.checkCompatibility(sourceLayout, targetKeyboard);

            expect(result.warnings[0]).toContain('Source has more layers');
        });
    });

    describe('macro merging', () => {
        it('respects macro_count limit', () => {
            targetKeyboard.macro_count = 2;
            sourceLayout.macros = [
                { mid: 0, actions: [['tap', 'KC_A']] },
                { mid: 1, actions: [['tap', 'KC_B']] },
                { mid: 2, actions: [['tap', 'KC_C']] },
            ];

            const result = layerImportService.importFullLayout(
                sourceLayout,
                targetKeyboard,
                { includeMacros: true, includeCombos: false, includeTapdances: false }
            );

            expect(result.macrosImported).toBe(2);
            expect(targetKeyboard.macros).toHaveLength(2);
        });

        it('fills empty macro slots', () => {
            targetKeyboard.macros = [
                { mid: 0, actions: [] },
                { mid: 1, actions: [['tap', 'KC_X']] },
                { mid: 2, actions: [] },
            ];
            targetKeyboard.macro_count = 8;
            sourceLayout.macros = [
                { mid: 0, actions: [['tap', 'KC_A']] },
                { mid: 1, actions: [['tap', 'KC_B']] },
            ];

            const result = layerImportService.importFullLayout(
                sourceLayout,
                targetKeyboard,
                { includeMacros: true, includeCombos: false, includeTapdances: false }
            );

            expect(result.macrosImported).toBe(2);
            // First macro goes to slot 0, second to slot 2 (slot 1 already has content)
            expect(targetKeyboard.macros![0].actions).toEqual([['tap', 'KC_A']]);
            expect(targetKeyboard.macros![1].actions).toEqual([['tap', 'KC_X']]);
            expect(targetKeyboard.macros![2].actions).toEqual([['tap', 'KC_B']]);
        });
    });
});
