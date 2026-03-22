'use client';

import {
    Add,
    Analytics,
    EmojiEvents,
    Flag,
    Handshake,
    SmartToy,
} from '@mui/icons-material';
import {
    Box,
    Button,
    Chip,
    Divider,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import { MaiaRating } from './maiaengine';
import {
    GameOverReason,
    GameResult,
    PlayerColor,
    UseMaiaGameResult,
} from './useMaiaGame';
import { FEN } from '@jackstenglein/chess';

// ---------------------------------------------------------------------------
// Clock display
// ---------------------------------------------------------------------------

function formatClock(ms: number | null): string {
    if (ms === null) return '∞';
    const totalSec = Math.ceil(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
}

interface ClockDisplayProps {
    ms: number | null;
    isActive: boolean;
    isLow: boolean;
    label: string;
}

function ClockDisplay({ ms, isActive, isLow, label }: ClockDisplayProps) {
    const isTimed = ms !== null;
    return (
        <Stack
            direction='row'
            alignItems='center'
            justifyContent='space-between'
            sx={{
                px: 1.5,
                py: 0.75,
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: isActive ? 'primary.main' : 'divider',
                bgcolor: isActive
                    ? isLow ? 'error.main' : 'action.selected'
                    : 'transparent',
                transition: 'all 0.2s ease',
            }}
        >
            <Typography
                variant='caption'
                color={isActive ? (isLow ? 'white' : 'text.primary') : 'text.secondary'}
                fontWeight={isActive ? 600 : 400}
            >
                {label}
            </Typography>
            <Typography
                variant='h6'
                fontFamily='monospace'
                fontWeight={700}
                color={isActive ? (isLow ? 'white' : 'text.primary') : 'text.secondary'}
                sx={{ letterSpacing: 1, lineHeight: 1 }}
            >
                {isTimed ? formatClock(ms) : '—'}
            </Typography>
        </Stack>
    );
}

// ---------------------------------------------------------------------------
// Result banner
// ---------------------------------------------------------------------------

const REASON_LABELS: Record<NonNullable<GameOverReason>, string> = {
    checkmate: 'Checkmate',
    stalemate: 'Stalemate',
    insufficient: 'Insufficient Material',
    repetition: 'Threefold Repetition',
    'fifty-move': '50-Move Rule',
    resign: 'Resignation',
    timeout: 'Time Out',
};

function ResultBanner({
    result, reason, playerColor,
}: {
    result: GameResult;
    reason: GameOverReason;
    playerColor: PlayerColor;
}) {
    if (!result) return null;
    const isDraw = result === 'draw';
    const playerWon = result === playerColor;
    const reasonLabel = reason ? REASON_LABELS[reason] : '';
    const headline = isDraw
        ? `Draw — ${reasonLabel}`
        : playerWon
            ? `You Win!${reason === 'checkmate' ? ' — Checkmate' : reason === 'timeout' ? ' — Time Out' : ''}`
            : `Maia Wins${reason === 'checkmate' ? ' — Checkmate' : reason === 'resign' ? ' — You Resigned' : reason === 'timeout' ? ' — Time Out' : ''}`;
    const color = isDraw ? 'info' : playerWon ? 'success' : 'error';
    return (
        <Stack direction='row' alignItems='center' spacing={1} sx={{
            p: 1, borderRadius: 1, bgcolor: `${color}.main`, color: 'white',
        }}>
            {isDraw ? <Handshake fontSize='small' /> : playerWon ? <EmojiEvents fontSize='small' /> : <SmartToy fontSize='small' />}
            <Typography variant='body2' fontWeight='bold'>{headline}</Typography>
        </Stack>
    );
}

// ---------------------------------------------------------------------------
// Win probability bar
// ---------------------------------------------------------------------------

function WinProbBar({ prob }: { prob: number | null }) {
    if (prob === null) return null;
    const whitePct = Math.round(prob * 100);
    return (
        <Stack spacing={0.5}>
            <Stack direction='row' justifyContent='space-between'>
                <Typography variant='caption' color='text.secondary'>Maia eval</Typography>
                <Typography variant='caption' color='text.secondary'>W {whitePct}% — B {100 - whitePct}%</Typography>
            </Stack>
            <Box sx={{ height: 5, borderRadius: 3, overflow: 'hidden', bgcolor: 'grey.800', display: 'flex' }}>
                <Box sx={{ height: '100%', width: `${whitePct}%`, bgcolor: 'grey.100', transition: 'width 0.35s ease' }} />
            </Box>
        </Stack>
    );
}

// ---------------------------------------------------------------------------
// Main controls
// ---------------------------------------------------------------------------

interface PlayBotControlsProps {
    game: UseMaiaGameResult;
    maiaRating: MaiaRating;
    onNewGame: () => void;
}

export function PlayBotControls({ game, maiaRating, onNewGame }: PlayBotControlsProps) {
    const {
        moves, playerColor, playerToMove, botThinking,
        result, reason, maiaWinProb, resign, startFen,
        clock, timeControl,
    } = game;

    const gameOver = result !== null;
    const canResign = !gameOver && moves.length >= 2;
    const isTimed = timeControl.initialMs !== null;

    // Clock perspective: opponent at top, player at bottom
    const botColor: PlayerColor = playerColor === 'white' ? 'black' : 'white';
    const botMs = botColor === 'white' ? clock.whiteMs : clock.blackMs;
    const playerMs = playerColor === 'white' ? clock.whiteMs : clock.blackMs;
    const botClockActive = clock.running === botColor && !gameOver;
    const playerClockActive = clock.running === playerColor && !gameOver;

    // "Low time" = under 30 seconds
    const LOW_TIME_MS = 30_000;
    const botLow = isTimed && botMs !== null && botMs < LOW_TIME_MS;
    const playerLow = isTimed && playerMs !== null && playerMs < LOW_TIME_MS;

    const isCustomStart = startFen && startFen !== FEN.start;
    const pgnMoves = moves.map((m, i) => (i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ${m.san}` : m.san)).join(' ');
    const pgnFull = isCustomStart ? `[SetUp "1"]\n[FEN "${startFen}"]\n\n${pgnMoves}` : pgnMoves;
    const analyzeHref = pgnMoves ? `/games/analysis?pgn=${encodeURIComponent(pgnFull)}` : '/games/analysis';

    return (
        <Stack spacing={1.5} sx={{ p: 1.5, height: '100%' }}>
            {/* Maia identity */}
            <Stack direction='row' alignItems='center' spacing={1} flexWrap='wrap' gap={0.5}>
                <SmartToy color='primary' fontSize='small' />
                <Typography variant='subtitle2' fontWeight='bold'>Maia</Typography>
                <Chip label={maiaRating} size='small' color='primary' variant='outlined' />
                {isTimed && (
                    <Chip
                        label={`${timeControl.initialMs! / 60000}+${timeControl.incrementMs / 1000}`}
                        size='small'
                        variant='outlined'
                        sx={{ fontSize: '0.7rem' }}
                    />
                )}
                <Tooltip title='Plays like a real human at this rating — not a weakened engine'>
                    <Typography variant='caption' color='text.secondary'
                        sx={{ cursor: 'help', textDecoration: 'underline dotted' }}>
                        human-like AI
                    </Typography>
                </Tooltip>
            </Stack>

            <Divider />

            {/* Opponent (bot) clock — top */}
            {isTimed && (
                <ClockDisplay
                    ms={botMs}
                    isActive={botClockActive}
                    isLow={botLow}
                    label={`Maia ${maiaRating}`}
                />
            )}

            {/* Result or status */}
            {gameOver
                ? <ResultBanner result={result} reason={reason} playerColor={playerColor} />
                : <Typography variant='caption' color='text.secondary' minHeight={18}>
                    {botThinking ? 'Maia is thinking…' : playerToMove ? 'Your move' : 'Waiting for Maia…'}
                </Typography>
            }

            {/* Win probability */}
            <WinProbBar prob={maiaWinProb} />

            <Box sx={{ flex: 1 }} />

            {/* Player clock — bottom */}
            {isTimed && (
                <ClockDisplay
                    ms={playerMs}
                    isActive={playerClockActive}
                    isLow={playerLow}
                    label='You'
                />
            )}

            <Divider />

            {/* Actions */}
            <Stack spacing={1}>
                <Button variant='contained' startIcon={<Add />} onClick={onNewGame} fullWidth size='small'>
                    New Game
                </Button>
                {!gameOver && (
                    <Button variant='outlined' color='error' startIcon={<Flag />}
                        onClick={resign} disabled={!canResign} fullWidth size='small'>
                        Resign
                    </Button>
                )}
                {gameOver && moves.length > 0 && (
                    <Button variant='outlined' startIcon={<Analytics />}
                        href={analyzeHref} component='a' fullWidth size='small'>
                        Analyze Game
                    </Button>
                )}
            </Stack>
        </Stack>
    );
}