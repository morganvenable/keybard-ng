export interface DropTargetElementLike {
    dataset?: {
        layerBackdrop?: string;
        layerIndex?: string;
    };
}

/**
 * Resolve the first valid layer backdrop plane from browser hit-test order.
 */
export const getBackdropLayerFromElements = (
    elements: DropTargetElementLike[],
): number | null => {
    for (const element of elements) {
        if (element.dataset?.layerBackdrop !== "true") continue;

        const layerIndex = Number(element.dataset.layerIndex);
        if (Number.isInteger(layerIndex) && layerIndex >= 0) {
            return layerIndex;
        }
    }

    return null;
};
