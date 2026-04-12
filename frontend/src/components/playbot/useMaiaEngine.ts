'use client';

/**
 * useMaiaEngine
 *
 * React hook that owns the full lifecycle of the Maia ONNX model:
 *   - First load: checks IndexedDB cache, shows "download needed" state if absent
 *   - Download: streams the model, reports progress, caches in IndexedDB
 *   - Evaluate: runs inference and returns { bestMove, policy, value }
 *
 * Designed to mirror the MaiaEngineContext pattern from
 * github.com/CSSLab/maia-platform-frontend but as a standalone hook
 * that fits the chess-dojo architecture (no global Context needed).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { getMaiaModelUrl, MaiaEngine, MaiaEvalResult, MaiaStatus } from './maiaengine';

export type { MaiaStatus, MaiaEvalResult };

export interface UseMaiaEngineResult {
    /** Current lifecycle status of the engine */
    status: MaiaStatus;
    /** Download progress 0-100 (only relevant while status === 'downloading') */
    progress: number;
    /** Error message if status === 'error' */
    error: string | null;
    /** Kick off model download from CDN → IndexedDB */
    downloadModel: () => Promise<void>;
    /** Run inference. Resolves immediately if ready, throws if not. */
    evaluate: (fen: string, eloSelf: number, eloOppo: number) => Promise<MaiaEvalResult>;
}

export function useMaiaEngine(): UseMaiaEngineResult {
    const [status, setStatus] = useState<MaiaStatus>('idle');
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const engineRef = useRef<MaiaEngine | null>(null);

    useEffect(() => {
        const engine = new MaiaEngine({
            modelUrl: getMaiaModelUrl(),
            onStatusChange: setStatus,
            onProgress: setProgress,
            onError: setError,
        });
        engineRef.current = engine;
        void engine.initialize();
    }, []);

    const downloadModel = useCallback(async () => {
        if (!engineRef.current) return;
        setError(null);
        await engineRef.current.download();
    }, []);

    const evaluate = useCallback(
        async (fen: string, eloSelf: number, eloOppo: number): Promise<MaiaEvalResult> => {
            if (!engineRef.current) throw new Error('Engine not initialized');
            return await engineRef.current.evaluate(fen, eloSelf, eloOppo);
        },
        [],
    );

    return { status, progress, error, downloadModel, evaluate };
}