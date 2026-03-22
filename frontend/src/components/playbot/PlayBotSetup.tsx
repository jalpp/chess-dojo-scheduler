'use client';

/**
 * PlayBotSetup
 *
 * Inline setup panel shown in the sidebar before the game starts.
 * Compact — designed to sit alongside the board at all times.
 * Includes optional custom FEN input.
 */

import { MAIA_RATINGS, MaiaRating } from './maiaengine';
import { PlayerColor } from './useMaiaGame';
import {
    Alert,
    Box,
    Button,
    Chip,
    Collapse,
    Divider,
    FormControl,
    MenuItem,
    Select,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from '@mui/material';
import { PlayArrow, SmartToy, ExpandMore, ExpandLess } from '@mui/icons-material';
import { useState } from 'react';
import { Chess, FEN } from '@jackstenglein/chess';

type ColorChoice = PlayerColor | 'random';

export interface PlayBotStartOpts {
    playerColor: PlayerColor;
    maiaRating: MaiaRating;
    startFen: string;
}

interface PlayBotSetupProps {
    onStart: (opts: PlayBotStartOpts) => void;
    initialRating?: MaiaRating;
}

const RATING_DESCRIPTIONS: Record<MaiaRating, string> = {
    1100: 'Very Beginner',
    1200: 'Beginner',
    1300: 'Casual',
    1400: 'Intermediate',
    1500: 'Club Player',
    1600: 'Strong Club',
    1700: 'Tournament',
    1800: 'Expert',
    1900: 'Master Level',
};

function isValidFen(fen: string): boolean {
    try {
        new Chess({ fen });
        return true;
    } catch {
        return false;
    }
}

export function PlayBotSetup({ onStart, initialRating = 1500 }: PlayBotSetupProps) {
    const [colorChoice, setColorChoice] = useState<ColorChoice>('white');
    const [maiaRating, setMaiaRating] = useState<MaiaRating>(initialRating);
    const [showFen, setShowFen] = useState(false);
    const [fenInput, setFenInput] = useState('');
    const [fenError, setFenError] = useState('');

    const handleFenChange = (val: string) => {
        setFenInput(val);
        if (val.trim() && !isValidFen(val.trim())) {
            setFenError('Invalid FEN position');
        } else {
            setFenError('');
        }
    };

    const handleStart = () => {
        // Resolve color
        const playerColor: PlayerColor =
            colorChoice === 'random'
                ? Math.random() < 0.5 ? 'white' : 'black'
                : colorChoice;

        // Resolve start FEN
        const trimmed = fenInput.trim();
        if (trimmed && !isValidFen(trimmed)) {
            setFenError('Invalid FEN position');
            return;
        }
        const startFen = trimmed || FEN.start;

        onStart({ playerColor, maiaRating, startFen });
    };

    return (
        <Stack spacing={2.5}>
            {/* Rating picker */}
            <Stack spacing={0.75}>
                <Typography variant='subtitle2' fontWeight='bold' color='text.secondary'>
                    MAIA RATING
                </Typography>
                <FormControl size='small' fullWidth>
                    <Select
                        value={maiaRating}
                        onChange={(e) => setMaiaRating(Number(e.target.value) as MaiaRating)}
                    >
                        {MAIA_RATINGS.map((r) => (
                            <MenuItem key={r} value={r}>
                                <Stack direction='row' alignItems='center' spacing={1.5}>
                                    <Chip label={r} size='small' color='primary' sx={{ minWidth: 48 }} />
                                    <Typography variant='body2'>{RATING_DESCRIPTIONS[r]}</Typography>
                                </Stack>
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Stack>

            <Divider />

            {/* Color picker */}
            <Stack spacing={0.75}>
                <Typography variant='subtitle2' fontWeight='bold' color='text.secondary'>
                    PLAY AS
                </Typography>
                <ToggleButtonGroup
                    value={colorChoice}
                    exclusive
                    onChange={(_, v) => { if (v) setColorChoice(v); }}
                    size='small'
                    fullWidth
                >
                    <Tooltip title='Play with the White pieces'>
                        <ToggleButton value='white' sx={{ gap: 0.75, flex: 1 }}>
                            <Box sx={{
                                width: 14, height: 14, borderRadius: '50%',
                                bgcolor: 'white', border: '1.5px solid', borderColor: 'divider', flexShrink: 0,
                            }} />
                            White
                        </ToggleButton>
                    </Tooltip>
                    <Tooltip title='Play with the Black pieces'>
                        <ToggleButton value='black' sx={{ gap: 0.75, flex: 1 }}>
                            <Box sx={{
                                width: 14, height: 14, borderRadius: '50%',
                                bgcolor: 'grey.700', border: '1.5px solid', borderColor: 'divider', flexShrink: 0,
                            }} />
                            Black
                        </ToggleButton>
                    </Tooltip>
                    <ToggleButton value='random' sx={{ flex: 1 }}>Random</ToggleButton>
                </ToggleButtonGroup>
            </Stack>

            <Divider />

            {/* Custom FEN (collapsible) */}
            <Stack spacing={0.75}>
                <Button
                    size='small'
                    variant='text'
                    color='inherit'
                    onClick={() => setShowFen((v) => !v)}
                    endIcon={showFen ? <ExpandLess /> : <ExpandMore />}
                    sx={{ alignSelf: 'flex-start', px: 0, color: 'text.secondary', textTransform: 'none' }}
                >
                    <Typography variant='subtitle2' fontWeight='bold'>
                        CUSTOM POSITION (FEN)
                    </Typography>
                </Button>
                <Collapse in={showFen}>
                    <Stack spacing={1}>
                        <TextField
                            size='small'
                            fullWidth
                            placeholder='Paste FEN string…'
                            value={fenInput}
                            onChange={(e) => handleFenChange(e.target.value)}
                            error={!!fenError}
                            helperText={fenError || 'Leave blank to start from the initial position'}
                            inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.75rem' } }}
                        />
                        {fenInput.trim() && !fenError && (
                            <Alert severity='success' sx={{ py: 0 }}>
                                Valid position — game will start from this FEN
                            </Alert>
                        )}
                        {fenInput.trim() && (
                            <Button
                                size='small'
                                variant='text'
                                color='inherit'
                                onClick={() => { setFenInput(''); setFenError(''); }}
                                sx={{ alignSelf: 'flex-start', px: 0, color: 'text.secondary' }}
                            >
                                Clear
                            </Button>
                        )}
                    </Stack>
                </Collapse>
            </Stack>

            <Divider />

            {/* Start button */}
            <Button
                variant='contained'
                size='large'
                startIcon={<PlayArrow />}
                onClick={handleStart}
                disabled={!!fenError}
                fullWidth
            >
                Play vs Maia {maiaRating}
            </Button>
        </Stack>
    );
}