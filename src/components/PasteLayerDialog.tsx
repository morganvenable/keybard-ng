import type { FC } from "react";
import ClipboardIcon from "@/components/icons/ClipboardIcon";

import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLayoutLibrary } from "@/contexts/LayoutLibraryContext";

interface PasteLayerDialogProps {
    /** Current layer name (the one being replaced) - No longer used in new design but kept for prop compatibility if needed */
    currentLayerName?: string;
    /** Callback when paste is confirmed */
    onConfirm: () => void;
}

export const PasteLayerDialog: FC<PasteLayerDialogProps> = ({
    onConfirm,
}) => {
    const { layerClipboard, isPasteDialogOpen, closePasteDialog } = useLayoutLibrary();

    if (!layerClipboard) return null;

    const handlePaste = () => {
        onConfirm();
        closePasteDialog();
    };

    return (
        <Dialog open={isPasteDialogOpen} onOpenChange={(open) => !open && closePasteDialog()}>
            <DialogContent className="sm:max-w-[420px] p-8">
                <DialogHeader className="space-y-4">
                    <DialogTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
                        <ClipboardIcon className="w-6 h-6 text-black" />
                        {layerClipboard.layer.name} layer is in the clipboard
                    </DialogTitle>
                </DialogHeader>

                <div className="py-2">
                    <p className="text-gray-600 leading-relaxed">
                        Paste Now into the currently selected layer, or press Cancel and then paste it into any layer using that layer's contextual menu.
                    </p>
                </div>

                <DialogFooter className="mt-8 flex-col sm:flex-row gap-3">
                    <Button
                        variant="outline"
                        onClick={closePasteDialog}
                        className="rounded-full px-8 py-5 text-base font-medium border-gray-200 hover:bg-gray-50 flex-1 sm:flex-none"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handlePaste}
                        className="rounded-full px-8 py-5 text-base font-bold bg-gray-900 hover:bg-black text-white flex-1 sm:flex-none"
                    >
                        Paste Now
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default PasteLayerDialog;
