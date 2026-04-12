'use client';

import { BoardApi, PrimitiveMove, reconcile } from '@/board/Board';
import { CustomUnderboardTab } from '@/board/pgn/boardTools/underboard/underboardTabs';
import PgnBoard, { PgnBoardApi } from '@/board/pgn/PgnBoard';
import { useNextSearchParams } from '@/hooks/useNextSearchParams';
import { Chess, FEN } from '@jackstenglein/chess';
import { SmartToy } from '@mui/icons-material';
import { Box } from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MaiaDownloadModal } from './MaiaDownloadModal';
import { MaiaRating } from './maiaengine';
import { PlayBotAfterPgn } from './PlayBotAfterPgn';
import { PlayBotControls } from './PlayBotControls';
import { PlayBotSetup, PlayBotStartOpts, TimeControl } from './PlayBotSetup';
import { useMaiaEngine } from './useMaiaEngine';
import { useMaiaGame } from './useMaiaGame';

type PageView = 'setup' | 'playing';

/** Parse query params from /play-bot?fen=...&mins=...&inc=...&color=... */
function parseQueryOpts(searchParams: URLSearchParams): PlayBotStartOpts | null {
    const fen = searchParams.get('fen');
    if (!fen) return null;

    const minsStr = searchParams.get('mins');
    const incStr = searchParams.get('inc');
    const colorStr = searchParams.get('color');

    const mins = parseFloat(minsStr ?? '0') || 0;
    const inc = parseFloat(incStr ?? '0') || 0;

    const timeControl: TimeControl = {
        initialMs: mins === 0 && inc === 0 ? null : mins * 60 * 1000,
        incrementMs: inc * 1000,
    };

    const playerColor: 'white' | 'black' = colorStr === 'black' ? 'black' : 'white';

    const ratingStr = searchParams.get('rating');
    const ratingNum = parseInt(ratingStr ?? '1500');
    const validRatings: MaiaRating[] = [1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900];
    const maiaRating: MaiaRating = (
        validRatings.includes(ratingNum as MaiaRating) ? ratingNum : 1500
    ) as MaiaRating;

    return {
        playerColor,
        maiaRating,
        startFen: fen.trim(),
        timeControl,
    };
}

export function PlayBotPage() {
    const engine = useMaiaEngine();
    const maiaGame = useMaiaGame(engine);
    const { searchParams } = useNextSearchParams();

    const [view, setView] = useState<PageView>('setup');
    const [activeRating, setActiveRating] = useState<MaiaRating>(1500);
    const [boardFen, setBoardFen] = useState<string>(FEN.start);
    const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');
    const [initKey, setInitKey] = useState(0);

    const pgnBoardRef = useRef<PgnBoardApi>(null);
    // Track whether we've already consumed the query params auto-start
    const autoStartedRef = useRef(false);

    const modelLoading =
        engine.status === 'idle' ||
        engine.status === 'loading' ||
        engine.status === 'no-cache' ||
        engine.status === 'downloading';

    useEffect(() => {
        if (autoStartedRef.current) return;
        if (engine.status !== 'ready') return;

        const opts = parseQueryOpts(searchParams);
        if (!opts) return;

        autoStartedRef.current = true;
        setActiveRating(opts.maiaRating);
        setBoardFen(opts.startFen);
        setBoardOrientation(opts.playerColor);
        maiaGame.startGame(opts);
        setView('playing');
        setInitKey((k) => k + 1);
    }, [engine.status, searchParams, maiaGame]);

    const onInitialize = useCallback(
        (board: BoardApi, chess: Chess) => {
            maiaGame.onBoardInit(board, chess);
        },
        [maiaGame],
    );

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

    const handleStart = useCallback(
        (opts: PlayBotStartOpts) => {
            const fen = opts.startFen || FEN.start;
            setActiveRating(opts.maiaRating);
            setBoardFen(fen);
            setBoardOrientation(opts.playerColor);
            maiaGame.startGame(opts);
            setView('playing');
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

            <Box
                sx={{
                    px: { xs: 1, sm: 3 },
                    pb: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                }}
            ></Box>

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
                        <PlayBotAfterPgn game={maiaGame} view={view} maiaRating={activeRating} />
                    ),
                }}
                onInitialize={onInitialize}
            />
        </Box>
    );
}
