import { describe, expect, it } from "vitest";
import {
  getLayerScenePose,
  sceneShowsGuides,
  type LayerSceneState,
} from "../../src/layout/layer-scene";

const baseArgs = {
  totalVisibleLayers: 4,
  layerSpacingPx: 410,
  flowOffsetPx: 656,
  renderedInMultiScene: true,
};

describe("layer scene pose helper", () => {
  it("keeps non-primary layers hidden at the primary pose before spreading", () => {
    const preSpreadPose = getLayerScenePose({
      ...baseArgs,
      sceneState: "multi3d_pre_spread",
      stackIndex: 2,
      isPrimary: false,
    });
    const spreadPose = getLayerScenePose({
      ...baseArgs,
      sceneState: "multi3d_spreading",
      stackIndex: 2,
      isPrimary: false,
    });

    expect(preSpreadPose.translateZ).toBe(0);
    expect(preSpreadPose.projectedY).toBe(0);
    expect(preSpreadPose.opacity).toBe(0);
    expect(preSpreadPose.rootTranslateY).toBe(-656);

    expect(spreadPose.translateZ).toBe(820);
    expect(spreadPose.projectedY).toBeCloseTo(-671.744, 3);
    expect(spreadPose.rootTranslateY).toBe(0);
    expect(spreadPose.opacity).toBe(1);
  });

  it("collapses multi3d -> single3d into the primary pose and fades non-primary layers", () => {
    const preCollapsePose = getLayerScenePose({
      ...baseArgs,
      sceneState: "multi3d_pre_collapse",
      stackIndex: 3,
      isPrimary: false,
      collapseToSingle: true,
    });
    const pose = getLayerScenePose({
      ...baseArgs,
      sceneState: "multi3d_collapsing",
      stackIndex: 3,
      isPrimary: false,
      collapseToSingle: true,
    });

    expect(preCollapsePose.translateZ).toBe(1230);
    expect(preCollapsePose.projectedY).toBeCloseTo(-1007.616, 3);
    expect(preCollapsePose.opacity).toBe(1);
    expect(pose.translateZ).toBe(0);
    expect(pose.rootTranslateY).toBe(-656);
    expect(pose.opacity).toBe(0);
  });

  it("keeps multi2d -> multi3d rotation on one plane before spread", () => {
    const rotatePose = getLayerScenePose({
      ...baseArgs,
      sceneState: "multi3d_rotating_in",
      stackIndex: 1,
      isPrimary: false,
    });
    const spreadPose = getLayerScenePose({
      ...baseArgs,
      sceneState: "multi3d_spreading",
      stackIndex: 1,
      isPrimary: false,
    });

    expect(rotatePose.translateZ).toBe(0);
    expect(rotatePose.rootTranslateY).toBe(0);
    expect(rotatePose.rotateX).toBe(55);
    expect(rotatePose.rotateZ).toBe(-45);

    expect(spreadPose.translateZ).toBe(410);
    expect(spreadPose.rootTranslateY).toBe(0);
  });

  it("removes stack depth before rotating back to 2d", () => {
    const collapsePose = getLayerScenePose({
      ...baseArgs,
      sceneState: "multi3d_collapsing",
      stackIndex: 1,
      isPrimary: false,
      collapseToSingle: false,
    });
    const rotateOutPose = getLayerScenePose({
      ...baseArgs,
      sceneState: "multi2d_rotating_out",
      stackIndex: 1,
      isPrimary: false,
    });

    expect(collapsePose.translateZ).toBe(0);
    expect(collapsePose.rotateX).toBe(55);
    expect(collapsePose.rotateZ).toBe(-45);
    expect(collapsePose.opacity).toBe(1);

    expect(rotateOutPose.translateZ).toBe(0);
    expect(rotateOutPose.rotateX).toBe(0);
    expect(rotateOutPose.rotateZ).toBe(0);
  });

  it("shows guides only for the settled multi3d scene", () => {
    const scenes: LayerSceneState[] = [
      "single2d",
      "single3d",
      "multi2d",
      "multi3d_pre_spread",
      "multi3d_rotating_in",
      "multi3d_spreading",
      "multi3d",
      "multi3d_pre_collapse",
      "multi3d_collapsing",
      "multi2d_rotating_out",
    ];

    const visibleScenes = scenes.filter((scene) => sceneShowsGuides(scene));
    expect(visibleScenes).toEqual(["multi3d"]);
  });
});
