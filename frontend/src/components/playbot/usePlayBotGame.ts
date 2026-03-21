'use client';

/**
 * usePlayBotGame
 *
 * All game state for playing against the Maia bot.
 *
 * @jackstenglein/chess API (verified from github.com/jackstenglein/chess):
 *   new Chess({ fen? })        constructor; no-arg = start position
 *   chess.load(fen)            reset to FEN, clears history
 *   chess.fen()                current FEN (defaults to current move)
 *   chess.turn()               Color ('w'|'b') — defaults to current move
 *   chess.move({from,to,promotion?})  returns Move|null; Move has .san .uci .fen
 *   chess.moves({disableNullMoves})   returns ChessJsMove[] (always verbose)
 *   chess.isGameOver()         boolean — zero-arg, defaults to current move
 *   chess.isCheckmate()        boolean — zero-arg
 *   chess.isStalemate()        boolean — zero-arg
 *   chess.isDraw()             boolean — 50-move or insufficient material
 *   chess.isInsufficientMaterial()  boolean — zero-arg
 *   chess.isThreefoldRepetition()   boolean — zero-arg
 *   FEN.start                  the starting position FEN constant
 */

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
    /** Wall-clock milliseconds taken for this move */
    ms: number;
}

export type GameResult = 'white' | 'black' | 'draw' | null;
export type GameOverReason =
    | 'checkmate'
    | 'stalemate'
    | 'insufficient'
    | 'repetition'
    | 'fifty-move'
    | 'resign'
    | null;

export interface UsePlayBotGameResult {
    chess: Chess;
    moves: MoveRecord[];
    playerColor: PlayerColor;
    playerToMove: boolean;
    botThinking: boolean;
    result: GameResult;
    reason: GameOverReason;
    maiaRating: MaiaRating;
    /** Win probability for white [0,1] after Maia's last evaluation */
    maiaWinProb: number | null;
    /** The FEN the current game started from */
    startFen: string;
    onPlayerMove: (from: string, to: string, promotion?: string) => void;
    newGame: (opts: { playerColor: PlayerColor; maiaRating: MaiaRating; startFen?: string }) => void;
    resign: () => void;
}

// ---------------------------------------------------------------------------
// Game-over detection
// ---------------------------------------------------------------------------

function detectTermination(chess: Chess): { result: GameResult; reason: GameOverReason } {
    if (!chess.isGameOver()) return { result: null, reason: null };

    if (chess.isCheckmate()) {
        // The side whose turn it currently is has been mated → they lose
        const loser = chess.turn() === 'w' ? 'white' : 'black';
        return { result: loser === 'white' ? 'black' : 'white', reason: 'checkmate' };
    }

    if (chess.isStalemate()) return { result: 'draw', reason: 'stalemate' };
    if (chess.isInsufficientMaterial()) return { result: 'draw', reason: 'insufficient' };
    if (chess.isThreefoldRepetition()) return { result: 'draw', reason: 'repetition' };
    if (chess.isDraw()) return { result: 'draw', reason: 'fifty-move' };

    return { result: 'draw', reason: null };
}

// ---------------------------------------------------------------------------
// Bot delay — humanised response timing
// ---------------------------------------------------------------------------

function botDelayMs(): number {
    return 500 + Math.random() * 900;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePlayBotGame(engine: UseMaiaEngineResult): UsePlayBotGameResult {
    // A single stable Chess instance, mutated in place.
    // refresh() forces React to re-render after mutations.
    const [chess] = useState<Chess>(() => new Chess());

    const [moves, setMoves] = useState<MoveRecord[]>([]);
    const [playerColor, setPlayerColor] = useState<PlayerColor>('white');
    const [maiaRating, setMaiaRating] = useState<MaiaRating>(1500);
    const [botThinking, setBotThinking] = useState(false);
    const [result, setResult] = useState<GameResult>(null);
    const [reason, setReason] = useState<GameOverReason>(null);
    const [maiaWinProb, setMaiaWinProb] = useState<number | null>(null);
    const [startFen, setStartFen] = useState<string>(FEN.start);

    // tick forces re-renders after chess mutations
    const [tick, setTick] = useState(0);
    const refresh = useCallback(() => setTick((t) => t + 1), []);

    // Stable refs avoid stale closures in async bot callback
    const chessRef = useRef(chess);
    const resultRef = useRef(result);
    const maiaRatingRef = useRef(maiaRating);
    const playerColorRef = useRef(playerColor);
    chessRef.current = chess;
    resultRef.current = result;
    maiaRatingRef.current = maiaRating;
    playerColorRef.current = playerColor;

    const cancelBotRef = useRef(false);
    const moveStartRef = useRef(Date.now());

    // Is it the human player's turn right now?
    const playerToMove =
        result === null && (chess.turn() === 'w') === (playerColor === 'white');

    // ------------------------------------------------------------------
    // Apply a move (used for both player and bot moves)
    // ------------------------------------------------------------------
    const applyMove = useCallback(
        (uci: string): boolean => {
            // CandidateMove = string | { from: Square; to: Square; promotion? }
            // Passing the UCI string directly avoids Square type issues and
            // matches via move.uci === candidate (see Chess.candidateMatches)
            const move = chessRef.current.move(uci);
            if (!move) return false;

            const elapsed = Date.now() - moveStartRef.current;
            moveStartRef.current = Date.now();

            setMoves((prev) => [
                ...prev,
                {
                    san: move.san,
                    uci: move.uci ?? uci,
                    fen: move.fen ?? chessRef.current.fen(),
                    ms: elapsed,
                },
            ]);

            const term = detectTermination(chessRef.current);
            if (term.result !== null) {
                setResult(term.result);
                setReason(term.reason);
            }

            refresh();
            return true;
        },
        [refresh],
    );

    // ------------------------------------------------------------------
    // Bot move: evaluate with Maia, wait delay, apply
    // ------------------------------------------------------------------
    const makeBotMove = useCallback(async () => {
        if (cancelBotRef.current) return;
        if (engine.status !== 'ready') return;
        if (resultRef.current !== null) return;

        setBotThinking(true);
        try {
            const fen = chessRef.current.fen();
            const rating = maiaRatingRef.current;

            // eloSelf = bot's own rating, eloOppo = player's rating
            // Using same rating for both gives the most representative play
            const evalResult = await engine.evaluate(fen, rating, rating);
            if (cancelBotRef.current) return;

            // win prob from Maia is for the side-to-move; convert to white's perspective
            const isBlack = fen.split(' ')[1] === 'b';
            setMaiaWinProb(isBlack ? 1 - evalResult.value : evalResult.value);

            // Humanised delay
            await new Promise<void>((res) => setTimeout(res, botDelayMs()));
            if (cancelBotRef.current) return;

            if (evalResult.bestMove) {
                applyMove(evalResult.bestMove);
            }
        } catch (e) {
            console.error('[MaiaBot] Evaluation error:', e);
        } finally {
            if (!cancelBotRef.current) setBotThinking(false);
        }
    }, [engine, applyMove]);

    // Trigger bot move whenever the position updates and it's the bot's turn
    useEffect(() => {
        if (result !== null) return;
        if (playerToMove) return;
        if (botThinking) return;
        if (engine.status !== 'ready') return;

        void makeBotMove();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tick, engine.status, result, playerToMove, botThinking]);

    // ------------------------------------------------------------------
    // Public API
    // ------------------------------------------------------------------

    const onPlayerMove = useCallback(
        (from: string, to: string, promotion?: string) => {
            if (!playerToMove) return;
            if (result !== null) return;
            // Build UCI string; chess.move() accepts it directly as CandidateMove
            applyMove(from + to + (promotion ?? ''));
        },
        [playerToMove, result, applyMove],
    );

    const newGame = useCallback(
        (opts: { playerColor: PlayerColor; maiaRating: MaiaRating; startFen?: string }) => {
            // Stop any in-flight bot move immediately
            cancelBotRef.current = true;
            setBotThinking(false);

            const fen = opts.startFen || FEN.start;
            // chess.load(fen) resets position + clears entire PGN history
            chessRef.current.load(fen);

            setMoves([]);
            setResult(null);
            setReason(null);
            setMaiaWinProb(null);
            setStartFen(fen);
            setPlayerColor(opts.playerColor);
            setMaiaRating(opts.maiaRating);
            moveStartRef.current = Date.now();

            // Re-arm the bot after one React tick so state is flushed
            setTimeout(() => {
                cancelBotRef.current = false;
                refresh();
            }, 30);
        },
        [refresh],
    );

    const resign = useCallback(() => {
        if (resultRef.current !== null) return;
        cancelBotRef.current = true;
        setBotThinking(false);
        setResult(playerColorRef.current === 'white' ? 'black' : 'white');
        setReason('resign');
    }, []);

    return {
        chess,
        moves,
        playerColor,
        playerToMove,
        botThinking,
        result,
        reason,
        maiaRating,
        maiaWinProb,
        startFen,
        onPlayerMove,
        newGame,
        resign,
    };
}