/**
 * Maia chess engine — chess-dojo integration
 *
 * Ported directly from github.com/CSSLab/maia-platform-frontend (GPL-3.0).
 *
 */

import { logger } from '@/logging/logger';
import { objectStorage } from '@/stockfish/engine/objectStorage';
import allMovesDict from './data/all_moves.json';
import allMovesReversedDict from './data/all_moves_reversed.json';

const ALL_MOVES = allMovesDict as Record<string, number>;
const ALL_MOVES_REVERSED = allMovesReversedDict as Record<string, string>;

export type MaiaRating = 1100 | 1200 | 1300 | 1400 | 1500 | 1600 | 1700 | 1800 | 1900;

export const MAIA_RATINGS: MaiaRating[] = [1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900];

export type MaiaStatus = 'idle' | 'loading' | 'no-cache' | 'downloading' | 'ready' | 'error';

export interface MaiaEvalResult {
    bestMove: string;
    policy: Record<string, number>;
    value: number;
}

function createEloDict(): Record<string, number> {
    const interval = 100;
    const start = 1100;
    const end = 2000;
    const dict: Record<string, number> = { [`<${start}`]: 0 };
    let idx = 1;
    for (let lo = start; lo < end; lo += interval) {
        dict[`${lo}-${lo + interval - 1}`] = idx++;
    }
    dict[`>=${end}`] = idx;
    return dict;
}

const ELO_DICT = createEloDict();

function eloToCategory(elo: number): number {
    const interval = 100;
    const start = 1100;
    const end = 2000;
    if (elo < start) return ELO_DICT[`<${start}`];
    if (elo >= end) return ELO_DICT[`>=${end}`];
    for (let lo = start; lo < end; lo += interval) {
        if (elo >= lo && elo < lo + interval) return ELO_DICT[`${lo}-${lo + interval - 1}`];
    }
    throw new Error('ELO out of range');
}

function mirrorSquare(square: string): string {
    return square.charAt(0) + String(9 - parseInt(square.charAt(1)));
}

function mirrorMove(moveUci: string): string {
    const isPromotion = moveUci.length > 4;
    const start = mirrorSquare(moveUci.substring(0, 2));
    const end = mirrorSquare(moveUci.substring(2, 4));
    const promo = isPromotion ? moveUci.substring(4) : '';
    return start + end + promo;
}

function swapColorsInRank(rank: string): string {
    let out = '';
    for (const ch of rank) {
        if (/[A-Z]/.test(ch)) out += ch.toLowerCase();
        else if (/[a-z]/.test(ch)) out += ch.toUpperCase();
        else out += ch;
    }
    return out;
}

function swapCastlingRights(castling: string): string {
    if (castling === '-') return '-';
    const rights = new Set(castling.split(''));
    const swapped = new Set<string>();
    if (rights.has('K')) swapped.add('k');
    if (rights.has('Q')) swapped.add('q');
    if (rights.has('k')) swapped.add('K');
    if (rights.has('q')) swapped.add('Q');
    let out = '';
    if (swapped.has('K')) out += 'K';
    if (swapped.has('Q')) out += 'Q';
    if (swapped.has('k')) out += 'k';
    if (swapped.has('q')) out += 'q';
    return out || '-';
}

function mirrorFEN(fen: string): string {
    const [position, activeColor, castling, enPassant, halfmove, fullmove] = fen.split(' ');
    const mirroredPosition = position.split('/').slice().reverse().map(swapColorsInRank).join('/');
    const mirroredEp = enPassant !== '-' ? mirrorSquare(enPassant) : '-';
    return `${mirroredPosition} ${activeColor === 'w' ? 'b' : 'w'} ${swapCastlingRights(castling)} ${mirroredEp} ${halfmove} ${fullmove}`;
}

const PIECE_TYPES = ['P', 'N', 'B', 'R', 'Q', 'K', 'p', 'n', 'b', 'r', 'q', 'k'];

function boardToTensor(fen: string): Float32Array {
    const tokens = fen.split(' ');
    const piecePlacement = tokens[0];
    const activeColor = tokens[1];
    const castlingAvailability = tokens[2];
    const enPassantTarget = tokens[3];

    const tensor = new Float32Array((12 + 6) * 8 * 8);
    const rows = piecePlacement.split('/');

    // Piece planes — rank indexing adjusted (row = 7 - rank)
    for (let rank = 0; rank < 8; rank++) {
        const row = 7 - rank;
        let file = 0;
        for (const char of rows[rank]) {
            const n = parseInt(char);
            if (isNaN(n)) {
                const index = PIECE_TYPES.indexOf(char);
                tensor[index * 64 + row * 8 + file] = 1.0;
                file++;
            } else {
                file += n;
            }
        }
    }

    // Turn channel (12)
    const turnValue = activeColor === 'w' ? 1.0 : 0.0;
    tensor.fill(turnValue, 12 * 64, 13 * 64);

    // Castling channels (13-16)
    const castlingRights = [
        castlingAvailability.includes('K'),
        castlingAvailability.includes('Q'),
        castlingAvailability.includes('k'),
        castlingAvailability.includes('q'),
    ];
    for (let i = 0; i < 4; i++) {
        if (castlingRights[i]) tensor.fill(1.0, (13 + i) * 64, (14 + i) * 64);
    }

    // En passant channel (17)
    if (enPassantTarget !== '-') {
        const file = enPassantTarget.charCodeAt(0) - 'a'.charCodeAt(0);
        const rank = parseInt(enPassantTarget[1], 10) - 1;
        tensor[17 * 64 + rank * 8 + file] = 1.0;
    }

    return tensor;
}

async function getLegalMovesTensor(fen: string): Promise<Float32Array> {
    const { Chess } = await import('@jackstenglein/chess');
    const chess = new Chess({ fen });
    const tensor = new Float32Array(Object.keys(ALL_MOVES).length);

    const moves = chess.moves({ disableNullMoves: true });
    for (const m of moves) {
        const move = m as { from: string; to: string; promotion?: string };
        const promotion = move.promotion ?? '';
        const uci = move.from + move.to + promotion;
        const idx = ALL_MOVES[uci];
        if (idx !== undefined) tensor[idx] = 1.0;
    }
    return tensor;
}

const IDB_STORE = 'MaiaModel';
const IDB_KEY = 'maia2-rapid';

async function readModelFromCache(): Promise<ArrayBuffer | null> {
    try {
        const store = await objectStorage<Blob, string>({ store: IDB_STORE });
        const blob = await store.get(IDB_KEY).catch(() => undefined);
        return blob ? await blob.arrayBuffer() : null;
    } catch {
        return null;
    }
}

async function writeModelToCache(buffer: ArrayBuffer): Promise<void> {
    try {
        const store = await objectStorage<Blob, string>({ store: IDB_STORE });
        await store.put(IDB_KEY, new Blob([buffer])).catch(() => {
            logger.warn('[MaiaEngine] IndexedDB put failed (storage full?)');
        });
    } catch (e) {
        logger.warn('[MaiaEngine] Failed to open IDB store:', e);
    }
}

interface OnnxTensor {
    data: ArrayLike<number>;
}

function processOutputs(
    logitsMaia: OnnxTensor,
    logitsValue: OnnxTensor,
    legalMoves: Float32Array,
    isBlack: boolean,
): MaiaEvalResult {
    let winProb = Math.min(Math.max(logitsValue.data[0] / 2 + 0.5, 0), 1);
    if (isBlack) winProb = 1 - winProb;
    winProb = Math.round(winProb * 10000) / 10000;

    const legalMoveIndices = Array.from(legalMoves)
        .map((v, i) => (v > 0 ? i : -1))
        .filter((i) => i !== -1);

    if (legalMoveIndices.length === 0) {
        return { bestMove: '', policy: {}, value: winProb };
    }

    const legalMovesMirrored: string[] = legalMoveIndices.map((idx) => {
        let move = ALL_MOVES_REVERSED[String(idx)];
        if (isBlack) move = mirrorMove(move);
        return move;
    });

    const legalLogits = legalMoveIndices.map((idx) => logitsMaia.data[idx]);

    const maxLogit = Math.max(...legalLogits);
    const expLogits = legalLogits.map((l) => Math.exp(l - maxLogit));
    const sumExp = expLogits.reduce((a, b) => a + b, 0);
    const probs = expLogits.map((e) => e / sumExp);

    const moveProbs: Record<string, number> = {};
    for (let i = 0; i < legalMovesMirrored.length; i++) {
        moveProbs[legalMovesMirrored[i]] = probs[i];
    }

    const sorted = Object.fromEntries(
        Object.keys(moveProbs)
            .sort((a, b) => moveProbs[b] - moveProbs[a])
            .map((k) => [k, moveProbs[k]]),
    );

    return { bestMove: Object.keys(sorted)[0], policy: sorted, value: winProb };
}

export interface MaiaEngineOptions {
    modelUrl: string;
    onStatusChange?: (s: MaiaStatus) => void;
    onProgress?: (p: number) => void;
    onError?: (msg: string) => void;
}

export class MaiaEngine {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private session: any = null;
    private readonly modelUrl: string;
    private readonly onStatusChange: (s: MaiaStatus) => void;
    private readonly onProgress: (p: number) => void;
    private readonly onError: (msg: string) => void;

    constructor(opts: MaiaEngineOptions) {
        this.modelUrl = opts.modelUrl;
        this.onStatusChange = opts.onStatusChange ?? (() => undefined);
        this.onProgress = opts.onProgress ?? (() => undefined);
        this.onError = opts.onError ?? (() => undefined);
    }

    async initialize(): Promise<void> {
        this.onStatusChange('loading');
        try {
            const cached = await readModelFromCache();
            if (cached) {
                await this.createSession(cached);
            } else {
                this.onStatusChange('no-cache');
            }
        } catch (e) {
            this.onError(String(e));
            this.onStatusChange('error');
        }
    }

    async download(): Promise<void> {
        this.onStatusChange('downloading');
        this.onProgress(0);
        try {
            const res = await fetch(this.modelUrl);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const contentLength = parseInt(res.headers.get('Content-Length') ?? '0');
            const reader = res.body?.getReader();
            if (!reader) throw new Error('No response body');

            const chunks: Uint8Array[] = [];
            let received = 0;
            let lastPct = 0;

            for (;;) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
                received += value.length;
                if (contentLength > 0) {
                    const pct = Math.floor((received / contentLength) * 100);
                    if (pct >= lastPct + 5) {
                        this.onProgress(pct);
                        lastPct = pct;
                    }
                }
            }

            const buffer = new Uint8Array(received);
            let pos = 0;
            for (const chunk of chunks) {
                buffer.set(chunk, pos);
                pos += chunk.length;
            }

            await writeModelToCache(buffer.buffer);
            await this.createSession(buffer.buffer);
            this.onProgress(100);
        } catch (e) {
            this.onError(String(e));
            this.onStatusChange('error');
        }
    }

    private async createSession(buffer: ArrayBuffer): Promise<void> {
        const ort = await import('onnxruntime-web');
        this.session = await ort.InferenceSession.create(buffer, {
            executionProviders: ['wasm'],
        });
        this.onStatusChange('ready');
    }

    async evaluate(fen: string, eloSelf: number, eloOppo: number): Promise<MaiaEvalResult> {
        if (!this.session) throw new Error('Maia model not loaded');

        const ort = await import('onnxruntime-web');
        const { Tensor } = ort;

        const isBlack = fen.split(' ')[1] === 'b';
        const workFen = isBlack ? mirrorFEN(fen) : fen;

        const boardInput = boardToTensor(workFen);
        const eloSelfCat = eloToCategory(eloSelf);
        const eloOppoCat = eloToCategory(eloOppo);
        const legalMoves = await getLegalMovesTensor(workFen);

        const feeds = {
            boards: new Tensor('float32', boardInput, [1, 18, 8, 8]),
            elo_self: new Tensor('int64', BigInt64Array.from([BigInt(eloSelfCat)])),
            elo_oppo: new Tensor('int64', BigInt64Array.from([BigInt(eloOppoCat)])),
        };

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const { logits_maia, logits_value } = await this.session.run(feeds);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        return processOutputs(logits_maia, logits_value, legalMoves, isBlack);
    }
}

export function getMaiaModelUrl(): string {
    return 'https://nwvqnfxvnaeuci85.public.blob.vercel-storage.com/maia_rapid.onnx';
}
