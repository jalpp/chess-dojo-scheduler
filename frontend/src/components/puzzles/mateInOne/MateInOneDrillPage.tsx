'use client';

import { getMateInOnePuzzle, submitMateInOneSession } from '@/api/puzzleApi';
import { RequestSnackbar, useRequest } from '@/api/Request';
import { AuthStatus, useAuth } from '@/auth/Auth';
import Board from '@/board/Board';
import LoadingPage from '@/loading/LoadingPage';
import NotFoundPage from '@/NotFoundPage';
import { Chess } from '@jackstenglein/chess';
import {
    MateInOneAttempt,
    MateInOnePuzzle,
} from '@jackstenglein/chess-dojo-common/src/mateInOne/api';
import { fenToPieceList } from '@jackstenglein/chess-dojo-common/src/mateInOne/fen';
import AccessTime from '@mui/icons-material/AccessTime';
import Target from '@mui/icons-material/GpsFixed';
import Timer from '@mui/icons-material/Timer';
import {
    Box,
    Button,
    CircularProgress,
    Container,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { Key } from 'chessground/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { computeSessionStats, isCorrectAnswer } from './mateInOneDrillUtils';

const MIN_PUZZLES_FOR_RATING = 10;

type DrillState = 'loading' | 'ready' | 'in_progress' | 'complete';

/** A puzzle with its pre-computed solution and display data. */
interface PuzzleWithSolution {
    puzzle: MateInOnePuzzle;
    /** The correct mating move in SAN notation. */
    correctSan: string;
    /** The correct move's from square. */
    correctFrom: Key;
    /** The correct move's to square. */
    correctTo: Key;
    /** The FEN after the setup move (the position the user must solve). */
    fenAfterSetup: string;
    /** 'White' or 'Black', the side that delivers mate. */
    sideToMove: string;
    /** Human-readable piece list derived from fenAfterSetup. */
    pieceList: string;
}

interface SessionSummary {
    totalPuzzles: number;
    correctCount: number;
    avgResponseTimeMs: number;
    totalTimeSeconds: number;
    attempts: MateInOneAttempt[];
}

/**
 * Applies the setup move from a puzzle and computes display data for it.
 *
 * @param puzzle - The raw puzzle from the API.
 * @returns The puzzle enriched with solution info and display strings.
 */
function computeSolutionFromPuzzle(puzzle: MateInOnePuzzle): PuzzleWithSolution {
    const chess = new Chess({ fen: puzzle.fen });
    chess.move(puzzle.moves[0]);
    const fenAfterSetup = chess.fen();
    const sideToMove = chess.turn() === 'w' ? 'White' : 'Black';
    const moveResult = chess.move(puzzle.moves[1]);
    if (!moveResult) {
        throw new Error(`Invalid mating move for puzzle ${puzzle.id}: ${puzzle.moves[1]}`);
    }
    const correctSan = moveResult.san;
    return {
        puzzle,
        correctSan,
        correctFrom: moveResult.from,
        correctTo: moveResult.to,
        fenAfterSetup,
        sideToMove,
        pieceList: fenToPieceList(fenAfterSetup),
    };
}

/** Root component: requires authentication. */
export function MateInOneDrillPage() {
    const { user, status } = useAuth();

    if (status === AuthStatus.Loading) {
        return <LoadingPage />;
    }
    if (!user) {
        return <NotFoundPage />;
    }

    return <MateInOneDrill />;
}

/** Inner component: manages the full drill lifecycle. */
function MateInOneDrill() {
    const submitRequest = useRequest();
    const [drillState, setDrillState] = useState<DrillState>('loading');
    const [currentPuzzle, setCurrentPuzzle] = useState<PuzzleWithSolution | null>(null);
    const [userInput, setUserInput] = useState('');
    const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
    const [attempts, setAttempts] = useState<MateInOneAttempt[]>([]);
    const [summary, setSummary] = useState<SessionSummary | null>(null);
    const [prefetchLoading, setPrefetchLoading] = useState(false);
    const [fetchError, setFetchError] = useState(false);

    const attemptsRef = useRef<MateInOneAttempt[]>([]);
    const sessionStartRef = useRef<number>(0);
    const questionStartRef = useRef<number>(0);
    const sessionCreatedAtRef = useRef<string>('');
    const prefetchRef = useRef<Promise<PuzzleWithSolution> | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const FOCUS_DELAY_MS = 50;
    const focusInput = useCallback(() => {
        setTimeout(() => inputRef.current?.focus(), FOCUS_DELAY_MS);
    }, []);

    /** Fetches and computes a single puzzle. */
    const fetchPuzzle = useCallback(async (): Promise<PuzzleWithSolution> => {
        const response = await getMateInOnePuzzle();
        return computeSolutionFromPuzzle(response.data.puzzle);
    }, []);

    /** Kicks off a background prefetch for the next puzzle. */
    const prefetchNext = useCallback(() => {
        prefetchRef.current = fetchPuzzle();
    }, [fetchPuzzle]);

    /** Loads the first puzzle on mount. */
    useEffect(() => {
        fetchPuzzle()
            .then((p) => {
                setCurrentPuzzle(p);
                setFetchError(false);
                setDrillState('ready');
            })
            .catch(() => {
                setFetchError(true);
                setDrillState('ready');
            });
    }, [fetchPuzzle]);

    const startDrill = useCallback(() => {
        setAttempts([]);
        attemptsRef.current = [];
        setFeedback(null);
        setSummary(null);
        setUserInput('');
        setCurrentPuzzle(null);
        prefetchRef.current = null;
        sessionStartRef.current = Date.now();
        sessionCreatedAtRef.current = new Date().toISOString();
        setDrillState('in_progress');
        fetchPuzzle()
            .then((p) => {
                setCurrentPuzzle(p);
                setFetchError(false);
                questionStartRef.current = Date.now();
                prefetchNext();
                focusInput();
            })
            .catch(() => {
                setFetchError(true);
                setDrillState('ready');
            });
    }, [fetchPuzzle, prefetchNext, focusInput]);

    const finishDrill = useCallback(
        (allAttempts: MateInOneAttempt[]) => {
            if (allAttempts.length === 0) {
                setDrillState('ready');
                return;
            }

            const { totalTimeSeconds, correctCount, avgResponseTimeMs } = computeSessionStats(
                allAttempts,
                sessionStartRef.current,
            );

            const result: SessionSummary = {
                totalPuzzles: allAttempts.length,
                correctCount,
                avgResponseTimeMs,
                totalTimeSeconds,
                attempts: allAttempts,
            };

            setSummary(result);
            setDrillState('complete');

            submitRequest.onStart();
            submitMateInOneSession({
                ...result,
                createdAt: sessionCreatedAtRef.current,
            }).then(
                () => submitRequest.onSuccess(),
                (err: unknown) => submitRequest.onFailure(err),
            );
        },
        [submitRequest],
    );

    const handleStop = useCallback(() => {
        finishDrill(attemptsRef.current);
    }, [finishDrill]);

    const advanceToNextPuzzle = useCallback(() => {
        setUserInput('');
        setFeedback(null);

        if (!prefetchRef.current) {
            setPrefetchLoading(true);
            fetchPuzzle()
                .then((p) => {
                    setCurrentPuzzle(p);
                    setPrefetchLoading(false);
                    questionStartRef.current = Date.now();
                    prefetchNext();
                    focusInput();
                })
                .catch(() => {
                    setPrefetchLoading(false);
                    setFetchError(true);
                });
            return;
        }

        prefetchRef.current
            .then((p) => {
                setCurrentPuzzle(p);
                setPrefetchLoading(false);
                questionStartRef.current = Date.now();
                prefetchNext();
                focusInput();
            })
            .catch(() => {
                setPrefetchLoading(false);
                setFetchError(true);
            });

        prefetchRef.current = null;
    }, [fetchPuzzle, prefetchNext, focusInput]);

    const handleSubmit = useCallback(() => {
        if (!currentPuzzle || feedback !== null || userInput.trim() === '') return;

        const responseTimeMs = Date.now() - questionStartRef.current;
        const correct = isCorrectAnswer(userInput, currentPuzzle.correctSan);

        const attempt: MateInOneAttempt = {
            puzzleId: currentPuzzle.puzzle.id,
            fen: currentPuzzle.fenAfterSetup,
            correctMove: currentPuzzle.correctSan,
            userMove: userInput.trim(),
            isCorrect: correct,
            responseTimeMs,
        };

        const updatedAttempts = [...attemptsRef.current, attempt];
        attemptsRef.current = updatedAttempts;
        setAttempts(updatedAttempts);

        const { totalTimeSeconds, correctCount, avgResponseTimeMs } = computeSessionStats(
            updatedAttempts,
            sessionStartRef.current,
        );

        submitMateInOneSession({
            totalPuzzles: updatedAttempts.length,
            correctCount,
            avgResponseTimeMs,
            totalTimeSeconds,
            attempts: updatedAttempts,
            createdAt: sessionCreatedAtRef.current,
        }).catch(() => undefined);

        setFeedback(correct ? 'correct' : 'incorrect');
    }, [currentPuzzle, feedback, userInput]);

    if (drillState === 'loading') {
        return (
            <Container maxWidth='sm' sx={{ py: 8, textAlign: 'center' }}>
                <CircularProgress />
            </Container>
        );
    }

    if (drillState === 'ready') {
        return <ReadyScreen onStart={startDrill} fetchError={fetchError} />;
    }

    if (drillState === 'complete' && summary) {
        return (
            <>
                <CompleteScreen summary={summary} onPlayAgain={startDrill} />
                <RequestSnackbar request={submitRequest} />
            </>
        );
    }

    return (
        <InProgressScreen
            puzzle={currentPuzzle}
            puzzleNumber={attempts.length + 1}
            userInput={userInput}
            onInputChange={setUserInput}
            onSubmit={handleSubmit}
            onContinue={advanceToNextPuzzle}
            onStop={handleStop}
            feedback={feedback}
            prefetchLoading={prefetchLoading}
            inputRef={inputRef}
        />
    );
}

/**
 * Landing screen with a two-step armed Start flow.
 *
 * @param onStart - Callback invoked when the user confirms they want to start.
 */
function ReadyScreen({ onStart, fetchError }: { onStart: () => void; fetchError: boolean }) {
    const [armed, setArmed] = useState(false);

    return (
        <Container maxWidth='sm' sx={{ py: 8, textAlign: 'center' }}>
            <Typography variant='h4' sx={{ fontWeight: 'bold', mb: 2 }}>
                Mate in One Visualization Drill
            </Typography>
            <Typography variant='body1' color='text.secondary' sx={{ mb: 1 }}>
                You will see a list of pieces and their squares. Type the mating move in SAN
                notation (e.g. "Qh7#" or just "Qh7") and press Enter.
            </Typography>
            <Typography variant='body1' color='text.secondary' sx={{ mb: 4 }}>
                {armed
                    ? 'Ready? Hit GO! to start the timer.'
                    : 'No board is shown. Visualize the position and find the mate from memory!'}
            </Typography>
            {fetchError && (
                <Typography variant='body2' color='error' sx={{ mb: 2 }}>
                    Could not load puzzles. Check your connection and try again.
                </Typography>
            )}
            <Button
                variant='contained'
                size='large'
                onClick={armed ? onStart : () => setArmed(true)}
                sx={{ px: 6, py: 1.5 }}
            >
                {armed ? 'GO!' : 'Start'}
            </Button>
        </Container>
    );
}

interface InProgressScreenProps {
    puzzle: PuzzleWithSolution | null;
    puzzleNumber: number;
    userInput: string;
    onInputChange: (value: string) => void;
    onSubmit: () => void;
    onContinue: () => void;
    onStop: () => void;
    feedback: 'correct' | 'incorrect' | null;
    prefetchLoading: boolean;
    inputRef: React.RefObject<HTMLInputElement | null>;
}

/**
 * Active drill screen: shows piece list, accepts typed move, flashes feedback.
 *
 * @param puzzle - The current puzzle with solution data.
 * @param puzzleNumber - 1-based index of the current puzzle in the session.
 * @param userInput - Current text in the move input field.
 * @param onInputChange - Callback to update the input value.
 * @param onSubmit - Callback invoked when the user submits their answer.
 * @param onContinue - Callback invoked when the user continues to the next puzzle.
 * @param onStop - Callback invoked when the user ends the session early.
 * @param feedback - Current feedback state ('correct', 'incorrect', or null).
 * @param prefetchLoading - Whether the next puzzle is still being fetched.
 * @param inputRef - Ref to the text input element for programmatic focus.
 */
function InProgressScreen({
    puzzle,
    puzzleNumber,
    userInput,
    onInputChange,
    onSubmit,
    onStop,
    onContinue,
    feedback,
    prefetchLoading,
    inputRef,
}: InProgressScreenProps) {
    if (!puzzle || prefetchLoading) {
        return (
            <Container maxWidth='sm' sx={{ py: 8, textAlign: 'center' }}>
                <CircularProgress />
            </Container>
        );
    }

    return (
        <Container maxWidth='sm' sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant='subtitle1' color='text.secondary' sx={{ mb: 0.5 }}>
                Puzzle {puzzleNumber}
            </Typography>

            <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                {puzzle.sideToMove} to move and mate in 1
            </Typography>

            <Box
                sx={{
                    py: 3,
                    px: 2,
                    mb: 4,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    backgroundColor:
                        feedback === 'correct'
                            ? 'success.main'
                            : feedback === 'incorrect'
                              ? 'error.main'
                              : 'background.paper',
                    transition: 'background-color 0.15s',
                }}
            >
                <Typography
                    variant='body1'
                    sx={{
                        fontFamily: 'monospace',
                        fontSize: '1rem',
                        color: feedback ? 'white' : 'text.primary',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                    }}
                >
                    {puzzle.pieceList}
                </Typography>
                {feedback === 'incorrect' && (
                    <Typography variant='body2' sx={{ mt: 1, color: 'white', fontWeight: 'bold' }}>
                        Correct: {puzzle.correctSan}
                    </Typography>
                )}
            </Box>

            <Stack direction='row' spacing={2} justifyContent='center' alignItems='center'>
                <TextField
                    inputRef={inputRef}
                    value={userInput}
                    onChange={(e) => onInputChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            if (feedback) {
                                onContinue();
                            } else {
                                onSubmit();
                            }
                            e.preventDefault();
                            e.stopPropagation();
                        }
                    }}
                    placeholder='e.g. Qh7'
                    size='small'
                    sx={{ width: 150 }}
                    autoComplete='off'
                    autoCorrect='off'
                    autoCapitalize='off'
                    spellCheck={false}
                />
                <Button
                    variant='contained'
                    onClick={feedback ? onContinue : onSubmit}
                    disabled={feedback === null && userInput.trim() === ''}
                >
                    {feedback ? 'Continue' : 'Submit'}
                </Button>

                <Button variant='outlined' color='error' onClick={onStop}>
                    Stop
                </Button>
            </Stack>

            {feedback && (
                <Stack direction='row' justifyContent='center'>
                    <Box
                        width={{ xs: 1, sm: 0.8, md: 0.75, lg: 0.75 }}
                        sx={{ aspectRatio: 1, mt: 3 }}
                    >
                        <Board
                            config={{
                                fen: puzzle.fenAfterSetup,
                                viewOnly: true,
                                drawable: {
                                    shapes: [
                                        {
                                            orig: puzzle.correctFrom,
                                            dest: puzzle.correctTo,
                                            brush: 'green',
                                        },
                                    ],
                                    eraseOnClick: false,
                                },
                            }}
                        />
                    </Box>
                </Stack>
            )}
        </Container>
    );
}

interface CompleteScreenProps {
    summary: SessionSummary;
    onPlayAgain: () => void;
}

/**
 * Summary screen shown after the session ends.
 *
 * @param summary - The computed session statistics.
 * @param onPlayAgain - Callback invoked when the user wants another session.
 */
function CompleteScreen({ summary, onPlayAgain }: CompleteScreenProps) {
    const accuracy =
        summary.totalPuzzles > 0
            ? Math.round((summary.correctCount / summary.totalPuzzles) * 100)
            : 0;
    const avgTime = (summary.avgResponseTimeMs / 1000).toFixed(1);

    return (
        <Container maxWidth='sm' sx={{ py: 8, textAlign: 'center' }}>
            <Typography variant='h4' sx={{ fontWeight: 'bold', mb: 4 }}>
                Session Complete!
            </Typography>

            {summary.totalPuzzles < MIN_PUZZLES_FOR_RATING && (
                <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                    Complete at least {MIN_PUZZLES_FOR_RATING} puzzles in a session to unlock
                    ratings (coming soon).
                </Typography>
            )}

            <Stack spacing={2} sx={{ mb: 4 }}>
                <StatRow
                    icon={<Target fontSize='small' />}
                    label='Accuracy'
                    value={`${accuracy}% (${summary.correctCount}/${summary.totalPuzzles})`}
                />
                <StatRow
                    icon={<Timer fontSize='small' />}
                    label='Avg Response Time'
                    value={`${avgTime}s`}
                />
                <StatRow
                    icon={<AccessTime fontSize='small' />}
                    label='Total Time'
                    value={`${summary.totalTimeSeconds}s`}
                />
            </Stack>

            <Stack spacing={1} sx={{ mb: 4, maxHeight: 300, overflow: 'auto' }}>
                {summary.attempts.map((a, i) => (
                    <Stack
                        key={`${a.puzzleId}-${i}`}
                        direction='row'
                        justifyContent='space-between'
                        sx={{
                            px: 2,
                            py: 0.5,
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                        }}
                    >
                        <Typography fontWeight='bold' sx={{ textAlign: 'left', flex: 1 }}>
                            {a.puzzleId}
                        </Typography>
                        <Typography
                            sx={{ flex: 1, textAlign: 'center' }}
                            color={a.isCorrect ? 'success.main' : 'error.main'}
                        >
                            {a.isCorrect ? a.userMove : `${a.userMove} (${a.correctMove})`}
                        </Typography>
                        <Typography
                            color='text.secondary'
                            sx={{ width: { sm: 76 }, textAlign: 'right' }}
                        >
                            {(a.responseTimeMs / 1000).toFixed(1)}s
                        </Typography>
                    </Stack>
                ))}
            </Stack>

            <Button variant='contained' size='large' onClick={onPlayAgain} sx={{ px: 6, py: 1.5 }}>
                Play Again
            </Button>
        </Container>
    );
}

/**
 * A single labeled stat row for the summary table.
 *
 * @param icon - An icon element displayed before the label.
 * @param label - The human-readable label for the stat.
 * @param value - The formatted value to display.
 */
function StatRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <Stack
            direction='row'
            justifyContent='space-between'
            alignItems='center'
            sx={{
                px: 2,
                py: 1,
                borderBottom: '1px solid',
                borderColor: 'divider',
            }}
        >
            <Stack direction='row' alignItems='center' spacing={1}>
                <Box sx={{ color: 'text.secondary', display: 'flex' }}>{icon}</Box>
                <Typography color='text.secondary'>{label}</Typography>
            </Stack>
            <Typography fontWeight='bold'>{value}</Typography>
        </Stack>
    );
}
