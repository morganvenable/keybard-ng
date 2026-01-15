/**
 * PasteLayerDialog - Confirmation dialog for pasting a copied layer
 *
 * Shows when user presses Ctrl+V with a layer in the clipboard.
 * Asks for confirmation before replacing the current layer.
 */

import type { FC } from "react";
import { AlertTriangle } from "lucide-react";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLayoutLibrary } from "@/contexts/LayoutLibraryContext";

interface PasteLayerDialogProps {
    /** Current layer name (the one being replaced) */
    currentLayerName: string;
    /** Callback when paste is confirmed */
    onConfirm: () => void;
}

export const PasteLayerDialog: FC<PasteLayerDialogProps> = ({
    currentLayerName,
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
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-500" />
                        Paste Layer?
                    </DialogTitle>
                    <DialogDescription>
                        Replace <strong>"{currentLayerName}"</strong> with{" "}
                        <strong>"{layerClipboard.layer.name}"</strong>?
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <p className="text-sm text-gray-600">
                        This will overwrite all keys on the current layer. This action cannot be undone.
                    </p>
                    {layerClipboard.layer.description && (
                        <p className="text-sm text-gray-500 mt-2 italic">
                            "{layerClipboard.layer.description}"
                        </p>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={closePasteDialog}>
                        Cancel
                    </Button>
                    <Button onClick={handlePaste}>
                        Paste
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default PasteLayerDialog;
