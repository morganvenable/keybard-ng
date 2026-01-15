/**
 * Unit tests for LayoutLibraryService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LayoutLibraryService } from '../../src/services/layout-library.service';
import type { LayoutLibraryIndex, LayoutMetadata } from '../../src/types/layout-library';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('LayoutLibraryService', () => {
    let service: LayoutLibraryService;

    beforeEach(() => {
        service = new LayoutLibraryService('https://test.example.com');
        service.clearCache();
        mockFetch.mockClear();
    });

    describe('fetchIndex', () => {
        it('fetches blessed layouts from index', async () => {
            const mockIndex: LayoutLibraryIndex = {
                version: 1,
                updatedAt: '2026-01-14T00:00:00Z',
                layouts: [
                    {
                        id: 'abc123',
                        version: 1,
                        name: 'Test Layout',
                        description: 'A test layout',
                        author: '@test',
                        category: 'blessed',
                        tags: ['test'],
                        keyboardType: 'svalboard',
                        createdAt: '2026-01-14T00:00:00Z',
                        updatedAt: '2026-01-14T00:00:00Z',
                        layoutUrl: '/layouts/abc123.viable',
                    },
                ],
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockIndex),
            });

            const result = await service.fetchIndex('blessed');

            expect(mockFetch).toHaveBeenCalledWith('https://test.example.com/blessed/index.json');
            expect(result.layouts).toHaveLength(1);
            expect(result.layouts[0].name).toBe('Test Layout');
        });

        it('fetches community layouts from index', async () => {
            const mockIndex: LayoutLibraryIndex = {
                version: 1,
                updatedAt: '2026-01-14T00:00:00Z',
                layouts: [],
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockIndex),
            });

            const result = await service.fetchIndex('community');

            expect(mockFetch).toHaveBeenCalledWith('https://test.example.com/community/index.json');
            expect(result.layouts).toHaveLength(0);
        });

        it('returns empty index for private category', async () => {
            const result = await service.fetchIndex('private');

            expect(mockFetch).not.toHaveBeenCalled();
            expect(result.layouts).toHaveLength(0);
        });

        it('throws error on fetch failure', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                statusText: 'Not Found',
            });

            await expect(service.fetchIndex('blessed')).rejects.toThrow('Failed to fetch blessed index: 404 Not Found');
        });

        it('caches index results', async () => {
            const mockIndex: LayoutLibraryIndex = {
                version: 1,
                updatedAt: '2026-01-14T00:00:00Z',
                layouts: [],
            };

            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockIndex),
            });

            // First call
            await service.fetchIndex('blessed');
            // Second call - should use cache
            await service.fetchIndex('blessed');

            expect(mockFetch).toHaveBeenCalledTimes(1);
        });
    });

    describe('searchLayouts', () => {
        const mockBlessedIndex: LayoutLibraryIndex = {
            version: 1,
            updatedAt: '2026-01-14T00:00:00Z',
            layouts: [
                {
                    id: 'blessed1',
                    version: 1,
                    name: 'Gaming Layout',
                    description: 'Optimized for gaming',
                    author: '@gamer',
                    category: 'blessed',
                    tags: ['gaming', 'wasd'],
                    keyboardType: 'svalboard',
                    createdAt: '2026-01-14T00:00:00Z',
                    updatedAt: '2026-01-14T00:00:00Z',
                    layoutUrl: '/layouts/blessed1.viable',
                    cloneCount: 100,
                },
                {
                    id: 'blessed2',
                    version: 1,
                    name: 'Vim Layout',
                    description: 'For vim users',
                    author: '@vimmer',
                    category: 'blessed',
                    tags: ['vim', 'programming'],
                    keyboardType: 'svalboard',
                    createdAt: '2026-01-13T00:00:00Z',
                    updatedAt: '2026-01-13T00:00:00Z',
                    layoutUrl: '/layouts/blessed2.viable',
                    cloneCount: 50,
                },
            ],
        };

        beforeEach(() => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockBlessedIndex),
            });
        });

        it('searches layouts by tag', async () => {
            const result = await service.searchLayouts({ tags: ['gaming'], category: 'blessed' });

            expect(result.layouts).toHaveLength(1);
            expect(result.layouts[0].name).toBe('Gaming Layout');
        });

        it('searches layouts by query', async () => {
            const result = await service.searchLayouts({ query: 'vim', category: 'blessed' });

            expect(result.layouts).toHaveLength(1);
            expect(result.layouts[0].name).toBe('Vim Layout');
        });

        it('sorts by popular', async () => {
            const result = await service.searchLayouts({ sortBy: 'popular', category: 'blessed' });

            expect(result.layouts[0].cloneCount).toBe(100);
            expect(result.layouts[1].cloneCount).toBe(50);
        });

        it('sorts by name', async () => {
            const result = await service.searchLayouts({ sortBy: 'name', category: 'blessed' });

            expect(result.layouts[0].name).toBe('Gaming Layout');
            expect(result.layouts[1].name).toBe('Vim Layout');
        });

        it('paginates results', async () => {
            const result = await service.searchLayouts({ limit: 1, offset: 0, category: 'blessed' });

            expect(result.layouts).toHaveLength(1);
            expect(result.hasMore).toBe(true);
            expect(result.total).toBe(2);
        });
    });

    describe('generateLayoutId', () => {
        it('generates 6-character IDs', () => {
            const id = service.generateLayoutId();

            expect(id).toHaveLength(6);
            expect(id).toMatch(/^[A-Za-z0-9]+$/);
        });

        it('generates unique IDs', () => {
            const ids = new Set<string>();
            for (let i = 0; i < 100; i++) {
                ids.add(service.generateLayoutId());
            }

            // With 62^6 possibilities, 100 should all be unique
            expect(ids.size).toBe(100);
        });
    });

    describe('getNonEmptyLayers', () => {
        it('identifies non-empty layers', () => {
            const keymap = [
                [0, 0, 0, 0], // Empty layer (all KC_NO)
                [4, 5, 6, 7], // Non-empty
                [1, 1, 1, 1], // Empty (all KC_TRNS)
                [0, 0, 4, 0], // Non-empty (has one key)
            ];

            const nonEmpty = service.getNonEmptyLayers(keymap);

            expect(nonEmpty).toEqual([1, 3]);
        });

        it('returns empty array for all-empty keymap', () => {
            const keymap = [
                [0, 0, 0, 0],
                [1, 1, 1, 1],
            ];

            const nonEmpty = service.getNonEmptyLayers(keymap);

            expect(nonEmpty).toEqual([]);
        });
    });

    describe('extractLayer', () => {
        it('extracts single layer from keymap', () => {
            const keymap = [
                [1, 2, 3, 4],
                [5, 6, 7, 8],
            ];

            const layer = service.extractLayer(keymap, 1);

            expect(layer).toEqual([5, 6, 7, 8]);
        });

        it('returns null for out of bounds index', () => {
            const keymap = [[1, 2, 3, 4]];

            expect(service.extractLayer(keymap, 5)).toBeNull();
            expect(service.extractLayer(keymap, -1)).toBeNull();
        });

        it('returns a copy, not a reference', () => {
            const keymap = [[1, 2, 3, 4]];

            const layer = service.extractLayer(keymap, 0);
            layer![0] = 999;

            expect(keymap[0][0]).toBe(1); // Original unchanged
        });
    });

    describe('clearCache', () => {
        it('clears index cache', async () => {
            const mockIndex: LayoutLibraryIndex = {
                version: 1,
                updatedAt: '2026-01-14T00:00:00Z',
                layouts: [],
            };

            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockIndex),
            });

            await service.fetchIndex('blessed');
            service.clearCache();
            await service.fetchIndex('blessed');

            expect(mockFetch).toHaveBeenCalledTimes(2);
        });
    });
});
