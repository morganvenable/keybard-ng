import { useState } from "react";

import { Key } from "@/components/Key";
import { useKeyBinding } from "@/contexts/KeyBindingContext";
import { useLayer } from "@/contexts/LayerContext";
import { useLayoutSettings } from "@/contexts/LayoutSettingsContext";
import { useVial } from "@/contexts/VialContext";
import { cn } from "@/lib/utils";
import { KeyContent } from "@/types/vial.types";
import { hoverBackgroundClasses, hoverBorderClasses, hoverHeaderClasses } from "@/utils/colors";
import { getKeyContents } from "@/utils/keys";
import OneShotModifierSelector, {
    bitmaskToOsmKeycode,
    bitmaskToModTapKeycode,
    bitmaskToLabel,
    MOD_BITS,
} from "../components/OneShotModifierSelector";

interface Props {
    isPicker?: boolean;
}

type ModifierMode = "osm" | "modtap";

// Preset bitmasks
const PRESETS = {
    meh: MOD_BITS.LCTRL | MOD_BITS.LSHIFT | MOD_BITS.LALT,
    hyper: MOD_BITS.LCTRL | MOD_BITS.LSHIFT | MOD_BITS.LALT | MOD_BITS.LGUI,
    rMeh: MOD_BITS.RCTRL | MOD_BITS.RSHIFT | MOD_BITS.RALT,
    rHyper: MOD_BITS.RCTRL | MOD_BITS.RSHIFT | MOD_BITS.RALT | MOD_BITS.RGUI,
};

const OneShotComposerPanel = ({ isPicker }: Props) => {
    const { keyboard } = useVial();
    const { assignKeycode } = useKeyBinding();
    const { selectedLayer } = useLayer();
    const { layoutMode, keyVariant } = useLayoutSettings();

    const [mode, setMode] = useState<ModifierMode>("osm");
    const [modMask, setModMask] = useState(0);

    const isHorizontal = layoutMode === "bottombar";

    if (!keyboard) return null;

    const layerColorName = keyboard?.cosmetic?.layer_colors?.[selectedLayer] || "primary";
    const hoverBorderColor = hoverBorderClasses[layerColorName] || hoverBorderClasses["primary"];
    const hoverBackgroundColor = hoverBackgroundClasses[layerColorName] || hoverBackgroundClasses["primary"];
    const hoverHeaderClass = hoverHeaderClasses[layerColorName] || hoverHeaderClasses["primary"];

    // Generate keycode based on mode
    const composedKeycode = mode === "osm"
        ? bitmaskToOsmKeycode(modMask)
        : bitmaskToModTapKeycode(modMask);

    const hasSelection = composedKeycode !== null;
    const modLabel = bitmaskToLabel(modMask);

    const handleAssign = () => {
        if (composedKeycode) {
            assignKeycode(composedKeycode);
        }
    };

    // Get key contents for preview
    const getPreviewContents = (): KeyContent | undefined => {
        if (!composedKeycode) return undefined;
        return getKeyContents(keyboard, composedKeycode) as KeyContent;
    };

    const keySizeClass = keyVariant === 'small' ? 'h-[30px] w-[30px]' : keyVariant === 'medium' ? 'h-[45px] w-[45px]' : 'h-[60px] w-[60px]';

    // Toggle button component
    const ToggleButton = ({
        active,
        onClick,
        children,
        className,
    }: {
        active: boolean;
        onClick: () => void;
        children: React.ReactNode;
        className?: string;
    }) => (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "px-3 py-1.5 text-xs uppercase tracking-wide rounded-md transition-all font-bold border",
                active
                    ? "bg-black text-white shadow-sm border-black"
                    : "text-gray-500 border-transparent hover:text-black hover:bg-white hover:shadow-sm",
                className
            )}
        >
            {children}
        </button>
    );

    // Horizontal layout for bottom panel
    if (isHorizontal) {
        return (
            <div className="flex flex-row gap-4 h-full items-center px-4 py-2">
                {/* Mode toggle */}
                <div className="flex flex-row items-center gap-0.5 bg-gray-200/50 p-0.5 rounded-md border border-gray-400/50">
                    <ToggleButton active={mode === "osm"} onClick={() => setMode("osm")}>
                        OSM
                    </ToggleButton>
                    <ToggleButton active={mode === "modtap"} onClick={() => setMode("modtap")}>
                        MT
                    </ToggleButton>
                </div>

                {/* Modifier selector - compact version */}
                <div className="flex-1">
                    <OneShotModifierSelector value={modMask} onChange={setModMask} />
                </div>

                {/* Preview key */}
                <div className="flex flex-col items-center gap-1">
                    <div className={cn("w-[45px] h-[45px]", !hasSelection && "opacity-40")}>
                        <Key
                            isRelative
                            x={0} y={0} w={1} h={1} row={-1} col={-1}
                            keycode={composedKeycode || "KC_NO"}
                            label={modLabel || "---"}
                            keyContents={getPreviewContents()}
                            layerColor={hasSelection ? "sidebar" : undefined}
                            headerClassName={hasSelection ? `bg-kb-sidebar-dark ${hoverHeaderClass}` : "bg-gray-300"}
                            hoverBorderColor={hoverBorderColor}
                            hoverBackgroundColor={hoverBackgroundColor}
                            hoverLayerColor={layerColorName}
                            variant="medium"
                            onClick={hasSelection ? handleAssign : undefined}
                        />
                    </div>
                </div>

                {hasSelection && (
                    <span className="text-xs text-gray-500">Click key to assign</span>
                )}
            </div>
        );
    }

    // Sidebar layout (vertical)
    return (
        <div className="flex flex-col gap-5 py-4 px-5">
            {isPicker && (
                <div className="pb-1">
                    <span className="font-semibold text-xl text-slate-700">One-Shot / Mod-Tap</span>
                </div>
            )}

            {/* Mode toggle */}
            <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-500">Mode</span>
                <div className="flex flex-row items-center gap-0.5 bg-gray-200/50 p-0.5 rounded-md border border-gray-400/50 w-fit">
                    <ToggleButton active={mode === "osm"} onClick={() => setMode("osm")}>
                        One-Shot
                    </ToggleButton>
                    <ToggleButton active={mode === "modtap"} onClick={() => setMode("modtap")}>
                        Mod-Tap
                    </ToggleButton>
                </div>
            </div>

            {/* Modifier selector with L/R drop-under buttons */}
            <OneShotModifierSelector value={modMask} onChange={setModMask} />

            {/* Presets */}
            <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-500">Presets</span>
                <div className="flex flex-row gap-2 flex-wrap">
                    <button
                        type="button"
                        onClick={() => setModMask(PRESETS.meh)}
                        className="px-3 h-8 rounded-md text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                    >
                        Meh (L)
                    </button>
                    <button
                        type="button"
                        onClick={() => setModMask(PRESETS.hyper)}
                        className="px-3 h-8 rounded-md text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                    >
                        Hyper (L)
                    </button>
                    <button
                        type="button"
                        onClick={() => setModMask(PRESETS.rMeh)}
                        className="px-3 h-8 rounded-md text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                    >
                        Meh (R)
                    </button>
                    <button
                        type="button"
                        onClick={() => setModMask(PRESETS.rHyper)}
                        className="px-3 h-8 rounded-md text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                    >
                        Hyper (R)
                    </button>
                </div>
            </div>

            {/* Preview key */}
            <div className="flex flex-col gap-3 pt-4 items-center">
                <span className="text-sm font-medium text-slate-500">Preview</span>
                <div className={cn(keySizeClass, !hasSelection && "opacity-40")}>
                    <Key
                        isRelative
                        x={0} y={0} w={1} h={1} row={-1} col={-1}
                        keycode={composedKeycode || "KC_NO"}
                        label={modLabel || "---"}
                        keyContents={getPreviewContents()}
                        layerColor={hasSelection ? "sidebar" : undefined}
                        headerClassName={hasSelection ? `bg-kb-sidebar-dark ${hoverHeaderClass}` : "bg-gray-300"}
                        hoverBorderColor={hoverBorderColor}
                        hoverBackgroundColor={hoverBackgroundColor}
                        hoverLayerColor={layerColorName}
                        variant={keyVariant}
                        onClick={hasSelection ? handleAssign : undefined}
                    />
                </div>
                {hasSelection ? (
                    <span className="text-sm text-gray-600">
                        Click to assign: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">{composedKeycode}</code>
                    </span>
                ) : (
                    <span className="text-sm text-gray-400">Select modifiers above</span>
                )}
            </div>
        </div>
    );
};

export default OneShotComposerPanel;
