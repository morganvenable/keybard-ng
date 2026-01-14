import LayoutPreviewModal from "./components/LayoutPreviewModal";
import MainScreen from "./components/MainScreen";
import PrintableKeymapWrapper from "./components/PrintableKeymapWrapper";
import { ChangesProvider } from "./contexts/ChangesContext";
import { KeyBindingProvider } from "./contexts/KeyBindingContext";
import { LayoutLibraryProvider } from "./contexts/LayoutLibraryContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { VialProvider } from "./contexts/VialContext";



function App() {
    return (
        <VialProvider>
            <SettingsProvider>
                <ChangesProvider>
                    <KeyBindingProvider>
                        <LayoutLibraryProvider>
                            <MainScreen />
                            <PrintableKeymapWrapper />
                            <LayoutPreviewModal />
                        </LayoutLibraryProvider>
                    </KeyBindingProvider>
                </ChangesProvider>
            </SettingsProvider>
        </VialProvider>
    );
}

export default App;
