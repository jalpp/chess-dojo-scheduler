'use client';

import { Chess} from '@jackstenglein/chess';
import { MaiaRating } from './maiaengine';
export type PlayerColor = 'white' | 'black';

export interface MoveRecord {
    san: string;
    uci: string;
    fen: string;
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
    maiaWinProb: number | null;
    startFen: string;
    onPlayerMove: (from: string, to: string, promotion?: string) => void;
    newGame: (opts: { playerColor: PlayerColor; maiaRating: MaiaRating; startFen?: string }) => void;
    resign: () => void;
}

