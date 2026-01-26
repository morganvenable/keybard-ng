/**
 * LayerRow - A single layer entry in a LayoutGroupCard
 * Shows layer info, mini keyboard preview, and Place button
 */

import type { FC } from "react";
import { ArrowRight } from "lucide-react";

import type { ImportedLayer } from "@/types/layer-library";
import { Button } from "@/components/ui/button";
import { MiniKeyboardPreview } from "@/components/MiniKeyboardPreview";
import { cn } from "@/lib/utils";
import { colorClasses } from "@/utils/colors";

interface LayerRowProps {
    /** The layer to display */
    layer: ImportedLayer;
    /** Source layout name (for display) */
    sourceLayout: string;
    /** Callback when Place button is clicked */
    onPlace: () => void;
    /** Optional search query for highlighting matches */
    searchQuery?: string;
}

export const LayerRow: FC<LayerRowProps> = ({
    layer,
    sourceLayout: _sourceLayout,
    onPlace,
    searchQuery = "",
}) => {
    // Get layer color class
    const layerColorClass = layer.color
        ? colorClasses[layer.color] || "bg-kb-primary"
        : "bg-gray-400";

    // Highlight matching text if search query is provided
    const highlightMatch = (text: string): React.ReactNode => {
        if (!searchQuery) return text;

        const lowerText = text.toLowerCase();
        const lowerQuery = searchQuery.toLowerCase();
        const index = lowerText.indexOf(lowerQuery);

        if (index === -1) return text;

        return (
            <>
                {text.slice(0, index)}
                <mark className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">
                    {text.slice(index, index + searchQuery.length)}
                </mark>
                {text.slice(index + searchQuery.length)}
            </>
        );
    };

    return (
        <div className="px-4 py-3 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
            {/* Mini keyboard preview */}
            <MiniKeyboardPreview
                keymap={layer.keymap}
                layerColor={layer.color}
                className="flex-shrink-0"
            />

            {/* Layer info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    {/* Layer color indicator */}
                    <div
                        className={cn(
                            "w-3 h-3 rounded-full flex-shrink-0",
                            layerColorClass
                        )}
                    />
                    {/* Layer index */}
                    <span className="text-sm font-mono text-gray-500">
                        {layer.index}
                    </span>
                    {/* Layer name */}
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {highlightMatch(layer.name)}
                    </span>
                </div>
            </div>

            {/* Place button - always visible on hover */}
            <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                onClick={(e) => {
                    e.stopPropagation();
                    onPlace();
                }}
                title={`Place "${layer.name}" on current layer`}
            >
                <span className="text-xs font-medium">Place</span>
                <ArrowRight className="w-4 h-4" />
            </Button>
        </div>
    );
};

export default LayerRow;
