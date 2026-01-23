import { ArrowUpDown, BookOpen, Download, HelpCircle, Keyboard, LayoutGrid, ListOrdered, LucideIcon, Mouse, Piano, Pointer, Repeat, Settings, SquareDot, Unplug, Upload, Zap } from "lucide-react";
import { useNavigation } from "@/App";
import { useCallback, useMemo, useRef, useState } from "react";

import ComboIcon from "@/components/ComboIcon";
import GamepadDirectional from "@/components/icons/GamepadDirectional";
import { isExcludedMenu, getIconForMenu } from "@/constants/custom-ui-exclusions";

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
const MENU_ITEM_GAP_PX = 42; // Matches Gap-4 (16px) + Button Height (26px)
const DIVIDER_HEIGHT_PX = 17; // 1px + 2*8px (my-2)
const FLEX_GAP_PX = 16; // Gap-4
const FEATURE_SECTION_OFFSET = DIVIDER_HEIGHT_PX + FLEX_GAP_PX;

// Icon layout helpers - use isCollapsed boolean
const getIconGutterWidth = (isCollapsed: boolean) => isCollapsed ? "w-full" : "w-[43px]";
const getIconPadding = (isCollapsed: boolean) => isCollapsed ? "pl-0" : "pl-[13px]";
const getLogoPadding = (isCollapsed: boolean) => isCollapsed ? "pl-0" : "pl-[10px]";
const getIconJustify = (isCollapsed: boolean) => isCollapsed ? "justify-center" : "justify-start";

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
    { title: "Pointing", url: "pointing", icon: Pointer },
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
    isCollapsed: boolean;
    onClick: (item: SidebarItem) => void;
}

const SidebarNavItem = ({
    item,
    isActive,
    isPreviousPanel,
    alternativeHeader,
    isCollapsed,
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
                <div className={cn(getIconGutterWidth(isCollapsed), "h-full flex items-center shrink-0", getIconJustify(isCollapsed), getIconPadding(isCollapsed))}>
                    <item.icon className="h-4 w-4 shrink-0" />
                </div>
                <span className={cn("truncate", isCollapsed && "hidden")}>
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
    const { navigateTo } = useNavigation();

    // Import/Export state
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [exportFormat, setExportFormat] = useState<"viable" | "vil">("viable");
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
            } else {
                await fileService.downloadVIL(keyboard, includeMacros);
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

    // Build dynamic menu items from keyboard definition
    const dynamicMenuItems: SidebarItem[] = useMemo(() => {
        if (!keyboard?.menus) return [];

        return keyboard.menus
            .filter((menu) => !isExcludedMenu(menu.label))
            .map((menu, index) => {
                const iconName = getIconForMenu(menu.label);
                // Map icon name to component - for now use Mouse as default
                const IconComponent = iconName === 'mouse' ? Mouse : Settings;

                return {
                    title: menu.label || `Menu ${index}`,
                    url: `dynamic-menu-${index}`,
                    icon: IconComponent,
                };
            });
    }, [keyboard?.menus]);

    const activePrimaryIndex = primarySidebarItems.findIndex((item) => item.url === activePanel);
    const activeFeatureIndex = featureSidebarItems.findIndex((item) => item.url === activePanel);
    const activeDynamicIndex = dynamicMenuItems.findIndex((item) => item.url === activePanel);
    const activeFooterIndex = footerItems.findIndex((item) => item.url === activePanel);

    let indicatorY = -1;
    if (activePrimaryIndex !== -1) {
        indicatorY = activePrimaryIndex * MENU_ITEM_GAP_PX;
    } else if (activeFeatureIndex !== -1) {
        indicatorY = (primarySidebarItems.length * MENU_ITEM_GAP_PX) + FEATURE_SECTION_OFFSET + (activeFeatureIndex * MENU_ITEM_GAP_PX);
    } else if (activeDynamicIndex !== -1 && dynamicMenuItems.length > 0) {
        // Dynamic menu indicator position: after primary + feature + divider
        indicatorY = (primarySidebarItems.length * MENU_ITEM_GAP_PX) + FEATURE_SECTION_OFFSET + (featureSidebarItems.length * MENU_ITEM_GAP_PX) + FEATURE_SECTION_OFFSET + (activeDynamicIndex * MENU_ITEM_GAP_PX);
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
            accept=".viable,.vil,.json"
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
                        <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as "viable" | "vil")}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select format" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="viable">.viable (Recommended)</SelectItem>
                                <SelectItem value="vil">.vil (Vial compatible)</SelectItem>
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
            <SidebarContent className={cn("py-4 overflow-y-auto overflow-x-hidden flex flex-col", isCollapsed && "scrollbar-none")}>
                {/* Header section - Logo, Connect, Import/Export */}
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
                                <div className={cn(getIconGutterWidth(isCollapsed), "h-4 flex items-center shrink-0", getIconJustify(isCollapsed), getLogoPadding(isCollapsed))}>
                                    <Logo />
                                </div>
                                <span className={cn("text-[22px] font-semibold truncate", isCollapsed && "hidden")}>keybard</span>
                            </button>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild size="nav" className="text-slate-600 transition-colors">
                            <button type="button" onClick={(e) => { e.stopPropagation(); connect(); }} className="flex w-full items-center justify-start">
                                <div className={cn(getIconGutterWidth(isCollapsed), "h-4 flex items-center shrink-0", getIconJustify(isCollapsed), getIconPadding(isCollapsed))}>
                                    {isConnected ? <Zap className="h-4 w-4 shrink-0 fill-black text-black" /> : <Unplug className="h-4 w-4 shrink-0" />}
                                </div>
                                <span className={cn("text-md font-medium truncate", isCollapsed && "hidden")}>{isConnected ? "Connected" : "Connect"}</span>
                            </button>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    {/* Import/Export - expanded view */}
                    {!isCollapsed && (
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild size="nav" className="text-slate-600 transition-colors">
                                <div className="flex w-full items-center justify-start">
                                    <div className={cn(getIconGutterWidth(isCollapsed), "h-4 flex items-center shrink-0", getIconJustify(isCollapsed), getIconPadding(isCollapsed))}>
                                        <ArrowUpDown className="h-4 w-4 shrink-0" />
                                    </div>
                                    <button type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="text-sm font-medium hover:text-slate-900">
                                        Import
                                    </button>
                                    <span className="text-slate-300 mx-1.5">|</span>
                                    <button type="button" onClick={(e) => { e.stopPropagation(); setIsExportOpen(true); }} className="text-sm font-medium hover:text-slate-900 disabled:opacity-50" disabled={!keyboard}>
                                        Export
                                    </button>
                                </div>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    )}
                    {/* Import - collapsed view */}
                    {isCollapsed && (
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild size="nav" tooltip="Import" sidebarName="primary-nav" className="text-slate-600 transition-colors">
                                <button type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="flex w-full items-center justify-center">
                                    <div className={cn(getIconGutterWidth(isCollapsed), "h-4 flex items-center shrink-0", getIconJustify(isCollapsed), getIconPadding(isCollapsed))}>
                                        <Download className="h-4 w-4 shrink-0" />
                                    </div>
                                </button>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    )}
                    {/* Export - collapsed view */}
                    {isCollapsed && (
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild size="nav" tooltip="Export" sidebarName="primary-nav" className="text-slate-600 transition-colors">
                                <button type="button" onClick={(e) => { e.stopPropagation(); setIsExportOpen(true); }} className="flex w-full items-center justify-center disabled:opacity-50" disabled={!keyboard}>
                                    <div className={cn(getIconGutterWidth(isCollapsed), "h-4 flex items-center shrink-0", getIconJustify(isCollapsed), getIconPadding(isCollapsed))}>
                                        <Upload className="h-4 w-4 shrink-0" />
                                    </div>
                                </button>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    )}
                    {/* Layer Library - expanded view only */}
                    {!isCollapsed && (
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild size="nav" className="text-slate-600 transition-colors">
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); navigateTo("explore"); }}
                                    className="flex w-full items-center justify-start"
                                >
                                    <div className={cn(getIconGutterWidth(isCollapsed), "h-4 flex items-center shrink-0", getIconJustify(isCollapsed), getIconPadding(isCollapsed))}>
                                        <BookOpen className="h-4 w-4 shrink-0" />
                                    </div>
                                    <span className="text-sm font-medium hover:text-slate-900">
                                        Layer Library
                                    </span>
                                </button>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    )}
                    {/* Layer Library - collapsed view */}
                    {isCollapsed && (
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild size="nav" tooltip="Layer Library" sidebarName="primary-nav" className="text-slate-600 transition-colors">
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); navigateTo("explore"); }}
                                    className="flex w-full items-center justify-center"
                                >
                                    <div className={cn(getIconGutterWidth(isCollapsed), "h-4 flex items-center shrink-0", getIconJustify(isCollapsed), getIconPadding(isCollapsed))}>
                                        <BookOpen className="h-4 w-4 shrink-0" />
                                    </div>
                                </button>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    )}
                </SidebarMenu>

                {/* Main navigation - vertically centered in available space */}
                <div className="flex-1 flex flex-col justify-center py-2">
                    <SidebarMenu className="relative">
                        {indicatorY !== -1 && <SlidingIndicator y={indicatorY} />}
                        {primarySidebarItems.map((item) => (
                            <SidebarNavItem
                                key={item.url}
                                item={item}
                                isActive={activePanel === item.url}
                                isPreviousPanel={panelToGoBack === item.url}
                                alternativeHeader={alternativeHeader}
                                isCollapsed={isCollapsed}
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
                                isCollapsed={isCollapsed}
                                onClick={handleItemSelect}
                            />
                        ))}

                        {/* Dynamic menu items from keyboard definition */}
                        {dynamicMenuItems.length > 0 && (
                            <>
                                <div className="mx-4 my-2 h-[1px] bg-slate-200" />
                                {dynamicMenuItems.map((item) => (
                                    <SidebarNavItem
                                        key={item.url}
                                        item={item}
                                        isActive={activePanel === item.url}
                                        isPreviousPanel={panelToGoBack === item.url}
                                        alternativeHeader={alternativeHeader}
                                        isCollapsed={isCollapsed}
                                        onClick={handleItemSelect}
                                    />
                                ))}
                            </>
                        )}
                    </SidebarMenu>
                </div>

                {/* Footer section - About, Matrix Tester, Settings */}
                <div className="py-2 mb-3">
                    <SidebarMenu className="relative">
                        {activeFooterIndex !== -1 && <SlidingIndicator y={activeFooterIndex * MENU_ITEM_GAP_PX} />}
                        {footerItems.map((item) => (
                            <SidebarNavItem
                                key={item.url}
                                item={item}
                                isActive={activePanel === item.url}
                                isCollapsed={isCollapsed}
                                onClick={handleItemSelect}
                            />
                        ))}
                    </SidebarMenu>
                    {/* Branch indicator for dev environment */}
                    {import.meta.env.DEV && (
                        <div className="px-3 pt-2 pb-1 text-[10px] text-slate-400 font-mono truncate group-data-[state=collapsed]:hidden" title={__GIT_BRANCH__}>
                            {__GIT_BRANCH__}
                        </div>
                    )}
                </div>
            </SidebarContent>
        </Sidebar>
        </>
    );
};

export default AppSidebar;
