import { useEffect, useRef } from "react";
import ConnectKeyboard from "./ConnectKeyboard";
import EditorLayout from "@/layout/EditorLayout";
import { useVial } from "@/contexts/VialContext";

const MainScreen = () => {
    const { keyboard } = useVial();
    const hadKeyboardRef = useRef(false);

    // Clear sidebar cookie when first connecting a keyboard
    // This ensures the sidebar starts collapsed on initial connection
    useEffect(() => {
        if (keyboard && !hadKeyboardRef.current) {
            // First time we have a keyboard in this session
            // Clear the sidebar cookie to ensure it starts collapsed
            document.cookie = "primary-nav:state=false; path=/; max-age=604800";
            hadKeyboardRef.current = true;
        } else if (!keyboard) {
            // Reset the ref when keyboard is disconnected so next connection also starts collapsed
            hadKeyboardRef.current = false;
        }
    }, [keyboard]);

    return (
        <div className="bg-kb-gray h-screen flex flex-col overflow-auto">
            <main className="flex-grow overflow-auto items-center">{!keyboard ? <ConnectKeyboard /> : <EditorLayout />}</main>
        </div>
    );
};

export default MainScreen;
