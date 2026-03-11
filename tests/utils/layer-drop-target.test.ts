import { describe, expect, it } from "vitest";
import { getBackdropLayerFromElements } from "../../src/utils/layer-drop-target";

describe("getBackdropLayerFromElements", () => {
    it("ignores key hits and returns the first backdrop plane in hit order", () => {
        const hitOrder = [
            { dataset: { keycode: "KC_A" } },
            { dataset: { layerBackdrop: "true", layerIndex: "2" } },
            { dataset: { layerBackdrop: "true", layerIndex: "1" } },
        ];

        expect(getBackdropLayerFromElements(hitOrder)).toBe(2);
    });

    it("treats any backdrop plane for a layer as a valid target", () => {
        const thumbPlaneHit = [
            { dataset: { layerBackdrop: "true", layerIndex: "5" } },
        ];
        const fingerPlaneHit = [
            { dataset: { layerBackdrop: "true", layerIndex: "5" } },
        ];

        expect(getBackdropLayerFromElements(thumbPlaneHit)).toBe(5);
        expect(getBackdropLayerFromElements(fingerPlaneHit)).toBe(5);
    });

    it("returns null when no backdrop plane is present", () => {
        const hitOrder = [
            { dataset: { keycode: "KC_B" } },
            { dataset: {} },
        ];

        expect(getBackdropLayerFromElements(hitOrder)).toBeNull();
    });
});
