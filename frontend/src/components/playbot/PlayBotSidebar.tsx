'use client';

/**
 * PlayBotSidebar
 *
 * Right-hand panel for the Maia play-bot feature.
 * Shows:
 *   - Maia identity chip
 *   - Game result banner
 *   - Move pair list (auto-scrolls to latest)
 *   - Win probability bar (from last Maia eval)
 *   - Action buttons: New Game / Resign / Analyze
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
    Paper,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import { useEffect, useRef } from 'react';
import { MaiaRating } from './maiaengine';
import {
    GameOverReason,
    GameResult,
    MoveRecord,
    PlayerColor,
    UsePlayBotGameResult,
} from './playbot';


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

    const color = isDraw ? 'default' : playerWon ? 'success' : 'error';

    return (
        <Paper
            variant='outlined'
            sx={{
                p: 1.5,
                textAlign: 'center',
                borderColor: `${color}.main`,
                bgcolor: isDraw ? 'action.selected' : `${color}.main`,
            }}
        >
            <Stack direction='row' alignItems='center' justifyContent='center' spacing={1}>
                {isDraw ? (
                    <Handshake fontSize='small' />
                ) : playerWon ? (
                    <EmojiEvents fontSize='small' />
                ) : (
                    <SmartToy fontSize='small' />
                )}
                <Typography
                    variant='body2'
                    fontWeight='bold'
                    color={isDraw ? 'text.primary' : 'white'}
                >
                    {headline}
                </Typography>
            </Stack>
        </Paper>
    );
}


function MoveList({ moves }: { moves: MoveRecord[] }) {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [moves.length]);

    if (moves.length === 0) {
        return (
            <Typography
                variant='body2'
                color='text.disabled'
                textAlign='center'
                py={3}
                sx={{ userSelect: 'none' }}
            >
                No moves yet
            </Typography>
        );
    }

    // Build move pairs: [white, black]
    const pairs: { num: number; white?: MoveRecord; black?: MoveRecord }[] = [];
    for (let i = 0; i < moves.length; i += 2) {
        pairs.push({ num: Math.floor(i / 2) + 1, white: moves[i], black: moves[i + 1] });
    }

    return (
        <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {pairs.map((pair) => (
                <Stack
                    key={pair.num}
                    direction='row'
                    spacing={1}
                    alignItems='center'
                    sx={{
                        px: 0.5,
                        py: 0.2,
                        borderRadius: 1,
                        '&:hover': { bgcolor: 'action.hover' },
                    }}
                >
                    <Typography
                        variant='caption'
                        color='text.disabled'
                        sx={{ minWidth: 22, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                    >
                        {pair.num}.
                    </Typography>
                    <Typography
                        variant='body2'
                        sx={{ minWidth: 56, fontFamily: 'monospace', fontSize: '0.8rem' }}
                    >
                        {pair.white?.san ?? ''}
                    </Typography>
                    <Typography
                        variant='body2'
                        sx={{ minWidth: 56, fontFamily: 'monospace', fontSize: '0.8rem' }}
                    >
                        {pair.black?.san ?? ''}
                    </Typography>
                </Stack>
            ))}
            <div ref={bottomRef} />
        </Box>
    );
}

// ---------------------------------------------------------------------------
// Main sidebar
// ---------------------------------------------------------------------------

interface PlayBotSidebarProps {
    game: UsePlayBotGameResult;
    maiaRating: MaiaRating;
    onNewGame: () => void;
}

export function PlayBotSidebar({ game, maiaRating, onNewGame }: PlayBotSidebarProps) {
    const { moves, playerColor, playerToMove, botThinking, result, reason, resign } =
        game;

    const gameOver = result !== null;
    const canResign = !gameOver && moves.length >= 2;

    // Build a minimal PGN for the analyze link
    const pgnMoves = moves
        .map((m, i) => (i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ${m.san}` : m.san))
        .join(' ');
    const analyzeHref = pgnMoves
        ? `/games/analysis?pgn=${encodeURIComponent(pgnMoves)}`
        : '/games/analysis';

    return (
        <Stack spacing={2} height='100%' minHeight={0}>
            {/* Bot header */}
            <Stack direction='row' alignItems='center' spacing={1} flexWrap='wrap' gap={0.5}>
                <SmartToy color='primary' />
                <Typography variant='subtitle1' fontWeight='bold'>
                    Maia
                </Typography>
                <Chip label={maiaRating} size='small' color='primary' variant='outlined' />
                <Tooltip title='Plays like a real human at this rating — not a weakened engine'>
                    <Typography
                        variant='caption'
                        color='text.secondary'
                        sx={{ cursor: 'help', textDecoration: 'underline dotted' }}
                    >
                        human-like AI
                    </Typography>
                </Tooltip>
            </Stack>

            <Divider />

            {/* Result or status */}
            {gameOver ? (
                <ResultBanner result={result} reason={reason} playerColor={playerColor} />
            ) : (
                <Typography variant='caption' color='text.secondary' minHeight={20}>
                    {botThinking
                        ? 'Maia is thinking…'
                        : playerToMove
                            ? 'Your move'
                            : 'Waiting for Maia…'}
                </Typography>
            )}



            <MoveList moves={moves} />

            <Divider />

            {/* Actions */}
            <Stack spacing={1}>
                <Button variant='contained' startIcon={<Add />} onClick={onNewGame} fullWidth>
                    New Game
                </Button>

                {!gameOver && (
                    <Button
                        variant='outlined'
                        color='error'
                        startIcon={<Flag />}
                        onClick={resign}
                        disabled={!canResign}
                        fullWidth
                    >
                        Resign
                    </Button>
                )}

                {gameOver && moves.length > 0 && (
                    <Button
                        variant='outlined'
                        startIcon={<Analytics />}
                        href={analyzeHref}
                        component='a'
                        fullWidth
                    >
                        Analyze Game
                    </Button>
                )}
            </Stack>
        </Stack>
    );
}