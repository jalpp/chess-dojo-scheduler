'use client';

/**
 * PlayBotControls
 *
 * Renders inside the left underboard panel during an active game.
 * Shows: Maia identity, win-prob bar, game status, action buttons.
 * Compact — designed for the ~260px underboard panel width.
 */

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
// Result banner
// ---------------------------------------------------------------------------

const REASON_LABELS: Record<NonNullable<GameOverReason>, string> = {
    checkmate: 'Checkmate',
    stalemate: 'Stalemate',
    insufficient: 'Insufficient Material',
    repetition: 'Threefold Repetition',
    'fifty-move': '50-Move Rule',
    resign: 'Resignation',
};

function ResultBanner({
    result,
    reason,
    playerColor,
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
            ? `You Win!${reason === 'checkmate' ? ' — Checkmate' : ''}`
            : `Maia Wins${reason === 'checkmate' ? ' — Checkmate' : reason === 'resign' ? ' — You Resigned' : ''}`;

    const color = isDraw ? 'info' : playerWon ? 'success' : 'error';

    return (
        <Stack
            direction='row'
            alignItems='center'
            spacing={1}
            sx={{
                p: 1,
                borderRadius: 1,
                bgcolor: `${color}.main`,
                color: 'white',
            }}
        >
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
                <Typography variant='caption' color='text.secondary'>
                    W {whitePct}% — B {100 - whitePct}%
                </Typography>
            </Stack>
            <Box sx={{ height: 5, borderRadius: 3, overflow: 'hidden', bgcolor: 'grey.800', display: 'flex' }}>
                <Box sx={{
                    height: '100%',
                    width: `${whitePct}%`,
                    bgcolor: 'grey.100',
                    transition: 'width 0.35s ease',
                }} />
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
    const { moves, playerColor, playerToMove, botThinking, result, reason, maiaWinProb, resign, startFen } = game;

    const gameOver = result !== null;
    const canResign = !gameOver && moves.length >= 2;

    const isCustomStart = startFen && startFen !== FEN.start;
    const pgnMoves = moves.map((m, i) => (i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ${m.san}` : m.san)).join(' ');
    const pgnFull = isCustomStart ? `[SetUp "1"]\n[FEN "${startFen}"]\n\n${pgnMoves}` : pgnMoves;
    const analyzeHref = pgnMoves ? `/games/analysis?pgn=${encodeURIComponent(pgnFull)}` : '/games/analysis';

    return (
        <Stack spacing={2} sx={{ p: 1.5, height: '100%' }}>
            {/* Maia identity */}
            <Stack direction='row' alignItems='center' spacing={1} flexWrap='wrap' gap={0.5}>
                <SmartToy color='primary' fontSize='small' />
                <Typography variant='subtitle2' fontWeight='bold'>Maia</Typography>
                <Chip label={maiaRating} size='small' color='primary' variant='outlined' />
                <Tooltip title='Plays like a real human at this rating — not a weakened engine'>
                    <Typography variant='caption' color='text.secondary'
                        sx={{ cursor: 'help', textDecoration: 'underline dotted' }}>
                        human-like AI
                    </Typography>
                </Tooltip>
            </Stack>

            <Divider />

            {/* Result banner or status */}
            {gameOver
                ? <ResultBanner result={result} reason={reason} playerColor={playerColor} />
                : <Typography variant='caption' color='text.secondary' minHeight={18}>
                    {botThinking ? 'Maia is thinking…' : playerToMove ? 'Your move' : 'Waiting for Maia…'}
                </Typography>
            }

            {/* Win probability */}
            <WinProbBar prob={maiaWinProb} />

            <Box sx={{ flex: 1 }} />

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

            {/* Attribution */}
            <Typography variant='caption' color='text.disabled' textAlign='center'>
                Maia by{' '}
                <a href='https://csslab.cs.toronto.edu' target='_blank' rel='noopener noreferrer' style={{ color: 'inherit' }}>
                    U of T CSS Lab
                </a>
            </Typography>
        </Stack>
    );
}