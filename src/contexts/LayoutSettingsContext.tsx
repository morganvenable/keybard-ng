import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";

export type KeyVariant = "default" | "medium" | "small";
export type LayoutMode = "sidebar" | "bottombar";

// Fallback keyboard widths (used when actual measurements aren't available)
const FALLBACK_KEYBOARD_WIDTH = {
    default: 1400,
    medium: 1100,
    small: 750,
};

// Fallback keyboard heights (used when actual measurements aren't available)
const FALLBACK_KEYBOARD_HEIGHT = {
    default: 600,
    medium: 450,
    small: 300,
};

// Sidebar widths (from sidebar.tsx CSS variables)
const PRIMARY_SIDEBAR_EXPANDED = 188; // 11.75rem
const PRIMARY_SIDEBAR_COLLAPSED = 48; // 3rem
const SECONDARY_SIDEBAR_WIDTH = 450;
const LAYOUT_MARGINS = 40; // Buffer for container padding

// Measured dimensions from EditorLayout
interface MeasuredDimensions {
    containerWidth: number;
    containerHeight: number;
    keyboardWidths: { default: number; medium: number; small: number };
    keyboardHeights: { default: number; medium: number; small: number };
}

interface LayoutSettingsContextType {
    internationalLayout: string;
    setInternationalLayout: (layout: string) => void;
    keyVariant: KeyVariant;
    setKeyVariant: (variant: KeyVariant) => void;
    layoutMode: LayoutMode;
    setLayoutMode: (mode: LayoutMode) => void;
    isAutoLayoutMode: boolean;
    setIsAutoLayoutMode: (auto: boolean) => void;
    isAutoKeySize: boolean;
    setIsAutoKeySize: (auto: boolean) => void;
    setSecondarySidebarOpen: (open: boolean) => void;
    setPrimarySidebarExpanded: (expanded: boolean, isManualToggle?: boolean) => void;
    // Callback for EditorLayout to provide - allows context to request sidebar collapse/expand
    registerPrimarySidebarControl: (collapse: () => void, expand: () => void) => void;
    // Allow EditorLayout to provide actual measured dimensions for more accurate auto-sizing
    setMeasuredDimensions: (dimensions: MeasuredDimensions) => void;
}

const LayoutSettingsContext = createContext<LayoutSettingsContextType | undefined>(undefined);

export const LayoutSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [internationalLayout, setInternationalLayout] = useState<string>("us");
    const [keyVariant, setKeyVariantState] = useState<KeyVariant>("default");
    const [layoutMode, setLayoutModeState] = useState<LayoutMode>("sidebar");
    const [isAutoLayoutMode, setIsAutoLayoutMode] = useState<boolean>(true);
    const [manualLayoutMode, setManualLayoutMode] = useState<LayoutMode>("sidebar");
    const [isAutoKeySize, setIsAutoKeySize] = useState<boolean>(true);
    const [manualKeyVariant, setManualKeyVariant] = useState<KeyVariant>("default");
    const [secondarySidebarOpen, setSecondarySidebarOpenState] = useState<boolean>(false);
    const [primarySidebarExpanded, setPrimarySidebarExpandedState] = useState<boolean>(true);
    const [collapsePrimarySidebar, setCollapsePrimarySidebar] = useState<(() => void) | null>(null);
    const [expandPrimarySidebar, setExpandPrimarySidebar] = useState<(() => void) | null>(null);
    const [userManuallyCollapsedSidebar, setUserManuallyCollapsedSidebar] = useState<boolean>(false);
    const [measuredDimensions, setMeasuredDimensionsState] = useState<MeasuredDimensions | null>(null);

    // Use refs to track current values without triggering re-renders during calculation
    const secondarySidebarOpenRef = useRef(false);
    const primarySidebarExpandedRef = useRef(true);
    const userManuallyCollapsedRef = useRef(false);
    const measuredDimensionsRef = useRef<MeasuredDimensions | null>(null);
    const layoutModeRef = useRef<LayoutMode>("sidebar");

    const setMeasuredDimensions = useCallback((dimensions: MeasuredDimensions) => {
        measuredDimensionsRef.current = dimensions;
        setMeasuredDimensionsState(dimensions);
    }, []);

    const setSecondarySidebarOpen = useCallback((open: boolean) => {
        if (secondarySidebarOpenRef.current !== open) {
            secondarySidebarOpenRef.current = open;
            setSecondarySidebarOpenState(open);
        }
    }, []);

    const setPrimarySidebarExpanded = useCallback((expanded: boolean, isManualToggle?: boolean) => {
        // Always sync the ref to ensure it matches the actual sidebar state
        primarySidebarExpandedRef.current = expanded;

        // Only update React state if changed (to avoid unnecessary re-renders)
        setPrimarySidebarExpandedState(prev => prev !== expanded ? expanded : prev);

        // Track user manual collapse/expand for auto-expand logic
        if (isManualToggle) {
            if (!expanded) {
                // User manually collapsed - don't auto-expand
                userManuallyCollapsedRef.current = true;
                setUserManuallyCollapsedSidebar(true);
            } else {
                // User manually expanded - allow auto-collapse/expand again
                userManuallyCollapsedRef.current = false;
                setUserManuallyCollapsedSidebar(false);
            }
        }
    }, []);

    const registerPrimarySidebarControl = useCallback((collapse: () => void, expand: () => void) => {
        setCollapsePrimarySidebar(() => collapse);
        setExpandPrimarySidebar(() => expand);
    }, []);

    // Calculate available width for keyboard
    const getAvailableWidth = useCallback((windowWidth: number, mode: LayoutMode, sidebarOpen: boolean, primaryExpanded: boolean): number => {
        const primarySidebar = primaryExpanded ? PRIMARY_SIDEBAR_EXPANDED : PRIMARY_SIDEBAR_COLLAPSED;
        if (mode === "bottombar") {
            // Bottom bar mode: full width minus primary sidebar
            return windowWidth - primarySidebar - LAYOUT_MARGINS;
        }
        // Sidebar mode: account for secondary sidebar if open
        const secondarySidebar = sidebarOpen ? SECONDARY_SIDEBAR_WIDTH : 0;
        return windowWidth - primarySidebar - secondarySidebar - LAYOUT_MARGINS;
    }, []);

    // Get keyboard widths - use measured if available, otherwise fallback
    const getKeyboardWidths = useCallback(() => {
        return measuredDimensionsRef.current?.keyboardWidths ?? FALLBACK_KEYBOARD_WIDTH;
    }, []);

    // Get keyboard heights - use measured if available, otherwise fallback
    const getKeyboardHeights = useCallback(() => {
        return measuredDimensionsRef.current?.keyboardHeights ?? FALLBACK_KEYBOARD_HEIGHT;
    }, []);

    // Determine best key size that fits without occlusion (considers both width and height)
    const getBestKeySize = useCallback((availableWidth: number, availableHeight?: number): KeyVariant => {
        const widths = getKeyboardWidths();
        const heights = getKeyboardHeights();

        // Check if size fits both width and height constraints
        const fitsAt = (size: KeyVariant) => {
            const widthFits = availableWidth >= widths[size];
            const heightFits = availableHeight === undefined || availableHeight >= heights[size];
            return widthFits && heightFits;
        };

        if (fitsAt("default")) return "default";
        if (fitsAt("medium")) return "medium";
        return "small";
    }, [getKeyboardWidths, getKeyboardHeights]);

    // Check if keyboard fits at given size
    const keyboardFits = useCallback((availableWidth: number, size: KeyVariant): boolean => {
        const widths = getKeyboardWidths();
        return availableWidth >= widths[size];
    }, [getKeyboardWidths]);

    // Handle auto-switching based on available space
    const updateAutoLayout = useCallback(() => {
        if (!isAutoLayoutMode && !isAutoKeySize) return;

        const measured = measuredDimensionsRef.current;
        const secondaryOpen = secondarySidebarOpenRef.current;
        const primaryExpanded = primarySidebarExpandedRef.current;
        const userManuallyCollapsed = userManuallyCollapsedRef.current;

        // If we have measured dimensions, use the actual container dimensions directly
        if (measured && isAutoKeySize) {
            // Direct comparison: does the keyboard fit at each size (both width AND height)?
            const containerWidth = measured.containerWidth;
            const containerHeight = measured.containerHeight;
            const widths = measured.keyboardWidths;
            const heights = measured.keyboardHeights;

            // Check if size fits both width and height
            const fitsAt = (size: KeyVariant) =>
                containerWidth >= widths[size] && containerHeight >= heights[size];

            let bestSize: KeyVariant = "small";
            if (fitsAt("default")) {
                bestSize = "default";
            } else if (fitsAt("medium")) {
                bestSize = "medium";
            }
            setKeyVariantState(bestSize);
        }

        // For layout mode, still use window-based calculation for sidebar decisions
        if (isAutoLayoutMode) {
            const windowWidth = window.innerWidth;
            const currentLayoutMode = layoutModeRef.current;

            // Calculate available space in different configurations
            const sidebarExpandedNoSecondary = getAvailableWidth(windowWidth, "sidebar", false, true);
            const sidebarExpandedWithSecondary = getAvailableWidth(windowWidth, "sidebar", true, true);
            const sidebarCollapsedNoSecondary = getAvailableWidth(windowWidth, "sidebar", false, false);
            const sidebarCollapsedWithSecondary = getAvailableWidth(windowWidth, "sidebar", true, false);
            const bottomBarExpandedAvailable = getAvailableWidth(windowWidth, "bottombar", false, true);
            const bottomBarCollapsedAvailable = getAvailableWidth(windowWidth, "bottombar", false, false);

            let targetSidebarExpanded = primaryExpanded;
            // Start with current mode - only change if necessary
            let useSidebarMode = currentLayoutMode === "sidebar";

            // Check with current sidebar state - use appropriate mode for calculation
            // In bottombar mode, secondary sidebar doesn't affect horizontal space
            let currentAvailable: number;
            if (currentLayoutMode === "bottombar") {
                currentAvailable = primaryExpanded ? bottomBarExpandedAvailable : bottomBarCollapsedAvailable;
            } else {
                currentAvailable = primaryExpanded
                    ? (secondaryOpen ? sidebarExpandedWithSecondary : sidebarExpandedNoSecondary)
                    : (secondaryOpen ? sidebarCollapsedWithSecondary : sidebarCollapsedNoSecondary);
            }

            const smallFits = keyboardFits(currentAvailable, "small");

            // If keyboard fits in current mode, evaluate if we should change modes
            if (smallFits) {
                if (useSidebarMode) {
                    // In sidebar mode - check if we can expand the primary sidebar
                    if (!primaryExpanded && !userManuallyCollapsed && expandPrimarySidebar) {
                        const expandedAvailable = secondaryOpen ? sidebarExpandedWithSecondary : sidebarExpandedNoSecondary;
                        if (keyboardFits(expandedAvailable, "small")) {
                            targetSidebarExpanded = true;
                            setTimeout(() => expandPrimarySidebar(), 0);
                        }
                    }
                } else {
                    // In bottombar mode - check if we can switch back to sidebar mode
                    // Use the appropriate width based on whether secondary panel is open
                    const sidebarAvailable = secondaryOpen ? sidebarExpandedWithSecondary : sidebarExpandedNoSecondary;
                    if (keyboardFits(sidebarAvailable, "small")) {
                        useSidebarMode = true;
                        targetSidebarExpanded = true;
                        if (expandPrimarySidebar) {
                            setTimeout(() => expandPrimarySidebar(), 0);
                        }
                    }
                }
            } else if (!smallFits) {
                // Small doesn't fit - try collapsing primary sidebar if expanded
                if (primaryExpanded) {
                    const collapsedAvailable = secondaryOpen ? sidebarCollapsedWithSecondary : sidebarCollapsedNoSecondary;
                    const fitsCollapsed = keyboardFits(collapsedAvailable, "small");

                    if (fitsCollapsed) {
                        // Collapsing sidebar makes it fit - request collapse
                        targetSidebarExpanded = false;
                        if (collapsePrimarySidebar) {
                            setTimeout(() => collapsePrimarySidebar(), 0);
                        }
                    } else {
                        // Even collapsed doesn't fit - switch to bottom bar AND collapse sidebar
                        useSidebarMode = false;
                        targetSidebarExpanded = false;
                        if (collapsePrimarySidebar) {
                            setTimeout(() => collapsePrimarySidebar(), 0);
                        }
                    }
                } else {
                    // Already collapsed and still doesn't fit - switch to bottom bar
                    useSidebarMode = false;
                }
            }

            setLayoutModeState(useSidebarMode ? "sidebar" : "bottombar");

            // If no measured dimensions yet, use calculated available width for key size
            if (!measured && isAutoKeySize) {
                if (useSidebarMode) {
                    const actualAvailable = targetSidebarExpanded
                        ? (secondaryOpen ? sidebarExpandedWithSecondary : sidebarExpandedNoSecondary)
                        : (secondaryOpen ? sidebarCollapsedWithSecondary : sidebarCollapsedNoSecondary);
                    setKeyVariantState(getBestKeySize(actualAvailable));
                } else {
                    const bottomBarAvailable = targetSidebarExpanded ? bottomBarExpandedAvailable : bottomBarCollapsedAvailable;
                    setKeyVariantState(getBestKeySize(bottomBarAvailable));
                }
            }
        }
    }, [isAutoLayoutMode, isAutoKeySize, collapsePrimarySidebar, expandPrimarySidebar, getAvailableWidth, getBestKeySize, keyboardFits]);

    // Listen for window resize
    useEffect(() => {
        const handleResize = () => {
            updateAutoLayout();
        };

        // Set initial value
        updateAutoLayout();

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [updateAutoLayout]);

    // Re-run auto layout when measured dimensions update
    // NOTE: We intentionally do NOT trigger on secondarySidebarOpen or primarySidebarExpanded
    // changes because we don't want clicking sidebar items to cause layout mode switches.
    // Layout mode should only change on window resize.
    useEffect(() => {
        updateAutoLayout();
    }, [measuredDimensions, updateAutoLayout]);

    // Sync refs when state changes (in case setState was called directly)
    useEffect(() => {
        secondarySidebarOpenRef.current = secondarySidebarOpen;
    }, [secondarySidebarOpen]);

    useEffect(() => {
        primarySidebarExpandedRef.current = primarySidebarExpanded;
    }, [primarySidebarExpanded]);

    useEffect(() => {
        userManuallyCollapsedRef.current = userManuallyCollapsedSidebar;
    }, [userManuallyCollapsedSidebar]);

    useEffect(() => {
        layoutModeRef.current = layoutMode;
    }, [layoutMode]);

    // When auto mode is disabled, use the manual setting
    useEffect(() => {
        if (!isAutoLayoutMode) {
            setLayoutModeState(manualLayoutMode);
        }
    }, [isAutoLayoutMode, manualLayoutMode]);

    // When auto key size is disabled, use the manual setting
    useEffect(() => {
        if (!isAutoKeySize) {
            setKeyVariantState(manualKeyVariant);
        }
    }, [isAutoKeySize, manualKeyVariant]);

    // Wrapper to handle manual mode changes
    const setLayoutMode = useCallback((mode: LayoutMode) => {
        setManualLayoutMode(mode);
        setIsAutoLayoutMode(false); // Disable auto when user manually selects
        setLayoutModeState(mode);
    }, []);

    // Wrapper to handle manual key variant changes
    const setKeyVariant = useCallback((variant: KeyVariant) => {
        setManualKeyVariant(variant);
        setIsAutoKeySize(false); // Disable auto when user manually selects
        setKeyVariantState(variant);
    }, []);

    return (
        <LayoutSettingsContext.Provider value={{
            internationalLayout,
            setInternationalLayout,
            keyVariant,
            setKeyVariant,
            layoutMode,
            setLayoutMode,
            isAutoLayoutMode,
            setIsAutoLayoutMode,
            isAutoKeySize,
            setIsAutoKeySize,
            setSecondarySidebarOpen,
            setPrimarySidebarExpanded,
            registerPrimarySidebarControl,
            setMeasuredDimensions,
        }}>
            {children}
        </LayoutSettingsContext.Provider>
    );
};

export const useLayoutSettings = () => {
    const context = useContext(LayoutSettingsContext);
    if (!context) {
        throw new Error("useLayoutSettings must be used within a LayoutSettingsProvider");
    }
    return context;
};
