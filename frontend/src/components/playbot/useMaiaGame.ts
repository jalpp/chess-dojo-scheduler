'use client';

/**
 * useMaiaGame
 *
 * Drives Maia bot moves against the PgnBoard's Chess instance.
 *
 * This hook is designed to work WITH PgnBoard (not a standalone Board):
 *   - PgnBoard owns the Chess instance
 *   - onInitialize() gives us the Chess+BoardApi references
 *   - We call chess.move(uci) + reconcile(chess, board) to apply bot moves
 *   - Player moves come in via slotProps.board.onMove (already applied to chess)
 *
 * Game state (result, reason, moves, etc.) is derived by observing the
 * Chess instance via the Observer pattern from @jackstenglein/chess.
 */

import { BoardApi, reconcile } from '@/board/Board';
import { Chess, FEN } from '@jackstenglein/chess';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MaiaRating } from './maiaengine';
import { UseMaiaEngineResult } from './useMaiaEngine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PlayerColor = 'white' | 'black';

export interface MoveRecord {
    san: string;
    uci: string;
    fen: string;
    ms: number;
}

export type GameResult = 'white' | 'black' | 'draw' | null;
export type GameOverReason =
    | 'checkmate' | 'stalemate' | 'insufficient'
    | 'repetition' | 'fifty-move' | 'resign' | null;

export interface StartOpts {
    playerColor: PlayerColor;
    maiaRating: MaiaRating;
    startFen?: string;
}

export interface UseMaiaGameResult {
    // State
    moves: MoveRecord[];
    playerColor: PlayerColor;
    playerToMove: boolean;
    botThinking: boolean;
    result: GameResult;
    reason: GameOverReason;
    maiaRating: MaiaRating;
    maiaWinProb: number | null;
    startFen: string;
    gameActive: boolean;

    // Called by PgnBoard's onInitialize
    onBoardInit: (board: BoardApi, chess: Chess) => void;

    // Called by PgnBoard's slotProps.board.onMove (AFTER chess.move already applied)
    onPlayerMoved: (uci: string) => void;

    // Actions
    startGame: (opts: StartOpts) => void;
    resign: () => void;
}

// ---------------------------------------------------------------------------
// Game-over detection
// ---------------------------------------------------------------------------

function detectTermination(chess: Chess): { result: GameResult; reason: GameOverReason } {
    if (!chess.isGameOver()) return { result: null, reason: null };
    if (chess.isCheckmate()) {
        const loser = chess.turn() === 'w' ? 'white' : 'black';
        return { result: loser === 'white' ? 'black' : 'white', reason: 'checkmate' };
    }
    if (chess.isStalemate()) return { result: 'draw', reason: 'stalemate' };
    if (chess.isInsufficientMaterial()) return { result: 'draw', reason: 'insufficient' };
    if (chess.isThreefoldRepetition()) return { result: 'draw', reason: 'repetition' };
    if (chess.isDraw()) return { result: 'draw', reason: 'fifty-move' };
    return { result: 'draw', reason: null };
}

function botDelay(): number { return 450 + Math.random() * 800; }

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useMaiaGame(engine: UseMaiaEngineResult): UseMaiaGameResult {
    // References to PgnBoard's chess+board (set in onBoardInit)
    const chessRef = useRef<Chess | null>(null);
    const boardRef = useRef<BoardApi | null>(null);

    // Game configuration
    const [playerColor, setPlayerColor] = useState<PlayerColor>('white');
    const [maiaRating, setMaiaRating] = useState<MaiaRating>(1500);
    const [startFen, setStartFen] = useState<string>(FEN.start);
    const [gameActive, setGameActive] = useState(false);

    // Game state
    const [moves, setMoves] = useState<MoveRecord[]>([]);
    const [result, setResult] = useState<GameResult>(null);
    const [reason, setReason] = useState<GameOverReason>(null);
    const [maiaWinProb, setMaiaWinProb] = useState<number | null>(null);
    const [botThinking, setBotThinking] = useState(false);
    const [tick, setTick] = useState(0);

    // Stable refs
    const playerColorRef = useRef(playerColor);
    const resultRef = useRef(result);
    const maiaRatingRef = useRef(maiaRating);
    const gameActiveRef = useRef(gameActive);
    const cancelBotRef = useRef(false);
    const moveStartRef = useRef(Date.now());

    playerColorRef.current = playerColor;
    resultRef.current = result;
    maiaRatingRef.current = maiaRating;
    gameActiveRef.current = gameActive;

    const refresh = useCallback(() => setTick((t) => t + 1), []);

    // Is it the human's turn?
    const chess = chessRef.current;
    const playerToMove =
        gameActive &&
        result === null &&
        !!chess &&
        (chess.turn() === 'w') === (playerColor === 'white');

    // ------------------------------------------------------------------
    // Bot move logic
    // ------------------------------------------------------------------
    const makeBotMove = useCallback(async () => {
        const chess = chessRef.current;
        const board = boardRef.current;
        if (!chess || !board) return;
        if (!gameActiveRef.current) return;
        if (cancelBotRef.current) return;
        if (engine.status !== 'ready') return;
        if (resultRef.current !== null) return;

        setBotThinking(true);
        try {
            const fen = chess.fen();
            const rating = maiaRatingRef.current;
            const evalResult = await engine.evaluate(fen, rating, rating);
            if (cancelBotRef.current) return;

            // win prob: normalise to white's perspective
            const isBlack = fen.split(' ')[1] === 'b';
            setMaiaWinProb(isBlack ? 1 - evalResult.value : evalResult.value);

            await new Promise<void>((res) => setTimeout(res, botDelay()));
            if (cancelBotRef.current) return;

            if (evalResult.bestMove) {
                const elapsed = Date.now() - moveStartRef.current;
                console.log(evalResult);
                moveStartRef.current = Date.now();

                const move = chess.move(evalResult.bestMove);
                if (move) {
                    reconcile(chess, board);
                    setMoves((prev) => [...prev, {
                        san: move.san,
                        uci: move.uci ?? evalResult.bestMove,
                        fen: move.fen ?? chess.fen(),
                        ms: elapsed,
                    }]);
                    const term = detectTermination(chess);
                    if (term.result !== null) {
                        setResult(term.result);
                        setReason(term.reason);
                    }
                    refresh();
                }
            }
        } catch (e) {
            console.error('[MaiaBot] eval error:', e);
        } finally {
            if (!cancelBotRef.current) setBotThinking(false);
        }
    }, [engine, refresh]);

    // Trigger bot move when it's the bot's turn
    useEffect(() => {
        if (!gameActive) return;
        if (result !== null) return;
        if (playerToMove) return;
        if (botThinking) return;
        if (engine.status !== 'ready') return;
        void makeBotMove();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tick, gameActive, engine.status, result, playerToMove, botThinking]);

    // ------------------------------------------------------------------
    // PgnBoard callbacks
    // ------------------------------------------------------------------

    const onBoardInit = useCallback((board: BoardApi, chess: Chess) => {
        chessRef.current = chess;
        boardRef.current = board;
        refresh();
    }, [refresh]);

    /** Called after player's move is already applied to chess by slotProps.board.onMove */
    const onPlayerMoved = useCallback((uci: string) => {
        const chess = chessRef.current;
        if (!chess) return;
        // The move was already applied — just read the last move from chess history
        const lastMove = chess.currentMove();
        if (!lastMove) return;
        const elapsed = Date.now() - moveStartRef.current;
        moveStartRef.current = Date.now();
        setMoves((prev) => [...prev, {
            san: lastMove.san,
            uci: lastMove.uci ?? uci,
            fen: lastMove.fen ?? chess.fen(),
            ms: elapsed,
        }]);
        const term = detectTermination(chess);
        if (term.result !== null) {
            setResult(term.result);
            setReason(term.reason);
        }
        refresh();
    }, [refresh]);

    // ------------------------------------------------------------------
    // Public actions
    // ------------------------------------------------------------------

    const startGame = useCallback((opts: StartOpts) => {
        cancelBotRef.current = true;
        setBotThinking(false);
        setMoves([]);
        setResult(null);
        setReason(null);
        setMaiaWinProb(null);
        setPlayerColor(opts.playerColor);
        setMaiaRating(opts.maiaRating);
        setStartFen(opts.startFen || FEN.start);
        setGameActive(true);
        moveStartRef.current = Date.now();
        setTimeout(() => {
            cancelBotRef.current = false;
            refresh();
        }, 80);
    }, [refresh]);

    const resign = useCallback(() => {
        if (resultRef.current !== null) return;
        cancelBotRef.current = true;
        setBotThinking(false);
        setResult(playerColorRef.current === 'white' ? 'black' : 'white');
        setReason('resign');
    }, []);

    return {
        moves, playerColor, playerToMove, botThinking,
        result, reason, maiaRating, maiaWinProb, startFen, gameActive,
        onBoardInit, onPlayerMoved, startGame, resign,
    };
}