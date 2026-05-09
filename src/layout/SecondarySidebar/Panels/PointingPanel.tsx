import DynamicMenuPanel from "./DynamicMenuPanel";
import MouseKeysSection from "./MouseKeysSection";
import { Key } from "@/components/Key";
import { useKeyBinding } from "@/contexts/KeyBindingContext";
import { useLayer } from "@/contexts/LayerContext";
import { useLayoutSettings } from "@/contexts/LayoutSettingsContext";
import { useVial } from "@/contexts/VialContext";
import { hoverBackgroundClasses, hoverBorderClasses, hoverHeaderClasses } from "@/utils/colors";
import { getKeyContents } from "@/utils/keys";
import { KeyContent } from "@/types/vial.types";
import DescriptionBlock from "@/layout/SecondarySidebar/components/DescriptionBlock";

// Curated single-line rows for pointing-specific keycodes — the proper home
// for these controls. (MouseKeysSection is a Vial-style catchall; we'll move
// these out of there eventually.)
const BOOST_KEYS = [
    { keycode: "SV_BOOST_2", label: "Boost 2x" },
    { keycode: "SV_BOOST_3", label: "Boost 3x" },
    { keycode: "SV_BOOST_5", label: "Boost 5x" },
    { keycode: "SV_BOOST_2_TG", label: "Boost 2x Toggle" },
    { keycode: "SV_BOOST_3_TG", label: "Boost 3x Toggle" },
    { keycode: "SV_BOOST_5_TG", label: "Boost 5x Toggle" },
];

/**
 * Unified Pointing Devices panel
 * - When disconnected: shows placeholder text
 * - When connected: shows Mouse Keys section at top, then dynamic VIA3 menu content
 */
const PointingPanel = () => {
    const { keyboard, isConnected, connect } = useVial();
    const { assignKeycode } = useKeyBinding();
    const { selectedLayer } = useLayer();
    const { layoutMode } = useLayoutSettings();
    const isHorizontal = layoutMode === "bottombar";

    const layerColorName = keyboard?.cosmetic?.layer_colors?.[selectedLayer] || "primary";
    const hoverBorderColor = hoverBorderClasses[layerColorName] || hoverBorderClasses.primary;
    const hoverBackgroundColor = hoverBackgroundClasses[layerColorName] || hoverBackgroundClasses.primary;
    const hoverHeaderClass = hoverHeaderClasses[layerColorName] || hoverHeaderClasses.primary;

    const renderBoostRow = () => (
        <div className="flex flex-col gap-1">
            <span className="font-semibold text-lg text-black">Boost</span>
            <div className="flex flex-row flex-wrap gap-1">
                {BOOST_KEYS.map((k) => {
                    const keyContents = keyboard ? getKeyContents(keyboard, k.keycode) : undefined;
                    return (
                        <Key
                            key={k.keycode}
                            x={0} y={0} w={1} h={1} row={0} col={0}
                            keycode={k.keycode}
                            label={k.label}
                            forceLabel={true}
                            keyContents={keyContents as KeyContent | undefined}
                            layerColor="sidebar"
                            headerClassName={`bg-kb-sidebar-dark ${hoverHeaderClass}`}
                            isRelative
                            variant="default"
                            hoverBorderColor={hoverBorderColor}
                            hoverBackgroundColor={hoverBackgroundColor}
                            hoverLayerColor={layerColorName}
                            onClick={() => assignKeycode(k.keycode)}
                            disableTooltip={true}
                        />
                    );
                })}
            </div>
        </div>
    );

    // Find the pointing device menu from keyboard definition
    // Support both "Pointing Device" (singular) and "Pointing Devices" (plural)
    const pointingMenuIndex = keyboard?.menus?.findIndex(
        (menu) => menu.label?.toLowerCase().includes('pointing')
    ) ?? -1;

    // Not connected
    if (!isConnected) {
        return (
            <section className="h-full flex flex-col pt-2">
                <DescriptionBlock>
                    <button
                        onClick={() => connect()}
                        className="underline underline-offset-2 hover:text-foreground transition-all text-inherit"
                    >
                        Connect
                    </button>
                    {" keyboard to view pointing devices settings."}
                </DescriptionBlock>
            </section>
        );
    }

    // Horizontal layout for bottom panel
    if (isHorizontal) {
        return (
            <div className="flex flex-row gap-3 h-full items-start flex-wrap content-start">
                <MouseKeysSection compact variant="medium" />
                {renderBoostRow()}
                {pointingMenuIndex !== -1 && (
                    <DynamicMenuPanel menuIndex={pointingMenuIndex} horizontal />
                )}
            </div>
        );
    }

    // Vertical layout for sidebar
    return (
        <section className="h-full flex flex-col overflow-hidden">
            <div className="flex-1 overflow-auto">
                <DescriptionBlock>
                    Emulate a mouse using the Mouse Button keys, adjust the Track Ball speed with the Sniper keys, and adjust the settings for your pointing devices.
                </DescriptionBlock>
                {/* Mouse Keys section at top */}
                <div className="pb-4">
                    <MouseKeysSection />
                </div>

                {/* Dedicated Boost row */}
                <div className="pb-4">{renderBoostRow()}</div>

                {/* Dynamic menu content below */}
                {pointingMenuIndex !== -1 ? (
                    <DynamicMenuPanel menuIndex={pointingMenuIndex} />
                ) : (
                    <p className="text-muted-foreground text-center">
                        This keyboard does not have additional pointing device settings
                    </p>
                )}
            </div>
        </section>
    );
};

export default PointingPanel;
