import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

import MainScreen from "./components/MainScreen";
import PrintableKeymapWrapper from "./components/PrintableKeymapWrapper";
import ExploreLayoutsPage from "./pages/ExploreLayoutsPage";
import { ChangesProvider } from "./contexts/ChangesContext";
import { DragProvider } from "./contexts/DragContext";
import { KeyBindingProvider } from "./contexts/KeyBindingContext";
import { LayoutLibraryProvider } from "./contexts/LayoutLibraryContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { VialProvider } from "./contexts/VialContext";

// Simple page navigation context
type Page = "main" | "explore";

interface NavigationContextType {
    currentPage: Page;
    navigateTo: (page: Page) => void;
    goBack: () => void;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

export const useNavigation = () => {
    const context = useContext(NavigationContext);
    if (!context) {
        throw new Error("useNavigation must be used within NavigationProvider");
    }
    return context;
};

const NavigationProvider = ({ children }: { children: ReactNode }) => {
    const [currentPage, setCurrentPage] = useState<Page>("main");

    const navigateTo = useCallback((page: Page) => {
        setCurrentPage(page);
    }, []);

    const goBack = useCallback(() => {
        setCurrentPage("main");
    }, []);

    return (
        <NavigationContext.Provider value={{ currentPage, navigateTo, goBack }}>
            {children}
        </NavigationContext.Provider>
    );
};

function AppContent() {
    const { currentPage, goBack } = useNavigation();

    return (
        <>
            {currentPage === "main" ? (
                <>
                    <MainScreen />
                    <PrintableKeymapWrapper />
                </>
            ) : currentPage === "explore" ? (
                <DragProvider>
                    <ExploreLayoutsPage onBack={goBack} />
                </DragProvider>
            ) : null}
        </>
    );
}

function App() {
    return (
        <VialProvider>
            <SettingsProvider>
                <ChangesProvider>
                    <KeyBindingProvider>
                        <LayoutLibraryProvider>
                            <NavigationProvider>
                                <AppContent />
                            </NavigationProvider>
                        </LayoutLibraryProvider>
                    </KeyBindingProvider>
                </ChangesProvider>
            </SettingsProvider>
        </VialProvider>
    );
}

export default App;
