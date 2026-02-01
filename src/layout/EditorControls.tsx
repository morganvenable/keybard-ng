import React from "react";
import { cn } from "@/lib/utils";
import { PanelBottom, PanelRight } from "lucide-react";
import { InfoIcon } from "@/components/icons/InfoIcon";
import { useLayoutSettings } from "@/contexts/LayoutSettingsContext";
import { useVial } from "@/contexts/VialContext";
import { useChanges } from "@/hooks/useChanges";

interface EditorControlsProps {
    showInfoPanel: boolean;
    setShowInfoPanel: (show: boolean) => void;
    showInfoToggle?: boolean;
    children?: React.ReactNode;
}

export const EditorControls: React.FC<EditorControlsProps> = ({
    showInfoPanel,
    setShowInfoPanel,
    showInfoToggle = true,
    children
}) => {
    const {
        keyVariant,
        setKeyVariant,
        isAutoKeySize,
        setIsAutoKeySize,
        isAutoLayoutMode,
        setIsAutoLayoutMode,
        setLayoutMode
    } = useLayoutSettings();

    const { getPendingCount, commit, clearAll } = useChanges();
    const { resetToOriginal } = useVial();

    return (
        <div className="flex items-center gap-6">
            {/* Push Changes and Revert buttons - only show when there are pending changes */}
            {getPendingCount() > 0 && (
                <div className="flex flex-row items-center gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            commit();
                        }}
                        className="px-3 py-1 text-xs font-medium rounded-full bg-gray-800 text-white hover:bg-gray-700 transition-all"
                        title="Push all pending changes to keyboard"
                    >
                        Push Changes ({getPendingCount()})
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            clearAll();
                            resetToOriginal();
                        }}
                        className="px-3 py-1 text-xs font-medium rounded-full bg-red-500 text-white hover:bg-red-600 transition-all"
                        title="Revert all pending changes"
                    >
                        Revert
                    </button>
                </div>
            )}

            <div className="flex flex-row items-center gap-0.5 bg-gray-200/50 p-0.5 rounded-md border border-gray-300/50 w-fit">
                {(['default', 'medium', 'small'] as const).map((variant) => (
                    <button
                        key={variant}
                        onClick={(e) => {
                            e.stopPropagation();
                            setKeyVariant(variant);
                        }}
                        className={cn(
                            "px-2 py-0.5 text-[10px] uppercase tracking-wide rounded-[4px] transition-all font-semibold border",
                            keyVariant === variant && !isAutoKeySize
                                ? "bg-black text-white shadow-sm border-black"
                                : keyVariant === variant && isAutoKeySize
                                    ? "bg-gray-400 text-white border-gray-400"
                                    : "text-gray-500 border-transparent hover:text-gray-900 hover:bg-gray-300/50"
                        )}
                        title={`Set key size to ${variant}`}
                    >
                        {variant === 'default' ? 'Normal' : variant}
                    </button>
                ))}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsAutoKeySize(true);
                    }}
                    className={cn(
                        "px-2 py-0.5 text-[10px] uppercase tracking-wide rounded-[4px] transition-all font-semibold border",
                        isAutoKeySize
                            ? "bg-black text-white shadow-sm border-black"
                            : "text-gray-500 border-transparent hover:text-gray-900 hover:bg-gray-300/50"
                    )}
                    title="Auto size based on window"
                >
                    Auto
                </button>
            </div>

            <div className="flex flex-row items-center gap-0.5 bg-gray-200/50 p-0.5 rounded-md border border-gray-300/50 w-fit">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsAutoLayoutMode(false);
                        setLayoutMode("sidebar");
                    }}
                    className="p-1 rounded-[4px] transition-all text-gray-500 border-transparent hover:text-gray-900 hover:bg-gray-300/50 border"
                    title="Sidebar layout"
                >
                    <PanelRight className="h-3.5 w-3.5" />
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsAutoLayoutMode(false);
                        setLayoutMode("bottombar");
                    }}
                    className={cn(
                        "p-1 rounded-[4px] transition-all border",
                        !isAutoLayoutMode
                            ? "bg-black text-white shadow-sm border-black"
                            : "bg-gray-400 text-white border-gray-400"
                    )}
                    title="Bottom bar layout"
                >
                    <PanelBottom className="h-3.5 w-3.5" />
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsAutoLayoutMode(true);
                    }}
                    className={cn(
                        "px-1.5 py-0.5 text-[10px] uppercase tracking-wide rounded-[4px] transition-all font-semibold border",
                        isAutoLayoutMode
                            ? "bg-black text-white shadow-sm border-black"
                            : "text-gray-500 border-transparent hover:text-gray-900 hover:bg-gray-300/50"
                    )}
                    title="Auto-switch layout based on window size"
                >
                    Auto
                </button>
            </div>

            {showInfoToggle && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowInfoPanel(!showInfoPanel);
                    }}
                    className={cn(
                        "p-1 rounded-[4px] transition-all border",
                        showInfoPanel
                            ? "bg-black text-white shadow-sm border-black"
                            : "text-gray-500 border-transparent hover:text-gray-900 hover:bg-gray-300/50"
                    )}
                    title={showInfoPanel ? "Hide Key Info" : "Show Key Info"}
                >
                    <InfoIcon className="h-3.5 w-3.5" />
                </button>
            )}
            {children}
        </div>
    );
};
