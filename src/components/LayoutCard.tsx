/**
 * LayerCard - A card component for displaying individual layers in the library
 * Focused on copy/paste workflow for individual layers
 */

import type { FC } from "react";
import { Check, Clock, Copy, Loader2, Tag, Trash2, User, Keyboard } from "lucide-react";
import { useState } from "react";

import type { LayerEntry } from "@/types/layer-library";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { colorClasses } from "@/utils/colors";

interface LayerCardProps {
    layer: LayerEntry;
    onCopy: (layer: LayerEntry) => void | Promise<void>;
    onDelete?: (layer: LayerEntry) => void | Promise<void>;
    onClick?: (layer: LayerEntry) => void;
    className?: string;
    /** Compact mode for horizontal/bottom bar layout */
    compact?: boolean;
}

export const LayerCard: FC<LayerCardProps> = ({
    layer,
    onCopy,
    onDelete,
    onClick,
    className,
    compact = false,
}) => {
    const [justCopied, setJustCopied] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent opening preview
        setIsLoading(true);
        setError(null);
        try {
            await onCopy(layer);
            setJustCopied(true);
            setTimeout(() => setJustCopied(false), 2000);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to copy');
            setTimeout(() => setError(null), 3000);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClick = () => {
        onClick?.(layer);
    };

    // Format date relative to now
    const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
        return date.toLocaleDateString();
    };

    // Get layer color class
    const layerColorClass = layer.layerColor
        ? colorClasses[layer.layerColor] || "bg-kb-primary"
        : "bg-kb-primary";

    // Compact mode for horizontal/bottom bar layout - full height card
    if (compact) {
        return (
            <div
                onClick={handleClick}
                className={cn(
                    "border rounded-lg p-2 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow",
                    "border-gray-200 dark:border-gray-700 w-[140px] h-full flex-shrink-0 flex flex-col",
                    onClick && "cursor-pointer",
                    className
                )}
            >
                {/* Header */}
                <div className="flex items-center gap-1 mb-1">
                    <div
                        className={cn(
                            "w-2 h-2 rounded-full flex-shrink-0",
                            layerColorClass
                        )}
                    />
                    <h3 className="font-semibold text-[11px] text-gray-900 dark:text-gray-100 truncate flex-1">
                        {layer.name}
                    </h3>
                </div>

                {/* Key count */}
                <span className="text-[9px] px-1 py-0.5 rounded font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 w-fit mb-1">
                    {layer.keyCount} keys
                </span>

                {/* Description - multi-line, fills space */}
                <p className="text-[9px] text-gray-500 dark:text-gray-400 line-clamp-3 flex-1">
                    {layer.description || "No description"}
                </p>

                {/* Tags - compact */}
                {layer.tags.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 mb-1.5">
                        {layer.tags.slice(0, 2).map(tag => (
                            <span
                                key={tag}
                                className="text-[8px] px-1 py-0.5 bg-gray-50 text-gray-500 rounded"
                            >
                                {tag}
                            </span>
                        ))}
                        {layer.tags.length > 2 && (
                            <span className="text-[8px] text-gray-400">+{layer.tags.length - 2}</span>
                        )}
                    </div>
                )}

                {/* Copy button - at bottom */}
                <Button
                    variant={justCopied ? "default" : error ? "destructive" : "outline"}
                    size="sm"
                    className="w-full h-6 text-[10px] mt-auto"
                    onClick={handleCopy}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                    ) : justCopied ? (
                        <>
                            <Check className="w-3 h-3 mr-1" />
                            Copied
                        </>
                    ) : error ? (
                        "Error"
                    ) : (
                        <>
                            <Copy className="w-3 h-3 mr-1" />
                            Copy
                        </>
                    )}
                </Button>
            </div>
        );
    }

    return (
        <div
            onClick={handleClick}
            className={cn(
                "border rounded-lg p-4 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow",
                "border-gray-200 dark:border-gray-700",
                onClick && "cursor-pointer",
                className
            )}
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        {/* Layer color indicator */}
                        <div
                            className={cn(
                                "w-3 h-3 rounded-full flex-shrink-0",
                                layerColorClass
                            )}
                        />
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {layer.name}
                        </h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {layer.description || "No description"}
                    </p>
                </div>
                <div className="flex items-center gap-1">
                    {/* Key count badge */}
                    <span className="text-xs px-2 py-1 rounded-full font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 flex items-center gap-1">
                        <Keyboard className="w-3 h-3" />
                        {layer.keyCount}
                    </span>
                    {/* Delete button */}
                    {onDelete && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(layer);
                            }}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-3">
                <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {layer.author || "Anonymous"}
                </span>
                <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(layer.updatedAt)}
                </span>
            </div>

            {/* Tags */}
            {layer.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                    {layer.tags.slice(0, 4).map(tag => (
                        <span
                            key={tag}
                            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded"
                        >
                            <Tag className="w-2.5 h-2.5" />
                            {tag}
                        </span>
                    ))}
                    {layer.tags.length > 4 && (
                        <span className="text-xs text-gray-500">
                            +{layer.tags.length - 4}
                        </span>
                    )}
                </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2">
                <Button
                    variant={justCopied ? "default" : error ? "destructive" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={handleCopy}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            Loading...
                        </>
                    ) : justCopied ? (
                        <>
                            <Check className="w-4 h-4 mr-1" />
                            Copied!
                        </>
                    ) : error ? (
                        <>
                            {error}
                        </>
                    ) : (
                        <>
                            <Copy className="w-4 h-4 mr-1" />
                            Copy Layer
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
};

// Keep old name for backwards compatibility
export const LayoutCard = LayerCard;

export default LayerCard;
