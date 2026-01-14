/**
 * LayoutCard - A card component for displaying layout metadata in the library
 */

import type { FC } from "react";
import { Clock, Copy, Tag, User } from "lucide-react";

import type { LayoutMetadata } from "@/types/layout-library";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LayoutCardProps {
    layout: LayoutMetadata;
    onPreview: (layout: LayoutMetadata) => void;
    onApply?: (layout: LayoutMetadata) => void;
    className?: string;
}

export const LayoutCard: FC<LayoutCardProps> = ({
    layout,
    onPreview,
    onApply,
    className,
}) => {
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

    // Format clone count
    const formatClones = (count?: number): string => {
        if (!count) return '0';
        if (count >= 1000) {
            return `${(count / 1000).toFixed(1)}k`;
        }
        return count.toString();
    };

    // Category badge style
    const categoryStyle = layout.category === 'blessed'
        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';

    return (
        <div
            className={cn(
                "border rounded-lg p-4 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow",
                "border-gray-200 dark:border-gray-700",
                className
            )}
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        {layout.category === 'blessed' && (
                            <span className="text-yellow-500" title="Official Layout">
                                *
                            </span>
                        )}
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {layout.name}
                        </h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {layout.description}
                    </p>
                </div>
                <span className={cn("text-xs px-2 py-1 rounded-full font-medium", categoryStyle)}>
                    {layout.category === 'blessed' ? 'Official' : 'Community'}
                </span>
            </div>

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-3">
                <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {layout.author}
                </span>
                <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(layout.updatedAt)}
                </span>
                {layout.cloneCount !== undefined && layout.cloneCount > 0 && (
                    <span className="flex items-center gap-1">
                        <Copy className="w-3 h-3" />
                        {formatClones(layout.cloneCount)} clones
                    </span>
                )}
            </div>

            {/* Tags */}
            {layout.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                    {layout.tags.slice(0, 4).map(tag => (
                        <span
                            key={tag}
                            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded"
                        >
                            <Tag className="w-2.5 h-2.5" />
                            {tag}
                        </span>
                    ))}
                    {layout.tags.length > 4 && (
                        <span className="text-xs text-gray-500">
                            +{layout.tags.length - 4}
                        </span>
                    )}
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => onPreview(layout)}
                >
                    Preview
                </Button>
                {onApply && (
                    <Button
                        variant="default"
                        size="sm"
                        className="flex-1"
                        onClick={() => onApply(layout)}
                    >
                        Apply
                    </Button>
                )}
            </div>
        </div>
    );
};

export default LayoutCard;
