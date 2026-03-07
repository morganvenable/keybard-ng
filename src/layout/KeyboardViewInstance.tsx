import { FC, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Keyboard } from "@/components/Keyboard";
import { LayerNameBadge } from "@/components/LayerNameBadge";
import LayersActiveIcon from "@/components/icons/LayersActive";
import LayersDefaultIcon from "@/components/icons/LayersDefault";
import LayersMinusIcon from "@/components/icons/LayersMinusIcon";
import SquareArrowLeftIcon from "@/components/icons/SquareArrowLeft";
import SquareArrowRightIcon from "@/components/icons/SquareArrowRight";
import { useVial } from "@/contexts/VialContext";
import { useKeyBinding } from "@/contexts/KeyBindingContext";
import { useChanges } from "@/contexts/ChangesContext";
import { cn } from "@/lib/utils";
import { useLayoutSettings } from "@/contexts/LayoutSettingsContext";
import { svalService } from "@/services/sval.service";
import { MATRIX_COLS } from "@/constants/svalboard-layout";
import { KEYMAP } from "@/constants/keygen";
import { usePanels } from "@/contexts/PanelsContext";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface KeyboardViewInstanceProps {
    instanceId: string;
    selectedLayer: number;
    setSelectedLayer: (layer: number) => void;
    isPrimary: boolean;
    hideLayerTabs?: boolean;
    layerActiveState?: boolean[];
    onToggleLayerOn: (layer: number) => void;
    transparencyByLayer: Record<number, boolean>;
    onToggleTransparency: (layer: number, next: boolean) => void;
    showAllLayers: boolean;
    onToggleShowLayers: () => void;
    isLayerOrderReversed: boolean;
    onToggleLayerOrder: () => void;
    isMultiLayersActive: boolean;
    isAllTransparencyActive: boolean;
    isTransparencyRestoring?: boolean;
    multiLayerHeaderOffset?: number;
    onRemove?: () => void;
    onGhostNavigate?: (sourceLayer: number) => void;
    isRevealing?: boolean;
    isHiding?: boolean;
    stackIndex?: number;
    layerSpacingPx?: number;
    baseBadgeOffsetY?: number | null;
    onBaseBadgeOffsetY?: (offset: number | null) => void;
    isBaseMeasured?: boolean;
}

/**
 * A self-contained keyboard view instance with its own layer tabs, layer badge, and keyboard.
 * Multiple instances can be stacked vertically, each showing a different layer independently.
 */
const KeyboardViewInstance: FC<KeyboardViewInstanceProps> = ({
    instanceId,
    selectedLayer,
    setSelectedLayer,
    isPrimary,
    hideLayerTabs = false,
    layerActiveState,
    onToggleLayerOn,
    transparencyByLayer,
    onToggleTransparency,
    showAllLayers,
    onToggleShowLayers,
    isLayerOrderReversed,
    onToggleLayerOrder,
    isMultiLayersActive,
    isAllTransparencyActive,
    isTransparencyRestoring = false,
    multiLayerHeaderOffset = 0,
    onRemove,
    onGhostNavigate,
    isRevealing = false,
    isHiding = false,
    stackIndex = 0,
    layerSpacingPx = 0,
    baseBadgeOffsetY = null,
    onBaseBadgeOffsetY,
    isBaseMeasured = false,
}) => {
    const { keyboard, updateKey, setKeyboard, activeLayerIndex, isConnected } = useVial();
    const transparentKeyGlyph = KEYMAP["KC_TRNS"]?.str || "▽";
    const { clearSelection } = useKeyBinding();
    const { queue } = useChanges();
    const { activePanel } = usePanels();
    const { is3DMode, keyVariant } = useLayoutSettings();
    const badgeRowRef = useRef<HTMLDivElement | null>(null);
    const [badgeOffsetY, setBadgeOffsetY] = useState(() => {
        if (!is3DMode) return 0;
        if (baseBadgeOffsetY !== null) return baseBadgeOffsetY;
        const unitSize = keyVariant === 'small' ? 30 : keyVariant === 'medium' ? 45 : 60;
        return unitSize * 7.7;
    });
    // Suppress CSS transitions until the first real DOM measurement completes (prevents bounce).
    const [hasMeasured, setHasMeasured] = useState(false);
    const hasMeasuredRef = useRef(false);
    // Cache the primary badge offset so it doesn't shift between single ↔ multi toggles.
    const cachedBaseOffset = useRef<number | null>(null);
    // Track multi-layer toggle direction for entry/exit animations.
    const prevMultiLayersActiveRef = useRef(isMultiLayersActive);
    // Non-primary layers start invisible and animate in.
    const [layerAnimatingIn, setLayerAnimatingIn] = useState(!isPrimary && isMultiLayersActive);
    const [dynamicFlowOffset, setDynamicFlowOffset] = useState(0);
    const was3DRef = useRef(is3DMode);
    const prevStackIndexRef = useRef(stackIndex);
    const [isToggling3D, setIsToggling3D] = useState(false);
    const measureBaseRef = useRef<(() => void) | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setIsToggling3D(true);
        const timer = setTimeout(() => {
            // 1. First, end the toggle state and snap the measurement.
            // In this specific render path, isToggling3D is false and hasMeasured is false.
            // This force-disables the CSS transition property, making the measure snap instantaneous.
            setIsToggling3D(false);
            if (is3DMode) {
                measureBaseRef.current?.();

                // 2. In the NEXT frame, enable transitions for future events (like resizes).
                requestAnimationFrame(() => {
                    setHasMeasured(true);
                    hasMeasuredRef.current = true;
                });
            } else {
                setHasMeasured(false);
                hasMeasuredRef.current = false;
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [is3DMode]);

    useLayoutEffect(() => {
        if (!isPrimary && isMultiLayersActive && layerAnimatingIn) {
            const container = containerRef.current;
            if (!container) return;
            const myWrapper = container.closest('.relative.w-full');
            const primaryEl = document.querySelector('[data-keyboard-instance="primary"]')?.closest('.relative.w-full');
            if (myWrapper && primaryEl) {
                const myRect = myWrapper.getBoundingClientRect();
                const primaryRect = primaryEl.getBoundingClientRect();
                const diff = myRect.top - primaryRect.top;
                setDynamicFlowOffset(-diff);
            }
        } else {
            setDynamicFlowOffset(0);
        }
    }, [isMultiLayersActive, isPrimary, layerAnimatingIn]);

    useLayoutEffect(() => {
        if (!is3DMode) {
            setBadgeOffsetY(0);
            if (stackIndex === 0) {
                onBaseBadgeOffsetY?.(null);
                cachedBaseOffset.current = null;
            }
            return;
        }

        if (stackIndex === 0) {
            const unitSize = keyVariant === 'small' ? 30 : keyVariant === 'medium' ? 45 : 60;
            const guess = unitSize * 7.7;
            const initialOffset = cachedBaseOffset.current ?? guess;
            setBadgeOffsetY(initialOffset);
        }
    }, [is3DMode, stackIndex, keyVariant, onBaseBadgeOffsetY]);

    useLayoutEffect(() => {
        if (!is3DMode || stackIndex !== 0) return;
        const container = containerRef.current;
        const badgeEl = badgeRowRef.current;
        if (!container || !badgeEl) return;

        const measureBase = () => {
            const labelEl = container.querySelector('[data-layer-label="true"]') as HTMLElement | null;
            if (!labelEl) return;
            const badgeRect = badgeEl.getBoundingClientRect();
            const labelRect = labelEl.getBoundingClientRect();

            const computedTransform = window.getComputedStyle(badgeEl).transform;
            let currentTranslateY = 0;
            if (computedTransform && computedTransform !== 'none') {
                const matrix = new DOMMatrix(computedTransform);
                currentTranslateY = matrix.m42;
            }

            const badgeNaturalCenter = (badgeRect.top + badgeRect.height / 2) - currentTranslateY;
            const labelCenter = labelRect.top + (labelRect.height / 2);
            const desiredOffset = labelCenter - badgeNaturalCenter;

            if (isToggling3D || layerAnimatingIn) return;

            const cached = cachedBaseOffset.current;
            if (cached === null || Math.abs(desiredOffset - cached) > 2) {
                cachedBaseOffset.current = desiredOffset;
                onBaseBadgeOffsetY?.(desiredOffset);
                setBadgeOffsetY(desiredOffset);
            }

            if (!hasMeasuredRef.current) {
                requestAnimationFrame(() => {
                    setHasMeasured(true);
                    hasMeasuredRef.current = true;
                });
            }
        };

        measureBaseRef.current = measureBase;
        const rafId = requestAnimationFrame(measureBase);
        const settleTimer = window.setTimeout(measureBase, 500);
        window.addEventListener('resize', measureBase);
        return () => {
            cancelAnimationFrame(rafId);
            window.clearTimeout(settleTimer);
            window.removeEventListener('resize', measureBase);
        };
    }, [is3DMode, stackIndex, keyVariant, onBaseBadgeOffsetY, isBaseMeasured, layerAnimatingIn, isToggling3D]);

    useEffect(() => {
        was3DRef.current = is3DMode;
    }, [is3DMode]);

    useLayoutEffect(() => {
        if (!is3DMode || stackIndex === 0) return;

        const stepYValue = layerSpacingPx * 0.8192;
        // During the animation-in phase, use 0 shift so it starts perfectly at the primary badge's layer.
        const projectedShift = (isMultiLayersActive && !layerAnimatingIn) ? (-stackIndex * stepYValue) : 0;

        // Use cached base or dynamic unit-based guestimate.
        const unitSize = keyVariant === 'small' ? 30 : keyVariant === 'medium' ? 45 : 60;
        const guess = unitSize * 7.7;
        const effectiveBase = baseBadgeOffsetY ?? cachedBaseOffset.current ?? guess;
        setBadgeOffsetY(effectiveBase + projectedShift);
    }, [is3DMode, isMultiLayersActive, layerAnimatingIn, stackIndex, baseBadgeOffsetY, layerSpacingPx, keyVariant]);

    const [isHudMode, setIsHudMode] = useState(false);
    const [suppressTransparencyHover, setSuppressTransparencyHover] = useState(false);
    const layerOrderClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const KC_TRNS = 1;
    const isTransparencyActive = !!transparencyByLayer[selectedLayer];
    const tabRefs = useRef<Map<number, HTMLButtonElement | null>>(new Map());
    const prevTabRectsRef = useRef<Map<number, DOMRect>>(new Map());
    const prevDisplayOrderRef = useRef<number[] | null>(null);
    const prevVisibleIdsRef = useRef<Set<number>>(new Set());
    const prevShowAllLayersRef = useRef<boolean>(showAllLayers);
    const prevIsLayerOrderReversed = useRef<boolean>(isLayerOrderReversed);
    const TAB_FLIP_STAGGER_MS = 25;
    const TAB_FLIP_DURATION_MS = 260;
    const TAB_REVEAL_DURATION_MS = 260;

    // Briefly suppress hover styles after restoring transparency to avoid a flash
    useEffect(() => {
        if (isAllTransparencyActive || isTransparencyRestoring) return;
        setSuppressTransparencyHover(true);
        const t = setTimeout(() => setSuppressTransparencyHover(false), 120);
        return () => clearTimeout(t);
    }, [isAllTransparencyActive, isTransparencyRestoring]);

    if (!keyboard) return null;



    const handleSelectLayer = (layer: number) => () => {
        setSelectedLayer(layer);
        clearSelection();
    };

    const toggleShowLayers = () => {
        onToggleShowLayers();
    };

    // Layer context menu actions
    const handleCopyLayer = () => {
        if (!keyboard?.keymap) return;
        const layerData = keyboard.keymap[selectedLayer];
        navigator.clipboard.writeText(JSON.stringify(layerData));
    };

    const handlePasteLayer = async () => {
        if (!keyboard || !keyboard.keymap) return;
        try {
            const text = await navigator.clipboard.readText();
            const layerData = JSON.parse(text);
            if (Array.isArray(layerData)) {
                if (layerData.length === 0) return;

                const matrixCols = keyboard.cols || MATRIX_COLS;
                const currentLayerKeymap = keyboard.keymap[selectedLayer] || [];
                const updatedKeyboard = JSON.parse(JSON.stringify(keyboard));
                if (!updatedKeyboard.keymap[selectedLayer]) {
                    updatedKeyboard.keymap[selectedLayer] = [];
                }

                let hasChanges = false;
                for (let r = 0; r < keyboard.rows; r++) {
                    for (let c = 0; c < keyboard.cols; c++) {
                        const idx = r * matrixCols + c;
                        if (idx < layerData.length) {
                            const newValue = layerData[idx];
                            const currentValue = currentLayerKeymap[idx];
                            if (newValue !== currentValue) {
                                hasChanges = true;
                                updatedKeyboard.keymap[selectedLayer][idx] = newValue;
                                const row = r;
                                const col = c;
                                const previousValue = currentValue;
                                const changeDesc = `key_${selectedLayer}_${row}_${col}`;
                                queue(
                                    changeDesc,
                                    async () => {
                                        updateKey(selectedLayer, row, col, newValue);
                                    },
                                    {
                                        type: "key",
                                        layer: selectedLayer,
                                        row,
                                        col,
                                        keycode: newValue,
                                        previousValue,
                                    }
                                );
                            }
                        }
                    }
                }
                if (hasChanges) {
                    setKeyboard(updatedKeyboard);
                }
            }
        } catch (e) {
            console.error("Failed to paste layer", e);
        }
    };

    const shouldRenderLayerTab = (i: number) => {
        const layerData = keyboard.keymap?.[i];
        const isTransparentLayer = layerData ? layerData.every((keycode) => keycode === KC_TRNS) : true;
        const isLayerActive = typeof activeLayerIndex === "number"
            ? activeLayerIndex === i
            : !!layerActiveState?.[i];

        const shouldHideTransparent = !showAllLayers;
        if (shouldHideTransparent && isTransparentLayer && i !== selectedLayer && !isLayerActive) {
            return false;
        }
        return true;
    };

    const renderLayerTab = (i: number) => {
        if (!shouldRenderLayerTab(i)) return null;

        const layerShortName = svalService.getLayerNameNoLabel(keyboard, i);
        const isActive = selectedLayer === i;
        const isLayerActive = typeof activeLayerIndex === "number"
            ? activeLayerIndex === i
            : !!layerActiveState?.[i];

        return (
            <ContextMenu key={`${instanceId}-layer-tab-${i}`}>
                <ContextMenuTrigger asChild>
                    <button
                        ref={(el) => {
                            if (el) {
                                tabRefs.current.set(i, el);
                            } else {
                                tabRefs.current.delete(i);
                            }
                        }}
                        onClick={handleSelectLayer(i)}
                        onDoubleClick={(e) => {
                            e.stopPropagation();
                            onToggleLayerOn(i);
                        }}
                        className={cn(
                            "px-4 py-1 rounded-full transition-colors text-sm font-medium cursor-pointer border-none outline-none whitespace-nowrap",
                            isActive
                                ? "bg-gray-800 text-white shadow-md scale-105"
                                : "bg-transparent text-gray-600 hover:bg-gray-200",
                            isHudMode && !isActive && !isLayerActive && "text-gray-300"
                        )}
                    >
                        <span className={cn("select-none", isLayerActive && "underline underline-offset-2")}>
                            {layerShortName}
                        </span>
                    </button>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-56">
                    <ContextMenuItem onSelect={handleCopyLayer}>
                        Copy Layer
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={handlePasteLayer}>
                        Paste Layer
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onSelect={() => onToggleLayerOn(i)}>
                        {isLayerActive ? "Turn Layer Off" : "Turn Layer On"}
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>
        );
    };

    const allLayerIds = Array.from({ length: keyboard.layers || 16 }, (_, i) => i);
    const visibleLayerIds = useMemo(
        () => allLayerIds.filter(shouldRenderLayerTab),
        [keyboard.layers, keyboard.keymap, showAllLayers, selectedLayer, layerActiveState, activeLayerIndex]
    );
    const displayOrder = useMemo(
        () => (isLayerOrderReversed ? [...visibleLayerIds].reverse() : visibleLayerIds),
        [isLayerOrderReversed, visibleLayerIds]
    );

    useLayoutEffect(() => {
        const currentRects = new Map<number, DOMRect>();
        visibleLayerIds.forEach((layerId) => {
            const el = tabRefs.current.get(layerId);
            if (!el) return;
            currentRects.set(layerId, el.getBoundingClientRect());
        });

        const prevRects = prevTabRectsRef.current;
        const prevDisplayOrder = prevDisplayOrderRef.current;
        const hasSameOrder =
            !!prevDisplayOrder &&
            prevDisplayOrder.length === displayOrder.length &&
            prevDisplayOrder.every((layerId, index) => layerId === displayOrder[index]);

        if (prevRects.size > 0 && !hasSameOrder) {
            // Stagger from the leftmost visible tab, regardless of order
            const delayOrder = [...displayOrder];
            const delayIndexByLayer = new Map<number, number>();
            delayOrder.forEach((layerId, index) => {
                delayIndexByLayer.set(layerId, index);
            });

            // First frame: pin tabs to their previous positions
            displayOrder.forEach((layerId) => {
                const el = tabRefs.current.get(layerId);
                const prev = prevRects.get(layerId);
                const next = currentRects.get(layerId);
                if (!el || !prev || !next) return;
                const deltaX = prev.left - next.left;
                if (Math.abs(deltaX) < 0.5) return;
                el.style.transition = "none";
                el.style.transform = `translateX(${deltaX}px)`;
            });

            // Force reflow once after all transforms are set
            void document.body.offsetHeight;

            // Second frame: animate to the new positions with stagger
            displayOrder.forEach((layerId) => {
                const el = tabRefs.current.get(layerId);
                const prev = prevRects.get(layerId);
                const next = currentRects.get(layerId);
                if (!el || !prev || !next) return;
                const deltaX = prev.left - next.left;
                if (Math.abs(deltaX) < 0.5) return;
                const delayIndex = delayIndexByLayer.get(layerId) ?? 0;
                const delayMs = delayIndex * TAB_FLIP_STAGGER_MS;
                requestAnimationFrame(() => {
                    el.style.transition = `transform ${TAB_FLIP_DURATION_MS}ms ease-in-out ${delayMs}ms`;
                    el.style.transform = "translateX(0px)";
                });
            });
        }

        prevTabRectsRef.current = currentRects;
        prevDisplayOrderRef.current = displayOrder;
        prevIsLayerOrderReversed.current = isLayerOrderReversed;
    }, [
        displayOrder,
        visibleLayerIds,
    ]);

    useLayoutEffect(() => {
        const prevVisible = prevVisibleIdsRef.current;
        const currentVisible = new Set(visibleLayerIds);
        const showAllToggledOn = !prevShowAllLayersRef.current && showAllLayers;
        const leftmostId = displayOrder[0];
        const leftmostRect = leftmostId !== undefined
            ? (tabRefs.current.get(leftmostId)?.getBoundingClientRect() ?? null)
            : null;

        if (showAllToggledOn && leftmostRect) {
            // Stagger from the leftmost visible tab, regardless of order
            const delayOrder = [...displayOrder];
            const delayIndexByLayer = new Map<number, number>();
            delayOrder.forEach((layerId, index) => {
                delayIndexByLayer.set(layerId, index);
            });

            visibleLayerIds.forEach((layerId) => {
                if (prevVisible.has(layerId)) return;
                const el = tabRefs.current.get(layerId);
                if (!el) return;
                const nextRect = el.getBoundingClientRect();
                const deltaX = leftmostRect.left - nextRect.left;
                const delayIndex = delayIndexByLayer.get(layerId) ?? 0;
                const delayMs = delayIndex * TAB_FLIP_STAGGER_MS;
                el.style.transition = "none";
                el.style.transform = `translateX(${deltaX}px)`;
                el.style.opacity = "0";
                void el.offsetWidth;
                requestAnimationFrame(() => {
                    el.style.transition = `transform ${TAB_REVEAL_DURATION_MS}ms ease-in-out ${delayMs}ms, opacity ${TAB_REVEAL_DURATION_MS}ms ease-in-out ${delayMs}ms`;
                    el.style.transform = "translateX(0px)";
                    el.style.opacity = "1";
                });
            });
        }

        prevVisibleIdsRef.current = currentVisible;
        prevShowAllLayersRef.current = showAllLayers;
    }, [visibleLayerIds, showAllLayers]);

    const isSelectedLayerActive = isConnected
        ? activeLayerIndex === selectedLayer
        : !!layerActiveState?.[selectedLayer];

    // Layer entry/exit animation: when multi-layer activates or new layers appear,
    // non-primary layers start at opacity 0 (stacked at Z=0) then animate to full opacity at target Z.
    useEffect(() => {
        const wasMultiActive = prevMultiLayersActiveRef.current;
        prevMultiLayersActiveRef.current = isMultiLayersActive;

        if (isPrimary) return;

        // Entering multi-layer mode or new views appeared (show-all-layers / flip)
        if (isMultiLayersActive && !wasMultiActive) {
            // Start hidden, then animate in after a frame
            setLayerAnimatingIn(true);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setLayerAnimatingIn(false);
                });
            });
        } else if (!isMultiLayersActive && wasMultiActive) {
            // Leaving multi-layer: just reset
            setLayerAnimatingIn(false);
        }
    }, [isMultiLayersActive, isPrimary]);

    // Also animate newly appearing layers (e.g. show-all-layers toggle adds more views)
    useEffect(() => {
        if (isPrimary || !isMultiLayersActive) return;
        // Detect if this is a freshly mounted non-primary view 
        // We wait for isBaseMeasured so we don't jump when the primary offset finally arrives.
        if (stackIndex > 0 && layerAnimatingIn && isBaseMeasured && dynamicFlowOffset !== 0) {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setLayerAnimatingIn(false);
                });
            });
        }
    }, [stackIndex, isPrimary, isMultiLayersActive, isBaseMeasured, dynamicFlowOffset, layerAnimatingIn]);

    // Animate when the stack order changes (e.g. "Flip Layer View")
    useEffect(() => {
        if (!isPrimary && isMultiLayersActive && prevStackIndexRef.current !== stackIndex) {
            // Trigger the "flying from primary" animation
            setLayerAnimatingIn(true);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setLayerAnimatingIn(false);
                });
            });
        }
        prevStackIndexRef.current = stackIndex;
    }, [stackIndex, isPrimary, isMultiLayersActive]);

    return (
        <div
            ref={containerRef}
            className="w-full flex-shrink-0 pointer-events-none"
            style={{
                opacity: (isRevealing || isHiding || (!isPrimary && is3DMode && isMultiLayersActive && layerAnimatingIn)) ? 0 : 1,
                // During animation-in, pull the layer UP so it starts perfectly overlapped 
                // with the primary layer, then animates DOWN.
                transform: (is3DMode && isMultiLayersActive && layerAnimatingIn)
                    ? `translateY(${dynamicFlowOffset}px)`
                    : 'translateY(0)',
                transition: (is3DMode || was3DRef.current)
                    ? 'opacity 500ms ease-in-out, transform 500ms ease-in-out'
                    : 'opacity 200ms ease-in-out',
            }}
        >
            {/* Layer Controls Row: Hide-blank-layers toggle + layer tabs + (optional) remove button */}
            {!hideLayerTabs && !isMultiLayersActive && !is3DMode && (
                <div
                    className="flex items-center gap-2 pl-5 pb-2 whitespace-nowrap pointer-events-auto"
                    style={isPrimary && multiLayerHeaderOffset > 0 ? { marginTop: -multiLayerHeaderOffset } : undefined}
                >
                    <div className="flex items-center gap-1">
                        <Tooltip delayDuration={500}>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={toggleShowLayers}
                                    disabled={activePanel === "matrixtester"}
                                    className={cn(
                                        "p-2 rounded-full transition-colors flex-shrink-0",
                                        activePanel === "matrixtester"
                                            ? "text-gray-400 cursor-not-allowed opacity-30"
                                            : "text-black hover:bg-gray-200"
                                    )}
                                    aria-label={showAllLayers ? "Hide Transparent Layers" : "Show All Layers"}
                                >
                                    {!showAllLayers ? <LayersActiveIcon className="h-5 w-5" /> : <LayersDefaultIcon className="h-5 w-5" />}
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                                {showAllLayers ? "Hide Transparent Layers" : "Show All Layers"}
                            </TooltipContent>
                        </Tooltip>

                    </div>

                    <div className={cn("flex items-center gap-1", activePanel === "matrixtester" && "opacity-30 pointer-events-none")}>
                        {displayOrder.map((i) => renderLayerTab(i))}
                    </div>

                    <Tooltip delayDuration={500}>
                        <TooltipTrigger asChild>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (layerOrderClickTimer.current) {
                                        clearTimeout(layerOrderClickTimer.current);
                                        layerOrderClickTimer.current = null;
                                    }
                                    if (e.detail >= 2) {
                                        setIsHudMode((prev) => !prev);
                                        return;
                                    }
                                    layerOrderClickTimer.current = setTimeout(() => {
                                        onToggleLayerOrder();
                                        layerOrderClickTimer.current = null;
                                    }, 200);
                                }}
                                className={cn(
                                    "p-2 rounded-full transition-colors",
                                    isHudMode
                                        ? "bg-black text-kb-gray"
                                        : "text-gray-500 hover:text-gray-800 hover:bg-gray-200"
                                )}
                                aria-label="Reverse Layer Order"
                            >
                                {isLayerOrderReversed
                                    ? <SquareArrowRightIcon className="h-5 w-5" />
                                    : <SquareArrowLeftIcon className="h-5 w-5" />}
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            Flip Layer View
                        </TooltipContent>
                    </Tooltip>

                    {/* Remove button for non-primary views */}
                    {!isPrimary && onRemove && (
                        <Tooltip delayDuration={500}>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                                    className="p-2 rounded-full transition-colors text-gray-400 hover:text-black hover:bg-gray-200 ml-auto mr-4 flex-shrink-0"
                                    aria-label="Hide layer view"
                                    disabled={selectedLayer === 0}
                                    data-remove-view={instanceId}
                                >
                                    <LayersMinusIcon className="h-5 w-5" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                                Hide Layer
                            </TooltipContent>
                        </Tooltip>
                    )}
                </div>
            )}

            {/* Layer Name Badge Row */}
            <div
                ref={badgeRowRef}
                className="pl-5 pt-[7px] pb-2 flex items-center gap-2 pointer-events-auto"
                style={{
                    transform: is3DMode ? `translateY(${badgeOffsetY}px)` : 'translateY(0px)',
                    // transitions are active in 3D mode, and also while switching TO/FROM 3D.
                    // However, we suppress them after the first 3D measurement to hide the "correction jump".
                    transition: (is3DMode || was3DRef.current || isToggling3D) && (hasMeasured || isToggling3D)
                        ? 'transform 500ms ease-in-out'
                        : (is3DMode && !hasMeasured && !isPrimary && isBaseMeasured)
                            ? 'transform 500ms ease-in-out'
                            : 'none',
                }}
            >
                <div style={{ marginLeft: -20 }}>
                    <LayerNameBadge
                        selectedLayer={selectedLayer}
                        isActive={isSelectedLayerActive}
                        onToggleLayerOn={onToggleLayerOn}
                        // TODO: when firmware reports default layer, pass it here.
                        defaultLayerIndex={0}
                        trailingAction={selectedLayer !== 0 && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => {
                                            if (selectedLayer === 0) return;
                                            const next = !isTransparencyActive;
                                            onToggleTransparency(selectedLayer, next);
                                        }}
                                        disabled={activePanel === "matrixtester" || isTransparencyRestoring}
                                        className={cn(
                                            "w-8 h-8 rounded-full transition-all duration-150 flex-shrink-0 ml-[-4px] flex items-center justify-center",
                                            activePanel === "matrixtester"
                                                ? "text-gray-400 cursor-not-allowed opacity-30"
                                                : isTransparencyActive
                                                    ? "opacity-100 bg-black hover:bg-gray-800"
                                                    : cn(
                                                        "opacity-0 pointer-events-none scale-95",
                                                        !suppressTransparencyHover && "group-hover/layer-badge:opacity-100 group-hover/layer-badge:pointer-events-auto group-hover/layer-badge:scale-100 hover:bg-gray-200"
                                                    ),
                                            isTransparencyRestoring && "invisible pointer-events-none"
                                        )}
                                        aria-label={isTransparencyActive ? "Show Transparent Keys" : "Hide Transparent Keys"}
                                    >
                                        <span className={cn(
                                            "text-base leading-none font-semibold translate-y-[1px]",
                                            isTransparencyActive ? "text-kb-gray" : "text-black"
                                        )}>
                                            {transparentKeyGlyph}
                                        </span>
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                    {isTransparencyActive ? "Show Transparent Keys" : "Hide Transparent Keys"}
                                </TooltipContent>
                            </Tooltip>
                        )}
                    />
                </div>
            </div>

            {/* Keyboard */}
            <div
                className={cn(
                    "flex items-start justify-center max-w-full pointer-events-none",
                    is3DMode && "keyboard-3d-wrapper"
                )}
                style={is3DMode
                    ? {
                        transformStyle: 'preserve-3d',
                    }
                    : undefined
                }
            >
                <div
                    className={cn(
                        "pointer-events-none",
                        is3DMode && "keyboard-3d-active"
                    )}
                    style={{
                        transform: is3DMode
                            ? `rotateX(55deg) rotateZ(-45deg) translateZ(${isMultiLayersActive && !layerAnimatingIn ? (stackIndex * layerSpacingPx) : 0}px)`
                            : 'rotateX(0deg) rotateZ(0deg) translateZ(0px)',
                        transition: 'transform 500ms ease-in-out',
                    }}
                >
                    <Keyboard
                        keyboard={keyboard}
                        selectedLayer={selectedLayer}
                        setSelectedLayer={setSelectedLayer}
                        showTransparency={isTransparencyActive}
                        onGhostNavigate={onGhostNavigate}
                        layerActiveState={layerActiveState}
                        instanceId={instanceId}
                        show3DBackdrop={is3DMode}
                        activeLayerIndex={activeLayerIndex}
                        isConnected={isConnected}
                        isToggling3D={isToggling3D}
                    />
                </div>
            </div>
        </div>
    );
};

export default KeyboardViewInstance;
