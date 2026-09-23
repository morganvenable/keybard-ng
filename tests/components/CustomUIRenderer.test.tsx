import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { CustomUIRenderer } from '../../src/components/CustomUI/CustomUIRenderer';
import { SVALBOARD_AUTO_MOUSE_MENU } from '../fixtures/pointing-menu.fixture';

const SKIP_LABEL = 'Skip Activation in Scroll Mode';

// The sibling range/dropdown controls are Radix components that measure themselves
// with ResizeObserver, which jsdom does not provide.
beforeAll(() => {
    vi.stubGlobal('ResizeObserver', class {
        observe() {}
        unobserve() {}
        disconnect() {}
    });
});

function renderAutoMouseMenu(values: Record<string, number>) {
    const onValueChange = vi.fn();
    render(
        <CustomUIRenderer
            items={SVALBOARD_AUTO_MOUSE_MENU}
            values={new Map(Object.entries(values))}
            onValueChange={onValueChange}
        />
    );
    return { onValueChange };
}

/** A toggle row is the nearest div around its label; the ON/OFF buttons live inside it. */
function toggleRow(label: string): HTMLElement {
    const row = screen.getByText(label).closest('div');
    if (!row) throw new Error(`No toggle row found for "${label}"`);
    return row;
}

describe('CustomUIRenderer: auto mouse "Skip Activation in Scroll Mode" toggle', () => {
    it('is hidden while auto mouse is disabled (showIf gate)', () => {
        renderAutoMouseMenu({ id_automouse_enable: 0, id_automouse_skip_scroll: 1 });
        expect(screen.getByText('Enable Auto Mouse')).toBeInTheDocument();
        expect(screen.queryByText(SKIP_LABEL)).not.toBeInTheDocument();
    });

    it('renders with the other auto mouse controls once auto mouse is enabled', () => {
        renderAutoMouseMenu({ id_automouse_enable: 1 });
        expect(screen.getByText('Layer Timeout')).toBeInTheDocument();
        expect(screen.getByText('Activation Threshold')).toBeInTheDocument();
        expect(screen.getByText('Activation Decay (x10ms)')).toBeInTheDocument();
        expect(screen.getByText(SKIP_LABEL)).toBeInTheDocument();
    });

    it('turning it on emits id_automouse_skip_scroll = 1', () => {
        const { onValueChange } = renderAutoMouseMenu({ id_automouse_enable: 1, id_automouse_skip_scroll: 0 });
        fireEvent.click(within(toggleRow(SKIP_LABEL)).getByRole('button', { name: 'ON' }));
        expect(onValueChange).toHaveBeenCalledTimes(1);
        expect(onValueChange).toHaveBeenCalledWith('id_automouse_skip_scroll', 1);
    });

    it('turning it off emits id_automouse_skip_scroll = 0 without touching other keys', () => {
        const { onValueChange } = renderAutoMouseMenu({ id_automouse_enable: 1, id_automouse_skip_scroll: 1 });
        fireEvent.click(within(toggleRow(SKIP_LABEL)).getByRole('button', { name: 'OFF' }));
        expect(onValueChange).toHaveBeenCalledTimes(1);
        expect(onValueChange).toHaveBeenCalledWith('id_automouse_skip_scroll', 0);
    });

    it('clicking the already-active side is a no-op', () => {
        const { onValueChange } = renderAutoMouseMenu({ id_automouse_enable: 1, id_automouse_skip_scroll: 1 });
        fireEvent.click(within(toggleRow(SKIP_LABEL)).getByRole('button', { name: 'ON' }));
        expect(onValueChange).not.toHaveBeenCalled();
    });
});
