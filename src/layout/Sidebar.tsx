import { ChevronsRight, Download, HelpCircle, Keyboard, LayoutGrid, ListOrdered, LucideIcon, Piano, Repeat, Settings, SquareDot, Unplug, Upload, Zap } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import ComboIcon from "@/components/ComboIcon";
import GamepadDirectional from "@/components/icons/GamepadDirectional";

import LayersDefaultIcon from "@/components/icons/LayersDefault";
import MacrosIcon from "@/components/icons/MacrosIcon";
import MouseIcon from "@/components/icons/Mouse";
import OverridesIcon from "@/components/icons/Overrides";
import TapdanceIcon from "@/components/icons/Tapdance";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar
} from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { useChanges } from "@/contexts/ChangesContext";
import { usePanels } from "@/contexts/PanelsContext";
import { useVial } from "@/contexts/VialContext";
import { fileService } from "@/services/file.service";
import { cn } from "@/lib/utils";

// --- Constants ---
const ICON_GUTTER_WIDTH = "w-[43px]";
const BASE_ICON_PADDING = "pl-[13px]";
const LOGO_ICON_PADDING = "pl-[10px]";
const MENU_ITEM_GAP_PX = 42; // Matches Gap-4 (16px) + Button Height (26px)
const DIVIDER_HEIGHT_PX = 17; // 1px + 2*8px (my-2)
const FLEX_GAP_PX = 16; // Gap-4
const FEATURE_SECTION_OFFSET = DIVIDER_HEIGHT_PX + FLEX_GAP_PX;

export type SidebarItem = {
    title: string;
    url: string;
    icon: LucideIcon | React.FC<React.SVGProps<SVGSVGElement>>;
};

export const primarySidebarItems: SidebarItem[] = [
    { title: "Keyboard", url: "keyboard", icon: Keyboard },
    { title: "Special", url: "special", icon: Piano },
    { title: "One-Shot", url: "qmk", icon: SquareDot },
    { title: "Layer Keys", url: "layers", icon: LayersDefaultIcon },
    { title: "Mouse", url: "mouse", icon: MouseIcon },
    { title: "Tap Dances", url: "tapdances", icon: TapdanceIcon },
    { title: "Macros", url: "macros", icon: MacrosIcon },
];

// Alt-Repeat - enabled for testing
const SHOW_ALT_REPEAT = true;
// Leaders - enable when ready to test
const SHOW_LEADERS = true;

const featureSidebarItems: SidebarItem[] = [
    { title: "Combos", url: "combos", icon: ComboIcon },
    { title: "Overrides", url: "overrides", icon: OverridesIcon },
    ...(SHOW_ALT_REPEAT ? [{ title: "Alt-Repeat", url: "altrepeat", icon: Repeat }] : []),
    ...(SHOW_LEADERS ? [{ title: "Leaders", url: "leaders", icon: ListOrdered }] : []),
    { title: "Fragments", url: "fragments", icon: LayoutGrid },
];

const footerItems: SidebarItem[] = [
    { title: "About", url: "about", icon: HelpCircle },
    { title: "Matrix Tester", url: "matrixtester", icon: GamepadDirectional },
    { title: "Settings", url: "settings", icon: Settings },
];

// --- Sub-components ---

const SlidingIndicator = ({ y }: { y: number }) => (
    <div
        className="absolute left-[4px] top-0 w-[3px] h-[26px] bg-black z-20 transition-transform duration-300 ease-in-out pointer-events-none"
        style={{ transform: `translateY(${y}px)` }}
    />
);

interface SidebarNavItemProps {
    item: SidebarItem;
    isActive: boolean;
    isPreviousPanel?: boolean;
    alternativeHeader?: boolean;
    onClick: (item: SidebarItem) => void;
}

const SidebarNavItem = ({
    item,
    isActive,
    isPreviousPanel,
    alternativeHeader,
    onClick,
}: SidebarNavItemProps) => (
    <SidebarMenuItem className="cursor-pointer">
        <SidebarMenuButton
            asChild
            isActive={isActive}
            tooltip={item.title}
            sidebarName="primary-nav"
            size="nav"
            className={cn(
                "transition-colors",
                (alternativeHeader ? isPreviousPanel : isActive) ? "text-sidebar-foreground" : "text-gray-400"
            )}
        >
            <button type="button" onClick={(e) => { e.stopPropagation(); onClick(item); }} className="flex w-full items-center justify-start">
                <div className={cn(ICON_GUTTER_WIDTH, "h-full flex items-center justify-start shrink-0", BASE_ICON_PADDING)}>
                    <item.icon className="h-4 w-4 shrink-0" />
                </div>
                <span className="truncate group-data-[state=collapsed]:hidden">
                    {item.title}
                </span>
            </button>
        </SidebarMenuButton>
    </SidebarMenuItem>
);

// --- Main Component ---

const AppSidebar = () => {
    const { state, toggleSidebar } = useSidebar("primary-nav", { defaultOpen: false });
    const isCollapsed = state === "collapsed";

    const {
        setItemToEdit,
        setActivePanel,
        openDetails,
        activePanel,
        panelToGoBack,
        alternativeHeader,
        setPanelToGoBack,
        setAlternativeHeader,
        open,
        handleCloseDetails,
        setOpen,
    } = usePanels();

    const { connect, isConnected, keyboard, setKeyboard } = useVial();
    const { queue } = useChanges();

    // Import/Export state
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [exportFormat, setExportFormat] = useState<"viable" | "vil" | "kbi">("viable");
    const [includeMacros, setIncludeMacros] = useState(true);

    const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const newKbInfo = await fileService.uploadFile(file);
                if (newKbInfo) {
                    // Start sync if connected
                    if (keyboard && isConnected) {
                        const { importService } = await import('@/services/import.service');
                        const { vialService } = await import('@/services/vial.service');

                        await importService.syncWithKeyboard(
                            newKbInfo,
                            keyboard,
                            queue,
                            { vialService }
                        );

                        // Merge fragment definitions and state from connected keyboard
                        if (keyboard.fragments) {
                            newKbInfo.fragments = keyboard.fragments;
                        }
                        if (keyboard.composition) {
                            newKbInfo.composition = keyboard.composition;
                        }
                        // Merge hardware detection/EEPROM from connected keyboard with user selections from file
                        const ensureMap = <K, V>(obj: Map<K, V> | Record<string, V> | undefined): Map<K, V> => {
                            if (!obj) return new Map();
                            if (obj instanceof Map) return obj;
                            return new Map(Object.entries(obj)) as unknown as Map<K, V>;
                        };

                        if (keyboard.fragmentState) {
                            const importedUserSelections = ensureMap<string, string>(newKbInfo.fragmentState?.userSelections);
                            newKbInfo.fragmentState = {
                                hwDetection: ensureMap<number, number>(keyboard.fragmentState.hwDetection),
                                eepromSelections: ensureMap<number, number>(keyboard.fragmentState.eepromSelections),
                                userSelections: importedUserSelections,
                            };
                        }

                        // Recompose layout with fragment selections
                        const fragmentComposer = vialService.getFragmentComposer();
                        if (fragmentComposer.hasFragments(newKbInfo)) {
                            const composedLayout = fragmentComposer.composeLayout(newKbInfo);
                            if (Object.keys(composedLayout).length > 0) {
                                newKbInfo.keylayout = composedLayout;
                                console.log("Fragment layout recomposed after import:", Object.keys(composedLayout).length, "keys");
                            }
                        }
                    }

                    setKeyboard(newKbInfo);
                    console.log("Import successful", newKbInfo);
                }
            } catch (err) {
                console.error("Upload failed", err);
            }
        }
        // Reset input so same file can be selected again
        if (event.target) {
            event.target.value = '';
        }
    };

    const handleExport = async () => {
        if (!keyboard) {
            console.error("No keyboard loaded");
            return;
        }

        try {
            if (exportFormat === "viable") {
                await fileService.downloadViable(keyboard, includeMacros);
            } else if (exportFormat === "vil") {
                await fileService.downloadVIL(keyboard, includeMacros);
            } else {
                await fileService.downloadKBI(keyboard, includeMacros);
            }
            setIsExportOpen(false);
        } catch (err) {
            console.error("Export failed", err);
        }
    };

    const handleItemSelect = useCallback(
        (item: SidebarItem) => {
            if (item.url === "matrixtester") {
                if (activePanel === "matrixtester") {
                    setActivePanel(null);
                    return;
                }
                setOpen(false);
                setActivePanel("matrixtester");
                setPanelToGoBack(null);
                setItemToEdit(null);
                return;
            }

            if (activePanel === item.url && open) {
                handleCloseDetails();
            } else {
                setActivePanel(item.url);
                openDetails();
                setPanelToGoBack(null);
                setAlternativeHeader(false);
                setItemToEdit(null);
            }
        },
        [activePanel, open, handleCloseDetails, setActivePanel, openDetails, setPanelToGoBack, setAlternativeHeader, setItemToEdit, setOpen]
    );

    const handleBackgroundClick = useCallback(() => {
        handleCloseDetails();
    }, [handleCloseDetails]);

    const activePrimaryIndex = primarySidebarItems.findIndex((item) => item.url === activePanel);
    const activeFeatureIndex = featureSidebarItems.findIndex((item) => item.url === activePanel);
    const activeFooterIndex = footerItems.findIndex((item) => item.url === activePanel);

    let indicatorY = -1;
    if (activePrimaryIndex !== -1) {
        indicatorY = activePrimaryIndex * MENU_ITEM_GAP_PX;
    } else if (activeFeatureIndex !== -1) {
        indicatorY = (primarySidebarItems.length * MENU_ITEM_GAP_PX) + FEATURE_SECTION_OFFSET + (activeFeatureIndex * MENU_ITEM_GAP_PX);
    }

    const sidebarClasses = cn(
        "z-11 fixed transition-[box-shadow,border-color] duration-300 ease-out border border-sidebar-border shadow-lg ml-2 h-[98vh] mt-[1vh] transition-all",
        "rounded-3xl"
    );

    return (
        <>
        {/* Hidden file input for import */}
        <input
            ref={fileInputRef}
            type="file"
            accept=".viable,.vil,.kbi,.json"
            className="hidden"
            onChange={handleFileImport}
        />

        {/* Export dialog */}
        <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Export Keyboard Configuration</DialogTitle>
                    <DialogDescription>
                        Choose the format and options for exporting your keyboard configuration.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="format" className="text-right">Format</Label>
                        <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as "viable" | "vil" | "kbi")}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select format" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="viable">.viable (Recommended)</SelectItem>
                                <SelectItem value="vil">.vil (Vial compatible)</SelectItem>
                                <SelectItem value="kbi">.kbi (Legacy)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="macros" className="text-right">Include Macros</Label>
                        <Switch
                            id="macros"
                            checked={includeMacros}
                            onCheckedChange={setIncludeMacros}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsExportOpen(false)}>Cancel</Button>
                    <Button onClick={handleExport}>Export</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Sidebar rounded name="primary-nav" defaultOpen={false} collapsible="icon" hideGap className={sidebarClasses} onClick={handleBackgroundClick}>
            <SidebarHeader className="p-0 py-4">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild size="nav" className="transition-colors">
                            <button
                                type="button"
                                className="flex w-full items-center justify-start"
                                onClick={(e) => {
                                    e.stopPropagation();

                                    const isPanelOpen = open;
                                    const isMatrixTesterActive = activePanel === "matrixtester";

                                    handleCloseDetails();
                                    if (isMatrixTesterActive) {
                                        setActivePanel(null);
                                    }

                                    if (!isCollapsed) {
                                        toggleSidebar();
                                    } else if (!isPanelOpen && !isMatrixTesterActive) {
                                        toggleSidebar();
                                    }
                                }}
                            >
                                <div className={cn(ICON_GUTTER_WIDTH, "h-4 flex items-center justify-start shrink-0", LOGO_ICON_PADDING)}>
                                    <Logo />
                                </div>
                                <span className="text-[22px] font-semibold truncate group-data-[state=collapsed]:hidden">keybard</span>
                            </button>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild size="nav" className="text-slate-600 transition-colors">
                            <button type="button" onClick={(e) => { e.stopPropagation(); connect(); }} className="flex w-full items-center justify-start">
                                <div className={cn(ICON_GUTTER_WIDTH, "h-4 flex items-center justify-start shrink-0", BASE_ICON_PADDING)}>
                                    {isConnected ? <Zap className="h-4 w-4 shrink-0 fill-black text-black" /> : <Unplug className="h-4 w-4 shrink-0" />}
                                </div>
                                <span className="text-md font-medium truncate group-data-[state=collapsed]:hidden">{isConnected ? "Connected" : "Connect"}</span>
                            </button>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild size="nav" className="text-slate-600 transition-colors">
                            <button type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="flex w-full items-center justify-start">
                                <div className={cn(ICON_GUTTER_WIDTH, "h-4 flex items-center justify-start shrink-0", BASE_ICON_PADDING)}>
                                    <Upload className="h-4 w-4 shrink-0" />
                                </div>
                                <span className="text-md font-medium truncate group-data-[state=collapsed]:hidden">Import</span>
                            </button>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild size="nav" className="text-slate-600 transition-colors">
                            <button type="button" onClick={(e) => { e.stopPropagation(); setIsExportOpen(true); }} className="flex w-full items-center justify-start" disabled={!keyboard}>
                                <div className={cn(ICON_GUTTER_WIDTH, "h-4 flex items-center justify-start shrink-0", BASE_ICON_PADDING)}>
                                    <Download className="h-4 w-4 shrink-0" />
                                </div>
                                <span className="text-md font-medium truncate group-data-[state=collapsed]:hidden">Export</span>
                            </button>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild size="nav" className="text-slate-600 transition-colors">
                            <button type="button" onClick={(e) => { e.stopPropagation(); toggleSidebar(); }} className="flex w-full items-center justify-start">
                                <div className={cn(ICON_GUTTER_WIDTH, "h-4 flex items-center justify-start shrink-0", BASE_ICON_PADDING)}>
                                    <ChevronsRight className={cn("h-4 w-4 shrink-0 transition-transform", !isCollapsed ? "rotate-180" : "")} />
                                </div>
                                <span className="text-md font-medium truncate group-data-[state=collapsed]:hidden">Hide Menu</span>
                            </button>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="py-2 !overflow-visible flex flex-col justify-center">
                <SidebarMenu className="relative">
                    {indicatorY !== -1 && <SlidingIndicator y={indicatorY} />}
                    {primarySidebarItems.map((item) => (
                        <SidebarNavItem
                            key={item.url}
                            item={item}
                            isActive={activePanel === item.url}
                            isPreviousPanel={panelToGoBack === item.url}
                            alternativeHeader={alternativeHeader}
                            onClick={handleItemSelect}
                        />
                    ))}

                    <div className="mx-4 my-2 h-[1px] bg-slate-200" />

                    {featureSidebarItems.map((item) => (
                        <SidebarNavItem
                            key={item.url}
                            item={item}
                            isActive={activePanel === item.url}
                            isPreviousPanel={panelToGoBack === item.url}
                            alternativeHeader={alternativeHeader}
                            onClick={handleItemSelect}
                        />
                    ))}
                </SidebarMenu>
            </SidebarContent>

            <SidebarFooter className="p-0 py-2 !overflow-visible mb-3">
                <SidebarMenu className="relative">
                    {activeFooterIndex !== -1 && <SlidingIndicator y={activeFooterIndex * MENU_ITEM_GAP_PX} />}
                    {footerItems.map((item) => (
                        <SidebarNavItem
                            key={item.url}
                            item={item}
                            isActive={activePanel === item.url}
                            onClick={handleItemSelect}
                        />
                    ))}
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
        </>
    );
};

export default AppSidebar;
