import { FC, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Keyboard } from "@/components/Keyboard";
import { LayerNameBadge } from "@/components/LayerNameBadge";
import LayersActiveIcon from "@/components/icons/LayersActive";
import LayersDefaultIcon from "@/components/icons/LayersDefault";
import LayersMinusIcon from "@/components/icons/LayersMinusIcon";
import SquareArrowLeftIcon from "@/components/icons/SquareArrowLeft";
import SquareArrowRightIcon from "@/components/icons/SquareArrowRight";
import MicroscopeIcon from "@/components/icons/MicroscopeIcon";
import { useVial } from "@/contexts/VialContext";
import { useKeyBinding } from "@/contexts/KeyBindingContext";
import { useChanges } from "@/contexts/ChangesContext";
import { cn } from "@/lib/utils";
import { useLayoutSettings } from "@/contexts/LayoutSettingsContext";
import { svalService } from "@/services/sval.service";
import { MATRIX_COLS } from "@/constants/svalboard-layout";
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
    onBaseBadgeOffsetY?: (offset: number) => void;
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
}) => {
    const { keyboard, updateKey, setKeyboard, activeLayerIndex } = useVial();
    const { clearSelection } = useKeyBinding();
    const { queue } = useChanges();
    const { activePanel } = usePanels();
    const { is3DMode, keyVariant } = useLayoutSettings();
    const badgeRowRef = useRef<HTMLDivElement | null>(null);
    const [badgeOffsetY, setBadgeOffsetY] = useState(0);

    useLayoutEffect(() => {
        if (!is3DMode) {
            setBadgeOffsetY(0);
            return;
        }
        if (stackIndex !== 0) return;
        const container = containerRef.current;
        const badgeEl = badgeRowRef.current;
        if (!container || !badgeEl) return;

        const measureBase = () => {
            const labelEl = container.querySelector('[data-layer-label="true"]') as HTMLElement | null;
            if (!labelEl) return;
            const badgeRect = badgeEl.getBoundingClientRect();
            const labelRect = labelEl.getBoundingClientRect();
            const badgeCenter = badgeRect.top + (badgeRect.height / 2);
            const labelCenter = labelRect.top + (labelRect.height / 2);
            const baseOffset = labelCenter - badgeCenter;
            onBaseBadgeOffsetY?.(baseOffset);
            setBadgeOffsetY(baseOffset);
        };

        const rafId = requestAnimationFrame(measureBase);
        const settleTimer = window.setTimeout(measureBase, 600);
        window.addEventListener('resize', measureBase);
        return () => {
            cancelAnimationFrame(rafId);
            window.clearTimeout(settleTimer);
            window.removeEventListener('resize', measureBase);
        };
    }, [is3DMode, stackIndex, keyVariant, onBaseBadgeOffsetY]);

    useLayoutEffect(() => {
        if (!is3DMode || stackIndex === 0 || baseBadgeOffsetY === null) return;
        const stepYValue = layerSpacingPx * 0.8192;
        const projectedShift = isMultiLayersActive ? (-stackIndex * stepYValue) : 0;
        setBadgeOffsetY(baseBadgeOffsetY + projectedShift);
    }, [is3DMode, isMultiLayersActive, stackIndex, baseBadgeOffsetY, layerSpacingPx]);

    const [isHudMode, setIsHudMode] = useState(false);
    const [suppressTransparencyHover, setSuppressTransparencyHover] = useState(false);
    const layerOrderClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const KC_TRNS = 1;
    const isTransparencyActive = !!transparencyByLayer[selectedLayer];
    const tabRefs = useRef<Map<number, HTMLButtonElement | null>>(new Map());
    const prevTabRectsRef = useRef<Map<number, DOMRect>>(new Map());
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

    // Ref for container
    const containerRef = useRef<HTMLDivElement>(null);

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
        if (prevRects.size > 0) {
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

    return (
        <div
            ref={containerRef}
            className="w-full flex-shrink-0"
            style={{
                opacity: (isRevealing || isHiding) ? 0 : 1,
                transition: 'opacity 200ms ease-in-out',
            }}
        >
            {/* Layer Controls Row: Hide-blank-layers toggle + layer tabs + (optional) remove button */}
            <div
                className="flex items-center gap-2 pl-5 pb-2 whitespace-nowrap"
                style={isPrimary && multiLayerHeaderOffset > 0 ? { marginTop: -multiLayerHeaderOffset } : undefined}
            >
                {!hideLayerTabs && (
                    <>
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
                    </>
                )}





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
                            Hide layer view
                        </TooltipContent>
                    </Tooltip>
                )}
            </div>

            {/* Layer Name Badge Row */}
            <div
                ref={badgeRowRef}
                className="pl-5 pt-[7px] pb-2 flex items-center gap-2"
                style={is3DMode
                    ? { transform: `translateY(${badgeOffsetY}px)`, transition: 'transform 500ms ease-in-out' }
                    : undefined}
            >
                <div style={{ marginLeft: -20 }}>
                    <LayerNameBadge
                        selectedLayer={selectedLayer}
                        isActive={activeLayerIndex === selectedLayer}
                        onToggleLayerOn={onToggleLayerOn}
                        // TODO: when firmware reports default layer, pass it here.
                        defaultLayerIndex={0}
                    />
                </div>

                {selectedLayer !== 0 && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => {
                                    if (selectedLayer === 0) return;
                                    const next = !isTransparencyActive;
                                    onToggleTransparency(selectedLayer, next);
                                }}
                                disabled={activePanel === "matrixtester" || isAllTransparencyActive || isTransparencyRestoring}
                                className={cn(
                                    "p-1.5 rounded-full transition-colors flex-shrink-0 ml-[-4px]",
                                    activePanel === "matrixtester"
                                        ? "text-gray-400 cursor-not-allowed opacity-30"
                                        : isTransparencyActive
                                            ? "bg-black hover:bg-gray-800"
                                            : (!suppressTransparencyHover ? "hover:bg-gray-200" : ""),
                                    isTransparencyRestoring && "invisible pointer-events-none"
                                )}
                                aria-label={isTransparencyActive ? "Show Transparent Keys" : "Hide Transparent Keys"}
                            >
                                <MicroscopeIcon className={cn(
                                    "h-4 w-4",
                                    isTransparencyActive ? "text-kb-gray" : "text-black"
                                )} />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            {isTransparencyActive ? "Show Transparent Keys" : "Hide Transparent Keys"}
                        </TooltipContent>
                    </Tooltip>
                )}
            </div>

            {/* Keyboard */}
            <div
                className={cn(
                    "flex items-start justify-center max-w-full",
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
                        "transition-transform duration-500 ease-in-out",
                        is3DMode && "keyboard-3d-active"
                    )}
                    style={{
                        transform: is3DMode
                            ? `rotateX(55deg) rotateZ(-45deg) translateZ(${isMultiLayersActive ? (stackIndex * layerSpacingPx) : 0}px)`
                            : undefined
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
                    />
                </div>
            </div>
        </div>
    );
};

export default KeyboardViewInstance;
