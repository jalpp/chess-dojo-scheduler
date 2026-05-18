import { MateInOneAttempt } from '@jackstenglein/chess-dojo-common/src/mateInOne/api';

/**
 * Strips check, checkmate, and promotion characters so answers like
 * "Qh7" match "Qh7#" and "a8Q" matches "a8=Q".
 *
 * @param san - A SAN move string.
 * @returns The normalised lowercase move.
 */
export function normalizeSan(san: string): string {
    return san
        .replace(/[x+#=-]/g, '')
        .replace(/[0]/g, 'O')
        .toLowerCase()
        .trim();
}

/**
 * Returns true when the user's input matches the correct mating move,
 * ignoring check/checkmate annotations and promotion `=` characters.
 */
export function isCorrectAnswer(userInput: string, correctSan: string): boolean {
    return normalizeSan(userInput) === normalizeSan(correctSan);
}

/**
 * Computes summary statistics from a list of attempts.
 */
export function computeSessionStats(
    allAttempts: MateInOneAttempt[],
    sessionStartMs: number,
): { totalTimeSeconds: number; correctCount: number; avgResponseTimeMs: number } {
    const totalTimeSeconds = Math.round((Date.now() - sessionStartMs) / 1000);
    const correctCount = allAttempts.filter((a) => a.isCorrect).length;
    const avgResponseTimeMs =
        allAttempts.length > 0
            ? Math.round(
                  allAttempts.reduce((sum, a) => sum + a.responseTimeMs, 0) / allAttempts.length,
              )
            : 0;
    return { totalTimeSeconds, correctCount, avgResponseTimeMs };
}
