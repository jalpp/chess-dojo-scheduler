'use client';

/**
 * useMaiaEngine
 *
 * React hook for Maia move generation.
 * Previously managed ONNX model download/cache lifecycle.
 * Now calls the ChessAgine neural-net API — no download, always ready.
 */

import { useCallback } from 'react';
import { callMaiaApi, MaiaEvalResult, MaiaRating, MaiaStatus } from './maiaengine';

export type { MaiaEvalResult, MaiaStatus };

export interface UseMaiaEngineResult {
    evaluate: (fen: string, eloSelf: number, eloOppo: number) => Promise<MaiaEvalResult>;
}

export function useMaiaEngine(): UseMaiaEngineResult {
    const evaluate = useCallback(
        async (fen: string, eloSelf: number, _eloOppo: number): Promise<MaiaEvalResult> => {
            return callMaiaApi(fen, eloSelf as MaiaRating);
        },
        [],
    );

    return {
        evaluate,
    };
}
