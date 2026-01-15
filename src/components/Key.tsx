import React from "react";
import { cn } from "@/lib/utils";
import { useKeyBinding } from "@/contexts/KeyBindingContext";
import { showModMask } from "@/utils/keys";
import { colorClasses, hoverContainerTextClasses } from "@/utils/colors";
import { UNIT_SIZE } from "../constants/svalboard-layout";
import { KeyContent } from "@/types/vial.types";
import { getHeaderIcons, getCenterContent, getTypeIcon } from "@/utils/key-icons";
import { getPendingChangeClassName } from "@/constants/pending-change-styles";

interface KeyProps {
    x: number; // X position in key units
    y: number; // Y position in key units
    w: number; // Width in key units
    h: number; // Height in key units
    keycode: string; // The keycode (e.g., "KC_A", "MO(2)")
    label: string; // Display label for the key
    row: number; // Matrix row
    col: number; // Matrix column
    selected?: boolean;
    selectedSubsection?: "full" | "inner" | null; // Which subsection is selected for compound keys
    onClick?: (row: number, col: number) => void;
    onSubsectionClick?: (row: number, col: number, subsection: "full" | "inner") => void; // For compound key subsection clicks
    keyContents?: KeyContent; // Additional key contents info
    layerColor?: string;
    isRelative?: boolean;
    className?: string;
    headerClassName?: string;
    variant?: "default" | "medium" | "small";
    hoverBorderColor?: string;
    hoverBackgroundColor?: string;
    hoverLayerColor?: string;
    disableHover?: boolean;
    hasPendingChange?: boolean; // Whether this key has a pending change to push
}

/**
 * Key component representing a single physical or virtual key on the keyboard.
 * Handles different key types (layer, macro, tapdance, etc.) and visual styles.
 */
export const Key: React.FC<KeyProps> = ({
    x,
    y,
    w,
    h,
    keycode,
    label,
    row,
    col,
    layerColor = "primary",
    selected = false,
    selectedSubsection = null,
    onClick,
    onSubsectionClick,
    keyContents,
    isRelative = false,
    className = "",
    headerClassName = "bg-black/30",
    variant = "default",
    hoverBorderColor,
    hoverBackgroundColor,
    hoverLayerColor,
    disableHover = false,
    hasPendingChange = false,
}) => {
    const isSmall = variant === "small";
    const isMedium = variant === "medium";
    const currentUnitSize = isSmall ? 30 : isMedium ? 45 : UNIT_SIZE;
    const { setHoveredKey } = useKeyBinding();


    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onClick) {
            onClick(row, col);
        }
    };

    // For compound keys (layerhold, modtap): clicking header selects full key
    const handleFullClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onSubsectionClick) {
            onSubsectionClick(row, col, "full");
        } else if (onClick) {
            onClick(row, col);
        }
    };

    // For compound keys (layerhold, modtap): clicking center selects inner key only
    const handleInnerClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onSubsectionClick) {
            onSubsectionClick(row, col, "inner");
        } else if (onClick) {
            onClick(row, col);
        }
    };

    const handleMouseEnter = () => {
        if (disableHover) return;
        setHoveredKey({
            type: "keyboard",
            row,
            col,
            keycode,
            label,
        });
    };

    const handleMouseLeave = () => {
        if (disableHover) return;
        setHoveredKey(null);
    };


    // Style for positioning and dimensions
    const boxStyle: React.CSSProperties = {
        left: isRelative ? undefined : `${x * currentUnitSize}px`,
        top: isRelative ? undefined : `${y * currentUnitSize}px`,
        width: `${w * currentUnitSize}px`,
        height: `${h * currentUnitSize}px`,
    };

    // Pre-process label and logic
    let displayLabel = label;
    let bottomStr = "";
    let topLabel: React.ReactNode = "";

    // Handle different key types systematically
    // Use keyContents.str as the display string (not raw keycode) for composed keys
    if (keyContents?.type === "modmask") {
        // Modifier + key combination (e.g., LGUI(KC_TAB))
        // Show key in center, modifier at bottom
        const show = showModMask(keyContents.modids);
        const keysArr = keyContents.str?.split("\n") || [];
        displayLabel = keysArr[0] || "";
        // KC_NO shows blank (handled below), KC_TRNS shows ▽ from str
        bottomStr = show;
    } else if (keyContents?.type === "modtap") {
        // Modifier-tap key (e.g., LGUI_T(KC_TAB))
        // Show key in center, modifier_T in top header
        const keysArr = keyContents.str?.split("\n") || [];
        displayLabel = keysArr[0] || "";
        // KC_NO shows blank (handled below), KC_TRNS shows ▽ from str
        // Extract modifier prefix from keycode (e.g., "LGUI_T(KC_TAB)" -> "LGUI_T")
        const modMatch = keycode.match(/^(\w+_T)\(/);
        topLabel = modMatch ? modMatch[1] : "MOD_T";
    } else if (keyContents?.type === "layerhold") {
        // Layer-tap key (e.g., LT1(KC_ENTER))
        // Show key in center, LT# in header
        // Extract layer number from keycode (e.g., "LT1(KC_ENTER)" -> "LT1")
        const ltMatch = keycode.match(/^LT(\d+)/);
        topLabel = ltMatch ? `LT${ltMatch[1]}` : "LT";
        const keysArr = keyContents.str?.split("\n") || [];
        displayLabel = keysArr[0] || "";
        // KC_NO shows blank (handled below), KC_TRNS shows ▽ from str
    } else if (keyContents?.type === "tapdance") {
        displayLabel = keyContents.tdid?.toString() || "";
    } else if (keyContents?.type === "macro") {
        displayLabel = keyContents.top?.replace("M", "") || "";
    } else if (keyContents?.type === "user") {
        displayLabel = keyContents.str || "";
    } else if (keyContents?.type === "OSM") {
        topLabel = "OSM";
        displayLabel = keyContents.str || "";
    }

    if (displayLabel === "KC_NO") {
        displayLabel = "";
    }

    // Icon logic
    const { icons, isMouse } = getHeaderIcons(keycode, displayLabel);
    if (icons.length > 0) {
        topLabel = <div className="flex items-center justify-center gap-1">{icons}</div>;
    }

    const centerContent = getCenterContent(displayLabel, keycode, isMouse);

    // Determine styling for long text
    const shouldShrinkText =
        ["user", "OSM"].includes(keyContents?.type || "") ||
        (typeof centerContent === "string" &&
            (centerContent.length > 5 || (centerContent.length === 5 && centerContent.toUpperCase().includes("W"))));

    const textStyle: React.CSSProperties = shouldShrinkText
        ? { whiteSpace: "pre-line", fontSize: "0.6rem", wordWrap: "break-word" }
        : {};
    const bottomTextStyle: React.CSSProperties =
        bottomStr.length > 4 ? { whiteSpace: "pre-line", fontSize: "0.6rem", wordWrap: "break-word" } : {};

    // Get the base color classes
    const colorClass = colorClasses[layerColor] || colorClasses["primary"];

    // Determine hover color - use hoverLayerColor if provided, otherwise default to current layer
    const effectiveHoverColorName = hoverLayerColor || layerColor;
    const hoverContainerTextClass = hoverContainerTextClasses[effectiveHoverColorName] || hoverContainerTextClasses["primary"];

    // Get pending change styling if applicable
    const pendingChangeClass = hasPendingChange ? getPendingChangeClassName() : "";

    // Common container classes
    const containerClasses = cn(
        "flex flex-col items-center justify-between cursor-pointer transition-all duration-200 ease-in-out uppercase group overflow-hidden",
        !isRelative && "absolute",
        isSmall ? "rounded-[5px] border" : isMedium ? "rounded-[5px] border-2" : "rounded-md border-2",
        selected
            ? "bg-red-500 text-white border-kb-gray"
            : cn(
                colorClass,
                "border-kb-gray",
                !disableHover && (hoverBorderColor || "hover:border-red-500"),
                !disableHover && hoverBackgroundColor,
                !disableHover && hoverContainerTextClass
            ),
        pendingChangeClass,
        className
    );

    // Specific rendering for Layer keys
    if (keyContents?.type === "layer") {
        const layerIndex = keyContents?.top?.split("(")[1]?.replace(")", "") || "";
        return (
            <div
                className={containerClasses}
                style={boxStyle}
                onClick={handleClick}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                title={keycode}
            >
                <span className={cn(
                    "whitespace-nowrap w-full text-center font-semibold py-0 transition-colors duration-200",
                    isSmall ? "text-[10px] rounded-t-[4px]" : isMedium ? "text-[11px] rounded-t-[4px]" : "text-sm rounded-t-sm",
                    "text-white",
                    headerClassName
                )}>
                    {keyContents?.layertext}
                </span>

                <div className={cn("flex flex-row h-full w-full items-center justify-center", isSmall ? "gap-1" : isMedium ? "gap-1.5" : "gap-2")}>
                    <div className={cn(
                        "text-center justify-center items-center flex font-semibold",
                        isSmall ? "text-[13px]" : isMedium ? "text-[14px]" : (layerIndex.length === 1 ? "text-[16px]" : "text-[15px]")
                    )}>
                        {layerIndex}
                    </div>
                    {getTypeIcon("layer", variant)}
                </div>
            </div>
        );
    }

    // Determine if this is a compound key with subsection selection (layerhold or modtap, NOT modmask)
    const isSubsectionKey = keyContents?.type === "layerhold" || keyContents?.type === "modtap";

    // Visual feedback for subsection selection
    const isFullSelected = selected && (!selectedSubsection || selectedSubsection === "full");
    const isInnerSelected = selected && selectedSubsection === "inner";

    // Default rendering for all other keys
    return (
        <div
            className={containerClasses}
            style={boxStyle}
            // For compound keys with subsections, don't handle click on container
            onClick={isSubsectionKey ? undefined : handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            title={keycode}
        >
            {topLabel && (
                <span
                    className={cn(
                        "whitespace-nowrap w-full text-center font-semibold py-0 flex items-center justify-center transition-colors duration-200",
                        isSmall ? "text-[8px] min-h-[10px] rounded-t-[4px]" : isMedium ? "text-[10px] min-h-[14px] rounded-t-[4px]" : "text-sm min-h-[1.2rem] rounded-t-sm",
                        "text-white",
                        headerClassName,
                        // Visual feedback: highlight header when full key is selected
                        isSubsectionKey && isFullSelected && "ring-2 ring-inset ring-white/50"
                    )}
                    onClick={isSubsectionKey ? handleFullClick : undefined}
                    style={isSubsectionKey ? { cursor: 'pointer' } : undefined}
                >
                    {topLabel}
                </span>
            )}

            {keyContents && getTypeIcon(keyContents.type || "", variant)}

            <div
                className={cn(
                    "text-center w-full h-full justify-center items-center flex font-semibold",
                    isSmall ? "text-[10px] px-0.5" : isMedium ? "text-[12px] px-1" : (typeof centerContent === 'string' && centerContent.length === 1 ? "text-[16px]" : "text-[15px]"),
                    // Visual feedback: highlight center when inner key is selected
                    isSubsectionKey && isInnerSelected && "bg-white/20 rounded"
                )}
                style={textStyle}
                onClick={isSubsectionKey ? handleInnerClick : undefined}
            >
                {centerContent}
            </div>

            {bottomStr !== "" && (
                <span
                    className={cn(
                        "font-semibold items-center flex justify-center whitespace-nowrap w-full text-center py-0 transition-colors duration-200",
                        isSmall ? "text-[8px] min-h-[10px] rounded-b-[4px]" : isMedium ? "text-[10px] min-h-[14px] rounded-b-[4px]" : "text-sm min-h-5 rounded-b-sm",
                        "text-white",
                        headerClassName
                    )}
                    style={bottomTextStyle}
                    // Bottom bar (for modmask) also selects full key
                    onClick={isSubsectionKey ? handleFullClick : undefined}
                >
                    {bottomStr}
                </span>
            )}
        </div>
    );
};
