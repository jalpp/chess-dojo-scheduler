'use client';

import Board, { BoardApi, PrimitiveMove, toColor, toDests } from '@/board/Board';
import { ChessContext } from '@/board/pgn/PgnBoard';
import { Chess } from '@jackstenglein/chess';
import { SmartToy } from '@mui/icons-material';
import { Box, CircularProgress, Stack, Tooltip, Typography } from '@mui/material';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MaiaRating } from './maiaengine';
import { UsePlayBotGameResult } from './playbot';

interface PlayBotBoardProps {
    game: UsePlayBotGameResult;
    /** When true, board is rendered but pieces are not movable (setup preview) */
    previewOnly?: boolean;
}

export function PlayBotBoard({ game, previewOnly = false }: PlayBotBoardProps) {
    const { chess, playerColor, playerToMove, botThinking, result, moves, onPlayerMove } = game;

    const [boardApi, setBoardApi] = useState<BoardApi | undefined>();
    const boardApiRef = useRef<BoardApi | undefined>(undefined);
    boardApiRef.current = boardApi;

    const orientation = playerColor === 'white' ? 'white' : 'black';

    const onMove = useCallback(
        (_board: BoardApi, _chess: Chess, primitive: PrimitiveMove) => {
            if (previewOnly) return;
            onPlayerMove(primitive.orig, primitive.dest, primitive.promotion);
        },
        [onPlayerMove, previewOnly],
    );

    const onInitialize = useCallback(
        (board: BoardApi, _chess: Chess, _boardRef: React.RefObject<HTMLDivElement | null>) => {
            setBoardApi(board);
            board.set({ orientation });
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    useEffect(() => {
        const board = boardApiRef.current;
        if (!board) return;

        const isPlayerTurn = !previewOnly && playerToMove && result === null;
        const lastMove = moves.length > 0 ? moves[moves.length - 1] : null;

        board.set({
            fen: chess.fen(),
            orientation,
            turnColor: toColor(chess),
            lastMove: lastMove
                ? [lastMove.uci.slice(0, 2) as never, lastMove.uci.slice(2, 4) as never]
                : [],
            movable: {
                free: false,
                color: isPlayerTurn ? toColor(chess) : undefined,
                dests: isPlayerTurn ? toDests(chess) : new Map(),
            },
            premovable: { enabled: false },
        });
    }, [chess, moves, playerToMove, result, orientation, previewOnly]);

    useEffect(() => {
        const board = boardApiRef.current;
        if (board && board.state.orientation !== orientation) {
            board.set({ orientation });
        }
    }, [orientation]);

    return (
        <ChessContext.Provider value={{ chess, board: boardApi }}>
            {/* width/height 100% so Chessground fills the Paper container */}
            <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
                <Board onInitialize={onInitialize} onMove={onMove} />

                {/* Bot thinking overlay */}
                {botThinking && !previewOnly && (
                    <Box
                        sx={{
                            position: 'absolute',
                            bottom: 10,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 10,
                            bgcolor: 'background.paper',
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 2,
                            px: 1.5,
                            py: 0.75,
                            boxShadow: 3,
                            pointerEvents: 'none',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        <Stack direction='row' alignItems='center' spacing={1}>
                            <CircularProgress size={14} thickness={5} />
                            <Typography variant='caption' color='text.secondary'>
                                Maia is thinking…
                            </Typography>
                        </Stack>
                    </Box>
                )}

                {/* Preview overlay */}
                {previewOnly && (
                    <Box
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            bgcolor: 'rgba(0,0,0,0.35)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'none',
                            zIndex: 5,
                        }}
                    >
                        <Typography
                            variant='caption'
                            sx={{
                                bgcolor: 'background.paper',
                                px: 1.5,
                                py: 0.5,
                                borderRadius: 1,
                                opacity: 0.85,
                                color: 'text.secondary',
                            }}
                        >
                            Configure game settings →
                        </Typography>
                    </Box>
                )}
            </Box>
        </ChessContext.Provider>
    );
}

interface PlayerHeaderProps {
    label: string;
    rating: MaiaRating | null;
    isBot: boolean;
    isActive: boolean;
    isSetup?: boolean;
}

export function PlayerHeader({ label, rating, isBot, isActive, isSetup }: PlayerHeaderProps) {
    return (
        <Stack direction='row' alignItems='center' spacing={0.75} px={0.5} minHeight={26}>
            {isBot && (
                <Tooltip title='Maia chess engine'>
                    <SmartToy sx={{ fontSize: 16, color: 'primary.main' }} />
                </Tooltip>
            )}
            <Typography
                variant='body2'
                fontWeight={isActive ? 700 : 400}
                color={isSetup ? 'text.disabled' : isActive ? 'text.primary' : 'text.secondary'}
                noWrap
            >
                {label}
                {rating !== null && (
                    <Typography component='span' variant='caption' color='text.secondary' ml={0.5}>
                        ({rating})
                    </Typography>
                )}
            </Typography>
            {isActive && (
                <Box
                    sx={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        bgcolor: 'success.main',
                        flexShrink: 0,
                        '@keyframes maiaBlip': {
                            '0%, 100%': { opacity: 1 },
                            '50%': { opacity: 0.3 },
                        },
                        animation: 'maiaBlip 1.4s ease-in-out infinite',
                    }}
                />
            )}
        </Stack>
    );
}
