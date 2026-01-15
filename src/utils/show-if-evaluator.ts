/**
 * showIf Expression Evaluator for VIA3 Custom UI
 *
 * Evaluates conditional visibility expressions like:
 * - "{id_automouse_enable} == 1"
 * - "{id_left_scroll_mode} != 0"
 * - "{id_dpi} > 800"
 *
 * Supports operators: ==, !=, <, >, <=, >=
 */

/**
 * Evaluate a showIf expression against cached values
 * Returns true if the expression evaluates to true, or if the expression is invalid
 */
export function evaluateShowIf(expression: string, values: Map<string, number>): boolean {
    if (!expression || typeof expression !== 'string') {
        return true; // No expression means always visible
    }

    try {
        // Pattern: {key} operator value
        // Examples: "{id_automouse_enable} == 1", "{id_mode} != 0"
        const pattern = /^\s*\{([^}]+)\}\s*(==|!=|<=|>=|<|>)\s*(-?\d+)\s*$/;
        const match = expression.match(pattern);

        if (!match) {
            console.warn(`Invalid showIf expression format: "${expression}"`);
            return true; // Default to visible for invalid expressions
        }

        const [, key, operator, valueStr] = match;
        const compareValue = parseInt(valueStr, 10);
        const actualValue = values.get(key);

        // If value is not in cache, default to visible
        if (actualValue === undefined) {
            return true;
        }

        // Evaluate comparison
        switch (operator) {
            case '==':
                return actualValue === compareValue;
            case '!=':
                return actualValue !== compareValue;
            case '<':
                return actualValue < compareValue;
            case '>':
                return actualValue > compareValue;
            case '<=':
                return actualValue <= compareValue;
            case '>=':
                return actualValue >= compareValue;
            default:
                console.warn(`Unknown operator in showIf: "${operator}"`);
                return true;
        }
    } catch (error) {
        console.warn(`Error evaluating showIf expression "${expression}":`, error);
        return true; // Default to visible on error
    }
}

/**
 * Extract all value keys referenced in showIf expressions from a menu tree
 * This is useful for knowing which values need to be monitored for changes
 */
export function extractShowIfKeys(expression: string): string | null {
    if (!expression) return null;

    const pattern = /\{([^}]+)\}/;
    const match = expression.match(pattern);

    return match ? match[1] : null;
}
