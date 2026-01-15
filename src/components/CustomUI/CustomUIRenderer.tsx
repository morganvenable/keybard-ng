import type { CustomUIMenuItem } from "@/types/vial.types";
import { CustomUIControl } from "./controls";
import { evaluateShowIf } from "@/utils/show-if-evaluator";

interface CustomUIRendererProps {
    items: CustomUIMenuItem[];
    values: Map<string, number>;
    onValueChange: (key: string, value: number) => void;
    onButtonClick?: (key: string) => void;
}

/**
 * Recursively renders a menu structure into UI controls
 * Handles nested sections and conditional visibility via showIf
 */
export const CustomUIRenderer: React.FC<CustomUIRendererProps> = ({
    items,
    values,
    onValueChange,
    onButtonClick,
}) => {
    if (!items || !Array.isArray(items)) {
        return null;
    }

    return (
        <div className="space-y-2">
            {items.map((item, index) => {
                // Check showIf conditional visibility
                if (item.showIf && !evaluateShowIf(item.showIf, values)) {
                    return null;
                }

                // Determine if this is a section (nested content) or a leaf control
                const isSection = isNestedContent(item.content);

                if (isSection) {
                    // Render section with label and nested items
                    return (
                        <div key={index} className="space-y-2">
                            {item.label && (
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-3 pt-2">
                                    {item.label}
                                </h3>
                            )}
                            <CustomUIRenderer
                                items={item.content as CustomUIMenuItem[]}
                                values={values}
                                onValueChange={onValueChange}
                                onButtonClick={onButtonClick}
                            />
                        </div>
                    );
                }

                // Render leaf control
                return (
                    <CustomUIControl
                        key={index}
                        item={item}
                        values={values}
                        onValueChange={onValueChange}
                        onButtonClick={onButtonClick}
                    />
                );
            })}
        </div>
    );
};

/**
 * Check if content is an array of nested menu items (vs a value reference array)
 */
function isNestedContent(content: CustomUIMenuItem['content']): content is CustomUIMenuItem[] {
    if (!Array.isArray(content) || content.length === 0) {
        return false;
    }
    // Value reference arrays have a string as first element (the key)
    // Nested content arrays have objects as elements
    return typeof content[0] === 'object' && content[0] !== null;
}
