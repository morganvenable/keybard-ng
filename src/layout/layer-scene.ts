export type LayerSceneState =
    | "single2d"
    | "single3d"
    | "multi2d"
    | "multi3d_pre_spread"
    | "multi3d_pre_expand"
    | "multi3d_rotating_in"
    | "multi3d_spreading"
    | "multi3d"
    | "multi3d_pre_collapse"
    | "multi3d_collapsing"
    | "multi2d_rotating_out";

export interface LayerScenePose {
    rootTranslateY: number;
    translateZ: number;
    rotateX: number;
    rotateZ: number;
    projectedY: number;
    opacity: number;
    transitionMs: number;
    easing: string;
}

interface GetLayerScenePoseArgs {
    sceneState: LayerSceneState;
    stackIndex: number;
    isPrimary: boolean;
    totalVisibleLayers: number;
    layerSpacingPx: number;
    flowOffsetPx: number;
    renderedInMultiScene: boolean;
    collapseToSingle?: boolean;
}

export const LAYER_SCENE_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
export const LEGACY_FORWARD_ENTRY_MS = 500;
export const SCENE_SPREAD_MS = 550;
export const SCENE_ROTATE_IN_MS = 220;
export const SCENE_ROTATE_IN_SPREAD_MS = 550;
export const SCENE_COLLAPSE_MS = 550;
export const SCENE_COLLAPSE_TO_2D_MS = 220;
export const SCENE_ROTATE_OUT_MS = 220;
const THREE_D_ROTATE_X = 55;
const THREE_D_ROTATE_Z = -45;
const PROJECTED_Y_RATIO = 0.8192;

export const sceneUses3D = (sceneState: LayerSceneState) => (
    sceneState !== "single2d" && sceneState !== "multi2d"
);

export const sceneShowsGuides = (sceneState: LayerSceneState) => sceneState === "multi3d";

export const getLayerScenePose = ({
    sceneState,
    stackIndex,
    isPrimary,
    totalVisibleLayers,
    layerSpacingPx,
    flowOffsetPx,
    renderedInMultiScene,
    collapseToSingle = false,
}: GetLayerScenePoseArgs): LayerScenePose => {
    const effectiveStackIndex = renderedInMultiScene ? stackIndex : 0;
    const naturalFlowOffsetY = renderedInMultiScene ? flowOffsetPx : 0;
    const sceneOffsetY = renderedInMultiScene ? effectiveStackIndex * layerSpacingPx * PROJECTED_Y_RATIO : 0;
    const collapsedRootTranslateY = -naturalFlowOffsetY;
    const single3dRootTranslateY = renderedInMultiScene && !isPrimary ? -naturalFlowOffsetY : 0;
    const layeredTranslateZ = renderedInMultiScene ? effectiveStackIndex * layerSpacingPx : 0;
    const layeredProjectedY = renderedInMultiScene ? -sceneOffsetY : 0;
    const singleOpacity = collapseToSingle && !isPrimary ? 0 : 1;
    const hasExtraLayers = renderedInMultiScene && totalVisibleLayers > 1;

    switch (sceneState) {
        case "single2d":
            return {
                rootTranslateY: 0,
                translateZ: 0,
                rotateX: 0,
                rotateZ: 0,
                projectedY: 0,
                opacity: 1,
                transitionMs: 0,
                easing: LAYER_SCENE_EASING,
            };
        case "single3d":
            return {
                rootTranslateY: hasExtraLayers ? single3dRootTranslateY : 0,
                translateZ: 0,
                rotateX: THREE_D_ROTATE_X,
                rotateZ: THREE_D_ROTATE_Z,
                projectedY: 0,
                opacity: 1,
                transitionMs: 0,
                easing: LAYER_SCENE_EASING,
            };
        case "multi2d":
            return {
                rootTranslateY: 0,
                translateZ: 0,
                rotateX: 0,
                rotateZ: 0,
                projectedY: 0,
                opacity: 1,
                transitionMs: 0,
                easing: LAYER_SCENE_EASING,
            };
        case "multi3d_pre_spread":
            return {
                rootTranslateY: isPrimary ? 0 : collapsedRootTranslateY,
                translateZ: 0,
                rotateX: THREE_D_ROTATE_X,
                rotateZ: THREE_D_ROTATE_Z,
                projectedY: 0,
                opacity: isPrimary ? 1 : 0,
                transitionMs: 0,
                easing: LAYER_SCENE_EASING,
            };
        case "multi3d_pre_expand":
            return {
                rootTranslateY: 0,
                translateZ: layeredTranslateZ,
                rotateX: THREE_D_ROTATE_X,
                rotateZ: THREE_D_ROTATE_Z,
                projectedY: layeredProjectedY,
                opacity: isPrimary ? 1 : 0,
                transitionMs: 0,
                easing: LAYER_SCENE_EASING,
            };
        case "multi3d_rotating_in":
            return {
                rootTranslateY: collapsedRootTranslateY,
                translateZ: 0,
                rotateX: THREE_D_ROTATE_X,
                rotateZ: THREE_D_ROTATE_Z,
                projectedY: 0,
                opacity: 1,
                transitionMs: SCENE_SPREAD_MS,
                easing: LAYER_SCENE_EASING,
            };
        case "multi3d_spreading":
            return {
                rootTranslateY: 0,
                translateZ: layeredTranslateZ,
                rotateX: THREE_D_ROTATE_X,
                rotateZ: THREE_D_ROTATE_Z,
                projectedY: layeredProjectedY,
                opacity: 1,
                transitionMs: SCENE_ROTATE_IN_SPREAD_MS,
                easing: LAYER_SCENE_EASING,
            };
        case "multi3d":
            return {
                rootTranslateY: 0,
                translateZ: layeredTranslateZ,
                rotateX: THREE_D_ROTATE_X,
                rotateZ: THREE_D_ROTATE_Z,
                projectedY: layeredProjectedY,
                opacity: 1,
                transitionMs: 0,
                easing: LAYER_SCENE_EASING,
            };
        case "multi3d_pre_collapse":
            return {
                rootTranslateY: 0,
                translateZ: layeredTranslateZ,
                rotateX: THREE_D_ROTATE_X,
                rotateZ: THREE_D_ROTATE_Z,
                projectedY: layeredProjectedY,
                opacity: 1,
                transitionMs: 0,
                easing: LAYER_SCENE_EASING,
            };
        case "multi3d_collapsing":
            return {
                rootTranslateY: collapsedRootTranslateY,
                translateZ: 0,
                rotateX: THREE_D_ROTATE_X,
                rotateZ: THREE_D_ROTATE_Z,
                projectedY: 0,
                opacity: singleOpacity,
                transitionMs: collapseToSingle ? SCENE_COLLAPSE_MS : SCENE_SPREAD_MS,
                easing: LAYER_SCENE_EASING,
            };
        case "multi2d_rotating_out":
            return {
                rootTranslateY: collapsedRootTranslateY,
                translateZ: 0,
                rotateX: 0,
                rotateZ: 0,
                projectedY: 0,
                opacity: 1,
                transitionMs: SCENE_SPREAD_MS,
                easing: LAYER_SCENE_EASING,
            };
        default:
            return {
                rootTranslateY: 0,
                translateZ: 0,
                rotateX: 0,
                rotateZ: 0,
                projectedY: 0,
                opacity: 1,
                transitionMs: 0,
                easing: LAYER_SCENE_EASING,
            };
    }
};
