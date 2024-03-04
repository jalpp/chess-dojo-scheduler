import { Move } from '@jackstenglein/chess';
import { useCallback, useEffect, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import {
    BoardKeyBindingsKey,
    defaultKeyBindings,
    keyboardShortcutHandlers,
    matchAction,
    modifierKeys,
    ShortcutAction,
} from './boardTools/underboard/settings/KeyboardShortcuts';
import {
    VariationBehavior,
    VariationBehaviorKey,
} from './boardTools/underboard/settings/ViewerSettings';
import { BlockBoardKeyboardShortcuts, useChess } from './PgnBoard';
import VariationDialog from './VariationDialog';

const KeyboardHandler = () => {
    const { chess, board, keydownMap, toggleOrientation } = useChess();
    const [variationBehavior] = useLocalStorage(
        VariationBehaviorKey,
        VariationBehavior.None,
    );
    const [variationDialogMove, setVariationDialogMove] = useState<Move | null>(null);
    const [keyBindings] = useLocalStorage(BoardKeyBindingsKey, defaultKeyBindings);

    const onKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (!chess || !board) {
                return;
            }

            const activeElement = document.activeElement;
            if (
                activeElement?.tagName === 'INPUT' ||
                activeElement?.id === BlockBoardKeyboardShortcuts ||
                activeElement?.classList.contains(BlockBoardKeyboardShortcuts)
            ) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            if (modifierKeys.includes(event.key) && keydownMap) {
                keydownMap.current[event.key] = true;
            }

            const matchedAction = matchAction(
                keyBindings,
                event.key,
                keydownMap?.current || {},
            );
            if (matchedAction) {
                keyboardShortcutHandlers[matchedAction]?.(chess, board, {
                    setVariationDialogMove:
                        variationBehavior === VariationBehavior.Dialog
                            ? setVariationDialogMove
                            : undefined,
                });

                if (matchedAction === ShortcutAction.ToggleOrientation) {
                    toggleOrientation?.();
                }
            }
        },
        [
            board,
            chess,
            keyBindings,
            keydownMap,
            toggleOrientation,
            variationBehavior,
            setVariationDialogMove,
        ],
    );

    const onKeyUp = useCallback(
        (event: KeyboardEvent) => {
            if (modifierKeys.includes(event.key) && keydownMap) {
                keydownMap.current[event.key] = false;
            }
        },
        [keydownMap],
    );

    useEffect(() => {
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
        };
    }, [onKeyDown, onKeyUp]);

    if (!variationDialogMove) {
        return null;
    }

    return (
        <VariationDialog move={variationDialogMove} setMove={setVariationDialogMove} />
    );
};

export default KeyboardHandler;
