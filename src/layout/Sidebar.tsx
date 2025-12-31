import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { ChevronsLeftRightEllipsis, Cpu, HelpCircle, LucideIcon, Settings } from "lucide-react";

import ComboIcon from "@/components/ComboIcon";
import KeyboardIcon from "@/components/icons/Keyboard";
import MacrosIcon from "@/components/icons/MacrosIcon";
import MatrixTesterIcon from "@/components/icons/MatrixTester";
import OverridesIcon from "@/components/icons/Overrides";
import TapdanceIcon from "@/components/icons/Tapdance";
import LayersDefaultIcon from "@/components/icons/LayersDefault";
import Logo from "@/components/Logo";
import { usePanels } from "@/contexts/PanelsContext";
import { cn } from "@/lib/utils";
import { useCallback } from "react";

export type SidebarItem = {
    title: string;
    url: string;
    icon: LucideIcon | React.FC<React.SVGProps<SVGSVGElement>>;
};

export const primarySidebarItems: SidebarItem[] = [
    { title: "Keys", url: "keyboard", icon: KeyboardIcon },
    { title: "Layers", url: "layers", icon: LayersDefaultIcon },
    { title: "Tapdances", url: "tapdances", icon: TapdanceIcon },
    { title: "Macros", url: "macros", icon: MacrosIcon },
    { title: "Combos", url: "combos", icon: ComboIcon },
    { title: "Overrides", url: "overrides", icon: OverridesIcon },
    { title: "QMK Keys", url: "qmk", icon: Cpu },
    { title: "Misc Keys", url: "misc", icon: ChevronsLeftRightEllipsis },
    { title: "Matrix Tester", url: "matrixtester", icon: MatrixTesterIcon },
];

const footerItems: SidebarItem[] = [
    { title: "About", url: "about", icon: HelpCircle },
    { title: "Settings", url: "settings", icon: Settings },
];

const AppSidebar = () => {
    const { state, toggleSidebar } = useSidebar("primary-nav", { defaultOpen: false });
    const isCollapsed = state === "collapsed";
    const sidebarClasses = cn(
        "z-11 fixed transition-[box-shadow,border-color] duration-300 ease-out border border-sidebar-border shadow-lg ml-2 h-[98vh] mt-[1vh] transition-all",
        "rounded-3xl"
    );
    const { setItemToEdit, setActivePanel, openDetails, activePanel, panelToGoBack, alternativeHeader, setPanelToGoBack, setAlternativeHeader } = usePanels();
    const handleItemSelect = useCallback(
        (item: SidebarItem) => {
            setActivePanel(item.url);
            openDetails();
            setPanelToGoBack(null);
            setAlternativeHeader(false);
            setItemToEdit(null);
        },
        [openDetails]
    );

    return (
        <Sidebar rounded name="primary-nav" defaultOpen={false} collapsible="icon" hideGap className={sidebarClasses}>
            <SidebarHeader className="p-0 py-2">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            asChild
                            className="!h-10 mx-2 hover:bg-transparent cursor-default"
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="h-6 w-6 -ml-[6px] flex items-center justify-center shrink-0">
                                    <Logo />
                                </div>
                                <span className="text-xl font-bold truncate">Keybard</span>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            asChild
                            className="!h-8 mx-2 text-slate-600 hover:bg-sidebar-accent transition-colors"
                        >
                            <button type="button" onClick={() => toggleSidebar()}>
                                <div className="flex items-center gap-3">
                                    <SidebarTrigger name="primary-nav" className="h-6 w-6 -ml-2 shrink-0 pointer-events-none" />
                                    <span className="text-sm font-semibold truncate">Hide Menu</span>
                                </div>
                            </button>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="py-2">
                <SidebarMenu className="justify-center h-full">
                    {primarySidebarItems.map((item) => {
                        const isActive = activePanel === item.url;
                        const isPreviousPanel = panelToGoBack === item.url;
                        return (
                            <SidebarMenuItem key={item.title} className={`cursor-pointer relative`}>
                                {isActive && <div className="absolute left-[4px] top-[7px] h-[26px] w-[3px] bg-black z-20" />}
                                <SidebarMenuButton
                                    asChild
                                    tooltip={item.title}
                                    sidebarName="primary-nav"
                                    sidebarDefaultOpen={false}
                                    className={cn(
                                        "!h-10 transition-colors hover:bg-sidebar-accent font-semibold",
                                        (alternativeHeader ? isPreviousPanel : isActive) ? "text-sidebar-foreground" : "text-gray-400",
                                        "mx-2"
                                    )}
                                >
                                    <button
                                        type="button"
                                        onClick={() => handleItemSelect(item)}
                                        className="flex w-full items-center gap-3 justify-start pl-2"
                                        aria-current={isActive ? "page" : undefined}
                                    >
                                        <item.icon className="h-6 w-6" />
                                        {!isCollapsed && <span>{item.title}</span>}
                                    </button>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        );
                    })}
                </SidebarMenu>
            </SidebarContent>

            <SidebarFooter className="p-0 py-2">
                <SidebarMenu>
                    {footerItems.map((item) => {
                        const isActive = activePanel === item.url;
                        return (
                            <SidebarMenuItem key={item.title} className="relative">
                                {isActive && <div className="absolute left-[4px] top-[7px] h-[26px] w-[3px] bg-black z-20" />}
                                <SidebarMenuButton
                                    asChild
                                    tooltip={item.title}
                                    sidebarName="primary-nav"
                                    sidebarDefaultOpen={false}
                                    className={cn(
                                        "!h-10 transition-colors hover:bg-sidebar-accent font-semibold",
                                        isActive ? "text-sidebar-foreground" : "text-gray-400",
                                        "mx-2"
                                    )}
                                >
                                    <button
                                        type="button"
                                        onClick={() => handleItemSelect(item)}
                                        className="flex w-full items-center gap-3 justify-start pl-2"
                                    >
                                        <item.icon className="h-6 w-6" />
                                        {!isCollapsed && <span>{item.title}</span>}
                                    </button>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        );
                    })}
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
};

export default AppSidebar;
