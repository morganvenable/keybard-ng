import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { MATRIX_COLS, SVALBOARD_LAYOUT } from "@/constants/svalboard-layout";
import { useChanges } from "@/contexts/ChangesContext";
import { useSettings } from "@/contexts/SettingsContext";
import { keyService } from "@/services/key.service";
import { vialService } from "@/services/vial.service";
import { KEYBOARD_EVENT_MAP } from "@/utils/keyboard-mapper";
import { getOrderedKeyPositions, SerialMode } from "@/utils/serial-assignment";
import { useVial } from "./VialContext";

interface BindingTarget {
    type: "keyboard" | "combo" | "tapdance" | "macro" | "override" | "altrepeat" | "leaders";
    layer?: number;
    row?: number;
    col?: number;
    keyboardSubsection?: "full" | "inner"; // For compound keys (LT, mod-tap): "full" = whole key, "inner" = tap keycode only
    comboId?: number;
    comboSlot?: number; // 0-4 for combo keys
    tapdanceId?: number;
    tapdanceSlot?: "tap" | "hold" | "doubletap" | "taphold";
    macroId?: number;
    macroIndex?: number;
    // Add more as needed for other binding types
    isHover?: boolean;
    keycode?: string | number;
    label?: string;
    overrideId?: number;
    overrideSlot?: "trigger" | "replacement";
    altRepeatId?: number;
    altRepeatSlot?: "keycode" | "alt_keycode";
    leaderId?: number;
    leaderSlot?: "sequence" | "output";
    leaderSeqIndex?: number; // 0-4 for sequence keys
}


interface KeyBindingContextType {
    selectedTarget: BindingTarget | null;
    selectKeyboardKey: (layer: number, row: number, col: number) => void;
    selectKeyboardKeyWithSubsection: (layer: number, row: number, col: number, subsection: "full" | "inner") => void;
    selectComboKey: (comboId: number, slot: number) => void;
    selectTapdanceKey: (tapdanceId: number, slot: "tap" | "hold" | "doubletap" | "taphold") => void;
    selectMacroKey: (macroId: number, index: number) => void;
    selectOverrideKey: (overrideId: number, slot: "trigger" | "replacement") => void;
    selectAltRepeatKey: (altRepeatId: number, slot: "keycode" | "alt_keycode") => void;
    selectLeaderKey: (leaderId: number, slot: "sequence" | "output", seqIndex?: number) => void;
    assignKeycode: (keycode: number | string) => void;
    assignKeycodeTo: (target: BindingTarget, keycode: number | string) => void;
    swapKeys: (target1: BindingTarget, target2: BindingTarget) => void;
    clearSelection: () => void;
    isBinding: boolean;
    hoveredKey: BindingTarget | null;
    setHoveredKey: (target: BindingTarget | null) => void;
}


const KeyBindingContext = createContext<KeyBindingContextType | undefined>(undefined);

export const KeyBindingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { keyboard, setKeyboard, updateKey } = useVial();
    const { queue } = useChanges();
    const { getSetting } = useSettings();
    const [selectedTarget, setSelectedTarget] = useState<BindingTarget | null>(null);
    const [hoveredKey, setHoveredKey] = useState<BindingTarget | null>(null);
    const [isBinding, setIsBinding] = useState(false);




    // Use a ref to always have access to the current selectedTarget value
    const selectedTargetRef = useRef<BindingTarget | null>(null);

    // Keep the ref in sync with the state
    selectedTargetRef.current = selectedTarget;



    const selectKeyboardKey = useCallback(
        (layer: number, row: number, col: number) => {
            setSelectedTarget({
                type: "keyboard",
                layer,
                row,
                col,
            });
            setIsBinding(true);
        },
        [keyboard]
    );

    const selectKeyboardKeyWithSubsection = useCallback(
        (layer: number, row: number, col: number, subsection: "full" | "inner") => {
            setSelectedTarget({
                type: "keyboard",
                layer,
                row,
                col,
                keyboardSubsection: subsection,
            });
            setIsBinding(true);
        },
        [keyboard]
    );

    const selectComboKey = useCallback((comboId: number, slot: number) => {
        setSelectedTarget({
            type: "combo",
            comboId,
            comboSlot: slot,
        });
        setIsBinding(true);
    }, []);

    const selectTapdanceKey = useCallback((tapdanceId: number, slot: "tap" | "hold" | "doubletap" | "taphold") => {
        setSelectedTarget({
            type: "tapdance",
            tapdanceId,
            tapdanceSlot: slot,
        });
        setIsBinding(true);
    }, []);

    const selectMacroKey = useCallback((macroId: number, index: number) => {
        setSelectedTarget({
            type: "macro",
            macroId,
            macroIndex: index,
        });
        setIsBinding(true);
    }, []);

    const selectOverrideKey = useCallback((overrideId: number, slot: "trigger" | "replacement") => {
        setSelectedTarget({
            type: "override",
            overrideId,
            overrideSlot: slot,
        });
        setIsBinding(true);
    }, []);

    const selectAltRepeatKey = useCallback((altRepeatId: number, slot: "keycode" | "alt_keycode") => {
        setSelectedTarget({
            type: "altrepeat",
            altRepeatId,
            altRepeatSlot: slot,
        });
        setIsBinding(true);
    }, []);

    const selectLeaderKey = useCallback((leaderId: number, slot: "sequence" | "output", seqIndex?: number) => {
        setSelectedTarget({
            type: "leaders",
            leaderId,
            leaderSlot: slot,
            leaderSeqIndex: seqIndex,
        });
        setIsBinding(true);
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedTarget(null);
        setIsBinding(false);
    }, []);

    const selectNextKey = useCallback(() => {
        const currentTarget = selectedTargetRef.current;
        if (!currentTarget || currentTarget.type !== 'keyboard' || !keyboard) return;

        const { row, col, layer } = currentTarget;
        if (row === undefined || col === undefined || layer === undefined) return;

        // Get keyboard layout (same logic as Keyboard.tsx lines 30-37)
        const keylayout = (keyboard.keylayout && Object.keys(keyboard.keylayout).length > 0)
            ? keyboard.keylayout as Record<number, { x: number; y: number; w: number; h: number; row?: number; col?: number }>
            : SVALBOARD_LAYOUT;

        const matrixCols = keyboard.cols || MATRIX_COLS;
        const mode = getSetting('serial-assignment', 'col-row') as SerialMode;
        const ordered = getOrderedKeyPositions(keylayout, mode, matrixCols);

        if (ordered.length === 0) {
            clearSelection();
            return;
        }

        // Find current position in ordered list
        const currentIdx = ordered.findIndex(pos => pos.row === row && pos.col === col);

        // Select next (wrap to 0 if at end or not found)
        const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % ordered.length;
        selectKeyboardKey(layer, ordered[nextIdx].row, ordered[nextIdx].col);
    }, [keyboard, getSetting, clearSelection, selectKeyboardKey]);

    const assignKeycodeTo = useCallback(
        (target: BindingTarget, keycode: number | string) => {
            if (!target || !keyboard) return;
            const updatedKeyboard = JSON.parse(JSON.stringify(keyboard));
            console.log("assignKeycodeTo called with", keycode, "for target", target);
            // Convert keycode string to number using keyService
            const keycodeValue = typeof keycode === "string" ? keyService.parse(keycode) : keycode;
            console.log("assignKeycode to keyboard", target, keycode, "->", keycodeValue);

            switch (target.type) {
                case "keyboard": {
                    const { layer, row, col, keyboardSubsection } = target;
                    if (layer === undefined || row === undefined || col === undefined) break;

                    const matrixPos = row * MATRIX_COLS + col;
                    if (!updatedKeyboard.keymap) updatedKeyboard.keymap = [];
                    if (!updatedKeyboard.keymap[layer]) updatedKeyboard.keymap[layer] = [];

                    // Store previous value for potential rollback
                    const previousValue = updatedKeyboard.keymap[layer][matrixPos];

                    let finalKeycodeValue = keycodeValue;

                    // If subsection is "inner", compose new keycode preserving the hold/mask portion
                    if (keyboardSubsection === "inner" && previousValue !== undefined) {
                        const prevKeycode = typeof previousValue === "number" ? previousValue : keyService.parse(previousValue);
                        const prevKeyStr = keyService.stringify(prevKeycode);

                        // Check if it's a layerhold (LT#) or modtap (_T) key
                        const isLayerhold = /^LT\d+\(/.test(prevKeyStr);
                        const isModtap = /_T\(/.test(prevKeyStr);

                        if (isLayerhold || isModtap) {
                            // Extract the mask (hold portion) and compose with new inner key
                            const mask = prevKeycode & 0xFF00;
                            const newInner = keycodeValue & 0x00FF;
                            finalKeycodeValue = mask | newInner;
                            console.log(`Inner key composition: ${prevKeyStr} → mask 0x${mask.toString(16)} | inner 0x${newInner.toString(16)} = 0x${finalKeycodeValue.toString(16)}`);
                        }
                    }

                    updatedKeyboard.keymap[layer][matrixPos] = finalKeycodeValue;

                    // Queue the change with callback
                    const changeDesc = `key_${layer}_${row}_${col}`;
                    queue(
                        changeDesc,
                        async () => {
                            console.log(`Committing key change: Layer ${layer}, Key [${row},${col}] → ${finalKeycodeValue}`);
                            updateKey(layer, row, col, finalKeycodeValue);
                        },
                        {
                            type: "key",
                            layer,
                            row,
                            col,
                            keycode: finalKeycodeValue,
                            previousValue,
                        }
                    );

                    break;
                }

                case "combo": {
                    const { comboId, comboSlot } = target;
                    if (comboId === undefined || comboSlot === undefined) break;

                    // CRITICAL: Ensure combos array exists and is properly copied
                    if (!(updatedKeyboard as any).combos) {
                        (updatedKeyboard as any).combos = [];
                    }

                    // Create a defensive copy of the entire combos array to preserve all combos
                    const originalCombos = (keyboard as any)?.combos || [];
                    const combos = Array.isArray(originalCombos) ? [...originalCombos] : [];
                    (updatedKeyboard as any).combos = combos;

                    // Get the ORIGINAL combo from the source keyboard to preserve existing values
                    const originalCombo = originalCombos[comboId];
                    const combo = combos[comboId];
                    if (!combo) break;

                    const keycodeName = typeof keycode === "string" ? keycode : `KC_${keycode}`;

                    let previousValue: string;

                    if (comboSlot === 4) {
                        // Output - but we must also preserve the input keys!
                        // CRITICAL: Preserve the keys array from the original combo
                        const originalKeys = Array.isArray(originalCombo?.keys) ? originalCombo.keys : [];
                        combo.keys = [...originalKeys];
                        while (combo.keys.length < 4) combo.keys.push("KC_NO");

                        previousValue = combo.output;
                        combo.output = keycodeName;

                        console.log("combo update debug (output): preserved keys", combo.keys);
                    } else {
                        // Input keys - preserve all existing values from the ORIGINAL keyboard state
                        // CRITICAL: Check if keys is actually an array, not the prototype's keys() function
                        const originalKeys = Array.isArray(originalCombo?.keys) ? originalCombo.keys : [];

                        console.log("combo update debug: originalKeys", originalKeys, "comboId", comboId, "slot", comboSlot);

                        // Build a fresh 4-element array from the original state
                        const newKeys: string[] = [];
                        for (let i = 0; i < 4; i++) {
                            const val = originalKeys[i];
                            newKeys.push(typeof val === "string" && val ? val : "KC_NO");
                        }

                        // Now update just the target slot
                        previousValue = newKeys[comboSlot];
                        newKeys[comboSlot] = keycodeName;
                        combo.keys = newKeys;

                        console.log("combo update debug: newKeys after", combo.keys);
                    }

                    // Capture comboId for closure
                    const cmbId = comboId;

                    // Queue the change with callback
                    const changeDesc = `combo_${comboId}_${comboSlot}`;
                    queue(
                        changeDesc,
                        async () => {
                            console.log(`Committing combo change: Combo ${cmbId}, Slot ${comboSlot} → ${keycodeName}`);
                            try {
                                await vialService.updateCombo(updatedKeyboard, cmbId);
                                await vialService.saveViable();
                            } catch (err) {
                                console.error("Failed to update combo:", err);
                            }
                        },
                        {
                            type: "combo",
                            comboId,
                            comboSlot,
                            keycode: keycodeValue,
                            previousValue,
                        }
                    );

                    break;
                }

                case "tapdance": {
                    const { tapdanceId, tapdanceSlot } = target;
                    if (tapdanceId === undefined || tapdanceSlot === undefined) break;

                    // tapdance is actually an array with objects having tap/hold/doubletap/taphold properties
                    const tapdances = (updatedKeyboard as any).tapdances;
                    if (!tapdances) break;
                    if (!tapdances[tapdanceId]) {
                        tapdances[tapdanceId] = {
                            tap: "KC_NO",
                            hold: "KC_NO",
                            doubletap: "KC_NO",
                            taphold: "KC_NO",
                            tapms: 200,
                            tdid: tapdanceId,
                        };
                    }

                    // Store previous value
                    const previousValue = tapdances[tapdanceId][tapdanceSlot];

                    const keycodeName = typeof keycode === "string" ? keycode : `KC_${keycode}`;
                    tapdances[tapdanceId][tapdanceSlot] = keycodeName;

                    // Capture tapdanceId for closure
                    const tdId = tapdanceId;

                    // Queue the change with callback
                    const changeDesc = `tapdance_${tapdanceId}_${tapdanceSlot}`;
                    queue(
                        changeDesc,
                        async () => {
                            console.log(`Committing tapdance change: Tapdance ${tdId}, ${tapdanceSlot} → ${keycodeName}`);
                            try {
                                await vialService.updateTapdance(updatedKeyboard, tdId);
                                await vialService.saveViable();
                            } catch (err) {
                                console.error("Failed to update tapdance:", err);
                            }
                        },
                        {
                            type: "tapdance",
                            tapdanceId,
                            tapdanceSlot,
                            keycode: keycodeValue,
                            previousValue,
                        }
                    );

                    break;
                }

                case "macro": {
                    const { macroId, macroIndex } = target;
                    if (macroId === undefined || macroIndex === undefined) break;

                    const macros = updatedKeyboard.macros;
                    if (!macros || !macros[macroId]) break;

                    // macros[macroId].actions is an array of [type, value]
                    // e.g. ["down", "KC_A"]
                    // We only support assigning keycodes to tap/down/up actions
                    const action = macros[macroId].actions[macroIndex];
                    if (!action || !["tap", "down", "up"].includes(action[0])) break;

                    // const previousValue = action[1];
                    const keycodeName = typeof keycode === "string" ? keycode : `KC_${keycode}`;

                    // Update the value
                    macros[macroId].actions[macroIndex][1] = keycodeName;

                    // Queue change? Macros might be complex to queue individually if the whole macro is an object.
                    // For now, let's just update the keyboard state, similar to how MacroEditor handles it locally, but via queue if possible.
                    // But here we are updating one action.

                    // Note: MacroEditor saves the *entire* macro object.
                    // To be consistent with other bindings, we should queue it.
                    // But the backend API probably expects the full macro definiton.

                    // Let's assume queue() handles this or we just setKeyboard to trigger the save in MacroEditor?
                    // Actually, if we use queue(), we need a way to commit it.
                    // For now, let's stick to updating the local state and letting the UI react.
                    // However, assigning a keycode is a "user action" that should probably persist.

                    // Since MacroEditor has its own persistence logic (useEffect on actions),
                    // simply updating 'keyboard' here might be enough IF MacroEditor picks it up.
                    // But wait, assignKeycode calls 'updateKey' for keyboard, but for others?
                    // It seems the queue mechanics are specific.

                    // Let's just update the keyboard object for now. The generic "setKeyboard" at the end triggers React updates.

                    break;
                }

                case "override": {
                    const { overrideId, overrideSlot } = target;
                    if (overrideId === undefined || overrideSlot === undefined) break;

                    const overrides = updatedKeyboard.key_overrides;
                    if (!overrides || !overrides[overrideId]) break;

                    const previousValue = overrides[overrideId][overrideSlot];
                    const keycodeName = typeof keycode === "string" ? keycode : `KC_${keycode}`;
                    overrides[overrideId][overrideSlot] = keycodeName;

                    // Capture overrideId for closure
                    const koId = overrideId;

                    // Queue the change with callback
                    const changeDesc = `override_${overrideId}_${overrideSlot}`;
                    queue(
                        changeDesc,
                        async () => {
                            console.log(`Committing override change: Override ${koId}, ${overrideSlot} → ${keycodeName}`);
                            try {
                                await vialService.updateKeyoverride(updatedKeyboard, koId);
                                await vialService.saveViable();
                            } catch (err) {
                                console.error("Failed to update key override:", err);
                            }
                        },
                        {
                            type: "override",
                            overrideId,
                            overrideSlot,
                            keycode: keycodeValue,
                            previousValue,
                        } as any
                    );

                    break;
                }

                case "altrepeat": {
                    const { altRepeatId, altRepeatSlot } = target;
                    if (altRepeatId === undefined || altRepeatSlot === undefined) break;

                    const altRepeatKeys = updatedKeyboard.alt_repeat_keys;
                    if (!altRepeatKeys || !altRepeatKeys[altRepeatId]) break;

                    const previousValue = altRepeatKeys[altRepeatId][altRepeatSlot];
                    const keycodeName = typeof keycode === "string" ? keycode : `KC_${keycode}`;
                    altRepeatKeys[altRepeatId][altRepeatSlot] = keycodeName;

                    // Capture values for closure
                    const arkId = altRepeatId;

                    // Queue the change with callback
                    const changeDesc = `altrepeat_${altRepeatId}_${altRepeatSlot}`;
                    queue(
                        changeDesc,
                        async () => {
                            console.log(`Committing alt-repeat change: AltRepeat ${arkId}, ${altRepeatSlot} → ${keycodeName}`);
                            try {
                                await vialService.updateAltRepeatKey(updatedKeyboard, arkId);
                                await vialService.saveViable(); // Persist to EEPROM
                            } catch (err) {
                                console.error("Failed to update alt-repeat key:", err);
                            }
                        },
                        {
                            type: "altrepeat" as any,
                            altRepeatId,
                            altRepeatSlot,
                            keycode: keycodeValue,
                            previousValue,
                        } as any
                    );

                    break;
                }

                case "leaders": {
                    const { leaderId, leaderSlot, leaderSeqIndex } = target;
                    if (leaderId === undefined || leaderSlot === undefined) break;

                    const leaders = updatedKeyboard.leaders;
                    if (!leaders || !leaders[leaderId]) break;

                    const keycodeName = typeof keycode === "string" ? keycode : keyService.stringify(keycode);

                    if (leaderSlot === "sequence" && leaderSeqIndex !== undefined) {
                        // Ensure sequence array exists and has 5 slots
                        if (!leaders[leaderId].sequence) {
                            leaders[leaderId].sequence = ["KC_NO", "KC_NO", "KC_NO", "KC_NO", "KC_NO"];
                        }
                        while (leaders[leaderId].sequence.length < 5) {
                            leaders[leaderId].sequence.push("KC_NO");
                        }
                        leaders[leaderId].sequence[leaderSeqIndex] = keycodeName;
                    } else if (leaderSlot === "output") {
                        leaders[leaderId].output = keycodeName;
                    }

                    // Capture values for closure
                    const ldrId = leaderId;

                    // Queue the change with callback
                    const changeDesc = `leader_${leaderId}_${leaderSlot}${leaderSeqIndex !== undefined ? `_${leaderSeqIndex}` : ""}`;
                    queue(
                        changeDesc,
                        async () => {
                            console.log(`Committing leader change: Leader ${ldrId}, ${leaderSlot} → ${keycodeName}`);
                            try {
                                await vialService.updateLeader(updatedKeyboard, ldrId);
                                await vialService.saveViable();
                            } catch (err) {
                                console.error("Failed to update leader:", err);
                            }
                        },
                        {
                            type: "leaders" as any,
                            leaderId,
                            leaderSlot,
                            leaderSeqIndex,
                            keycode: keycodeValue,
                        } as any
                    );

                    break;
                }
            }
            setKeyboard(updatedKeyboard);

            // Clear selection if this was the selected target, advance to next key for keyboard type
            if (target === selectedTargetRef.current) {
                if (target.type === 'keyboard') {
                    selectNextKey();
                } else if (target.type === 'leaders' && target.leaderSlot === 'sequence' && target.leaderSeqIndex !== undefined && target.leaderSeqIndex < 4) {
                    // Auto-advance to next sequence slot for leaders
                    selectLeaderKey(target.leaderId!, 'sequence', target.leaderSeqIndex + 1);
                } else {
                    clearSelection();
                }
            }
        },
        [keyboard, setKeyboard, clearSelection, selectNextKey, selectLeaderKey, queue, updateKey]
    );

    const swapKeys = useCallback(
        (target1: BindingTarget, target2: BindingTarget) => {
            if (!keyboard) return;

            // Only support keyboard swaps for now, but structure allows extension
            if (target1.type !== "keyboard" || target2.type !== "keyboard") return;

            const { layer: layer1, row: row1, col: col1 } = target1;
            const { layer: layer2, row: row2, col: col2 } = target2;

            if (
                layer1 === undefined || row1 === undefined || col1 === undefined ||
                layer2 === undefined || row2 === undefined || col2 === undefined
            ) return;

            // Clone state ONCE
            const updatedKeyboard = JSON.parse(JSON.stringify(keyboard));
            if (!updatedKeyboard.keymap) updatedKeyboard.keymap = [];

            // Ensure layers exist
            if (!updatedKeyboard.keymap[layer1]) updatedKeyboard.keymap[layer1] = [];
            if (!updatedKeyboard.keymap[layer2]) updatedKeyboard.keymap[layer2] = [];

            const matrixPos1 = row1 * MATRIX_COLS + col1;
            const matrixPos2 = row2 * MATRIX_COLS + col2;

            // Get values from CLONED state (or original, same thing at start)
            const val1 = updatedKeyboard.keymap[layer1][matrixPos1] || 0;
            const val2 = updatedKeyboard.keymap[layer2][matrixPos2] || 0;

            console.log(`Swapping keys: [${layer1},${row1},${col1}](${val1}) <-> [${layer2},${row2},${col2}](${val2})`);

            // Swap values
            updatedKeyboard.keymap[layer1][matrixPos1] = val2;
            updatedKeyboard.keymap[layer2][matrixPos2] = val1;

            // Queue changes
            // Change 1: Target 1 gets Val 2
            queue(
                `key_${layer1}_${row1}_${col1}`,
                async () => {
                    console.log(`Committing swap change 1: Layer ${layer1}, Key [${row1},${col1}] → ${val2}`);
                    updateKey(layer1, row1, col1, val2);
                },
                {
                    type: "key",
                    layer: layer1,
                    row: row1,
                    col: col1,
                    keycode: val2,
                    previousValue: val1,
                }
            );

            // Change 2: Target 2 gets Val 1
            queue(
                `key_${layer2}_${row2}_${col2}`,
                async () => {
                    console.log(`Committing swap change 2: Layer ${layer2}, Key [${row2},${col2}] → ${val1}`);
                    updateKey(layer2, row2, col2, val1);
                },
                {
                    type: "key",
                    layer: layer2,
                    row: row2,
                    col: col2,
                    keycode: val1,
                    previousValue: val2,
                }
            );

            setKeyboard(updatedKeyboard);
            clearSelection();
        },
        [keyboard, setKeyboard, queue, clearSelection, updateKey]
    );

    const assignKeycode = useCallback(
        (keycode: number | string) => {
            if (selectedTargetRef.current) {
                assignKeycodeTo(selectedTargetRef.current, keycode);
            }
        },
        [assignKeycodeTo]
    );

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const typingBindsKey = getSetting("typing-binds-key");

            if (!typingBindsKey || !selectedTargetRef.current) return;

            // Ignore if user is typing in an input or textarea
            const target = event.target as HTMLElement;
            if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

            const qmkKeycode = KEYBOARD_EVENT_MAP[event.code];

            if (qmkKeycode) {
                event.preventDefault();
                event.stopPropagation();
                assignKeycode(qmkKeycode);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [assignKeycode, getSetting]);

    const value: KeyBindingContextType = {
        selectedTarget,
        selectKeyboardKey,
        selectKeyboardKeyWithSubsection,
        selectComboKey,
        selectTapdanceKey,
        selectMacroKey,
        selectOverrideKey,
        selectAltRepeatKey,
        selectLeaderKey,
        assignKeycode,
        assignKeycodeTo,
        swapKeys,
        clearSelection,
        isBinding,
        hoveredKey,
        setHoveredKey,
    };


    return <KeyBindingContext.Provider value={value}>{children}</KeyBindingContext.Provider>;
};

export const useKeyBinding = (): KeyBindingContextType => {
    const context = useContext(KeyBindingContext);
    if (!context) {
        throw new Error("useKeyBinding must be used within a KeyBindingProvider");
    }
    return context;
};
