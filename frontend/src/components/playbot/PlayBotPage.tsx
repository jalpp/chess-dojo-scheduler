'use client';

/**
 * PlayBotPage
 *
 * Uses PgnBoard directly — identical layout to /games/analysis.
 * PgnBoard renders only when `pgn` or `fen` is provided; we always
 * pass `fen` so it never shows the infinite loading spinner.
 *
 * Left underboard tab  → Setup (before game) or Game Controls (during game)
 * Center               → Chessboard (auto-sized by PgnBoard)
 * Right (pgn text)     → Move list
 * Below move list      → Status / thinking indicator
 */

import PgnBoard, { PgnBoardApi } from '@/board/pgn/PgnBoard';
import { BoardApi, PrimitiveMove, reconcile } from '@/board/Board';
import { CustomUnderboardTab } from '@/board/pgn/boardTools/underboard/underboardTabs';
import { Chess, FEN } from '@jackstenglein/chess';
import { SmartToy } from '@mui/icons-material';
import { Box, Chip, Typography } from '@mui/material';
import { useCallback, useRef, useState } from 'react';
import { MaiaRating } from "./maiaengine";
import { MaiaDownloadModal } from './MaiaDownloadModal';
import { PlayBotStartOpts, PlayBotSetup } from './PlayBotSetup';
import { PlayBotControls } from './PlayBotControls';
import { PlayBotAfterPgn } from './PlayBotAfterPgn';
import { useMaiaEngine } from './useMaiaEngine';
import { useMaiaGame } from './useMaiaGame';

type PageView = 'setup' | 'playing';

export function PlayBotPage() {
    const engine = useMaiaEngine();
    const maiaGame = useMaiaGame(engine);

    const [view, setView] = useState<PageView>('setup');
    const [activeRating, setActiveRating] = useState<MaiaRating>(1500);

    // PgnBoard requires `fen` or `pgn` to render — always provide at least FEN.start.
    // We also bump `initKey` to force a full remount when a new game starts.
    const [boardFen, setBoardFen] = useState<string>(FEN.start);
    const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');
    const [initKey, setInitKey] = useState(0);

    const pgnBoardRef = useRef<PgnBoardApi>(null);

    const modelLoading =
        engine.status === 'idle' ||
        engine.status === 'loading' ||
        engine.status === 'no-cache' ||
        engine.status === 'downloading';

    // ------------------------------------------------------------------
    // onInitialize: PgnBoard fires this when chess+board are ready
    // ------------------------------------------------------------------
    const onInitialize = useCallback(
        (board: BoardApi, chess: Chess) => {
            maiaGame.onBoardInit(board, chess);
        },
        [maiaGame],
    );

    // ------------------------------------------------------------------
    // slotProps.board.onMove: intercepts player moves during a game.
    // We replace defaultOnMove entirely, so we must call chess.move +
    // reconcile ourselves before notifying the game hook.
    // ------------------------------------------------------------------
    const onMove = useCallback(
        (board: BoardApi, chess: Chess, primitive: PrimitiveMove) => {
            if (view !== 'playing') return;
            if (!maiaGame.playerToMove) return;
            if (maiaGame.result !== null) return;

            const uci = primitive.orig + primitive.dest + (primitive.promotion ?? '');
            const moved = chess.move(uci);
            if (!moved) return;
            reconcile(chess, board);
            maiaGame.onPlayerMoved(uci);
        },
        [view, maiaGame],
    );

    // ------------------------------------------------------------------
    // Start a new game
    // ------------------------------------------------------------------
    const handleStart = useCallback(
        (opts: PlayBotStartOpts) => {
            const fen = opts.startFen || FEN.start;
            setActiveRating(opts.maiaRating);
            setBoardFen(fen);
            setBoardOrientation(opts.playerColor);
            maiaGame.startGame(opts);
            setView('playing');
            // Bump key: remounts PgnBoard with new fen + orientation.
            // This also fires onInitialize again, giving useMaiaGame fresh refs.
            setInitKey((k) => k + 1);
        },
        [maiaGame],
    );

    const handleNewGame = useCallback(() => {
        setView('setup');
        setBoardFen(FEN.start);
        setBoardOrientation('white');
        setInitKey((k) => k + 1);
    }, []);

    // ------------------------------------------------------------------
    // Custom underboard tab — switches between setup and game controls
    // ------------------------------------------------------------------
    const controlsTab: CustomUnderboardTab = {
        name: view === 'setup' ? 'Setup' : 'Game',
        tooltip: view === 'setup' ? 'Game Setup' : 'Game Controls',
        icon: <SmartToy fontSize='small' />,
        element:
            view === 'setup' ? (
                <Box sx={{ p: 1.5, overflowY: 'auto', height: '100%' }}>
                    <PlayBotSetup onStart={handleStart} initialRating={activeRating} />
                </Box>
            ) : (
                <PlayBotControls
                    game={maiaGame}
                    maiaRating={activeRating}
                    onNewGame={handleNewGame}
                />
            ),
    };

    return (
        <Box sx={{ pt: { xs: 1, sm: 2 } }}>
            <MaiaDownloadModal
                open={modelLoading}
                status={engine.status}
                progress={engine.progress}
                error={engine.error}
                onDownload={engine.downloadModel}
            />

            {/* Page title — compact, matches analysis/tests style */}
            <Box
                sx={{
                    px: { xs: 1, sm: 3 },
                    pb: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                }}
            >
                <SmartToy color='primary' />
                <Typography variant='h6' fontWeight='bold'>
                    Play vs Maia
                </Typography>
                {view === 'playing' && (
                    <Chip
                        label={`Maia ${activeRating}`}
                        size='small'
                        color='primary'
                        variant='outlined'
                    />
                )}
            </Box>

            {/*
             * PgnBoard — identical layout engine to /games/analysis.
             *
             * IMPORTANT: `fen` must always be a non-empty string.
             * PgnBoard shows a LoadingPage spinner when neither `pgn`
             * nor `fen` is provided. We always pass at least FEN.start.
             *
             * `key={initKey}` fully remounts PgnBoard on each new game,
             * ensuring a fresh Chess instance and firing onInitialize.
             *
             * `disableEngine` prevents the Stockfish panel from loading
             * (we're using Maia, not Stockfish).
             *
             * `disableNullMoves` keeps the tree clean during play.
             */}
            <PgnBoard
                ref={pgnBoardRef}
                key={initKey}
                fen={boardFen}
                startOrientation={boardOrientation}
                underboardTabs={[controlsTab]}
                initialUnderboardTab={controlsTab.name}
                showPlayerHeaders={false}
                disableEngine
                disableNullMoves
                initKey={String(initKey)}
                slotProps={{
                    board: {
                        onMove: view === 'playing' ? onMove : undefined,
                    },
                }}
                slots={{
                    afterPgnText: (
                        <PlayBotAfterPgn
                            game={maiaGame}
                            view={view}
                            maiaRating={activeRating}
                        />
                    ),
                }}
                onInitialize={onInitialize}
            />
        </Box>
    );
}