/**
 * Serial Assignment utility for cursor advancement after key assignment
 * Based on viable-gui's serial_assignment.py implementation
 */

export type SerialMode = 'col-row' | 'row-col' | 'svalboard';

// Layout entry type (matches keyboard.keylayout structure)
interface LayoutEntry {
    x: number;
    y: number;
    w: number;
    h: number;
    row?: number;
    col?: number;
}

/**
 * Svalboard direction order from viable-gui
 * Orders keys by direction across all fingers: N→C→S→W→E, then thumbs
 *
 * Matrix layout (6 columns per row):
 * - Col 0: S (South)
 * - Col 1: E (East)
 * - Col 2: C (Center)
 * - Col 3: N (North)
 * - Col 4: W (West)
 * - Col 5: 2S (double-south, optional)
 *
 * Rows 0, 5: Thumb clusters
 * Rows 1-4: Left hand fingers (pinky to index)
 * Rows 6-9: Right hand fingers (index to pinky)
 */
export const SVALBOARD_DIRECTION_ORDER = [
    // N keys (col 3): left hand rows 4,3,2,1 then right hand 6,7,8,9
    27, 21, 15, 9, 39, 45, 51, 57,
    // C keys (col 2)
    26, 20, 14, 8, 38, 44, 50, 56,
    // S keys (col 0)
    24, 18, 12, 6, 36, 42, 48, 54,
    // W keys (col 4)
    28, 22, 16, 10, 40, 46, 52, 58,
    // E keys (col 1)
    25, 19, 13, 7, 37, 43, 49, 55,
    // Thumb clusters (rows 0, 5) - Claussen-style ordering
    3, 5, 1, 31, 35, 33,  // Top row
    4, 2, 0, 30, 32, 34,  // Bottom row
    // Note: Col 5 (2S keys) omitted - they're layout-optional
];

/**
 * Get ordered key positions based on serial assignment mode
 *
 * @param keylayout - Keyboard layout as Record<matrixPos, LayoutEntry>
 * @param mode - Serial assignment mode
 * @param matrixCols - Number of columns in the matrix
 * @returns Array of {row, col} positions in serial order
 */
export function getOrderedKeyPositions(
    keylayout: Record<number, LayoutEntry>,
    mode: SerialMode,
    matrixCols: number
): Array<{ row: number; col: number }> {
    // Build array of entries with matrix positions
    const entries = Object.entries(keylayout).map(([posStr, layout]) => {
        const pos = Number(posStr);
        return {
            matrixPos: pos,
            row: layout.row ?? Math.floor(pos / matrixCols),
            col: layout.col ?? pos % matrixCols,
            x: layout.x,
            y: layout.y,
        };
    });

    if (mode === 'svalboard') {
        // Use hardcoded Svalboard order
        const posToEntry = new Map(entries.map(e => [e.matrixPos, e]));
        const ordered: Array<{ row: number; col: number }> = [];

        for (const matrixPos of SVALBOARD_DIRECTION_ORDER) {
            const entry = posToEntry.get(matrixPos);
            if (entry) ordered.push({ row: entry.row, col: entry.col });
        }

        // Add any keys not in the order list (for non-standard layouts)
        for (const entry of entries) {
            if (!ordered.some(p => p.row === entry.row && p.col === entry.col)) {
                ordered.push({ row: entry.row, col: entry.col });
            }
        }
        return ordered;
    }

    // Sort by visual position
    const sorted = [...entries].sort((a, b) => {
        if (mode === 'col-row') {
            // Down columns then rows: sort by (y, x) - like viable-gui TOP_TO_BOTTOM
            return a.y !== b.y ? a.y - b.y : a.x - b.x;
        } else {
            // Across rows then columns: sort by (x, y) - like viable-gui LEFT_TO_RIGHT
            return a.x !== b.x ? a.x - b.x : a.y - b.y;
        }
    });

    return sorted.map(e => ({ row: e.row, col: e.col }));
}
