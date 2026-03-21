'use client';

/**
 * MaiaDownloadModal
 *
 * Shown when the Maia ONNX model is not yet cached in IndexedDB.
 * The model is ~90 MB and must be downloaded once before the bot can play.
 * After download it is stored in IndexedDB so subsequent visits are instant.
 */

import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    LinearProgress,
    Stack,
    Typography,
} from '@mui/material';
import { Download, SmartToy } from '@mui/icons-material';
import { MaiaStatus } from './useMaiaEngine';

interface MaiaDownloadModalProps {
    open: boolean;
    status: MaiaStatus;
    progress: number;
    error: string | null;
    onDownload: () => void;
}

export function MaiaDownloadModal({
    open,
    status,
    progress,
    error,
    onDownload,
}: MaiaDownloadModalProps) {
    const isDownloading = status === 'downloading';
    const isLoading = status === 'loading' || status === 'idle';

    return (
        <Dialog open={open} maxWidth='sm' fullWidth>
            <DialogTitle>
                <Stack direction='row' alignItems='center' spacing={1}>
                    <SmartToy color='primary' />
                    <span>Maia Chess Engine</span>
                </Stack>
            </DialogTitle>
            <DialogContent>
                <Stack spacing={3} py={1}>
                    {isLoading ? (
                        <Stack alignItems='center' spacing={2} py={2}>
                            <CircularProgress />
                            <Typography color='text.secondary'>
                                Checking for cached model…
                            </Typography>
                        </Stack>
                    ) : isDownloading ? (
                        <Stack spacing={2}>
                            <Typography>
                                Downloading Maia neural network… This happens once and is then
                                cached in your browser.
                            </Typography>
                            <Box>
                                <LinearProgress
                                    variant='determinate'
                                    value={progress}
                                    sx={{ height: 8, borderRadius: 4 }}
                                />
                                <Typography
                                    variant='caption'
                                    color='text.secondary'
                                    mt={0.5}
                                    display='block'
                                    textAlign='right'
                                >
                                    {progress}%
                                </Typography>
                            </Box>
                        </Stack>
                    ) : error ? (
                        <Stack spacing={2}>
                            <Typography color='error'>
                                Failed to load Maia: {error}
                            </Typography>
                            <Button
                                variant='contained'
                                startIcon={<Download />}
                                onClick={onDownload}
                            >
                                Retry Download
                            </Button>
                        </Stack>
                    ) : (
                        <Stack spacing={2}>
                            <Typography>
                                <strong>Maia</strong> is a human-like chess AI developed by the
                                University of Toronto. It predicts the moves real players make at
                                each rating level, making it a uniquely challenging and instructive
                                sparring partner.
                            </Typography>
                            <Typography color='text.secondary' variant='body2'>
                                The neural network model (~90 MB) needs to be downloaded once.
                                It runs entirely in your browser — no server required.
                            </Typography>
                            <Button
                                variant='contained'
                                size='large'
                                startIcon={<Download />}
                                onClick={onDownload}
                                sx={{ alignSelf: 'flex-start' }}
                            >
                                Download Maia (~90 MB)
                            </Button>
                        </Stack>
                    )}
                </Stack>
            </DialogContent>
        </Dialog>
    );
}