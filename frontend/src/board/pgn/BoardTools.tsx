import { CopyToClipboard } from 'react-copy-to-clipboard';
import { useCallback, useEffect, useState } from 'react';
import { Move } from '@jackstenglein/chess';
import { Stack, Tooltip, IconButton, Paper, Box } from '@mui/material';
import FlipIcon from '@mui/icons-material/WifiProtectedSetup';
import FirstPageIcon from '@mui/icons-material/FirstPage';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LastPageIcon from '@mui/icons-material/LastPage';
import LinkIcon from '@mui/icons-material/Link';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import CheckIcon from '@mui/icons-material/Check';
import SellIcon from '@mui/icons-material/Sell';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';

import DeleteGameButton from '../../games/view/DeleteGameButton';
import { Game } from '../../database/game';
import { useChess } from './PgnBoard';
import { Color } from 'chessground/types';
import PlayerHeader from './PlayerHeader';
import Tags from './Tags';
import Editor from './Editor';
import { RequestSnackbar, useRequest } from '../../api/Request';
import { useApi } from '../../api/Api';
import { EventType, trackEvent } from '../../analytics/events';

interface BoardToolsProps {
    pgn: string;
    showPlayerHeaders: boolean;

    startOrientation?: Color;

    onClickMove: (move: Move | null) => void;

    showSave?: boolean;
    showDelete?: boolean;
    game?: Game;

    showTags?: boolean;
    showEditor?: boolean;
}

const BoardTools: React.FC<BoardToolsProps> = ({
    pgn,
    showPlayerHeaders,

    startOrientation,
    onClickMove,

    showSave,
    showDelete,
    game,

    showTags,
    showEditor,
}) => {
    const { chess, board } = useChess();
    const [copied, setCopied] = useState('');
    const [, setOrientation] = useState<Color>(startOrientation || 'white');
    const [underboard, setUnderboard] = useState('');
    const request = useRequest();
    const api = useApi();

    const toggleOrientation = useCallback(() => {
        if (board) {
            board.toggleOrientation();
            setOrientation(board.state.orientation);
        }
    }, [board, setOrientation]);

    useEffect(() => {
        const onArrowKeys = (event: KeyboardEvent) => {
            if (event.key === 'f') {
                toggleOrientation();
            }
        };
        window.addEventListener('keyup', onArrowKeys);
        return () => {
            window.removeEventListener('keyup', onArrowKeys);
        };
    }, [toggleOrientation]);

    const onCopy = (name: string) => {
        setCopied(name);
        setTimeout(() => {
            setCopied('');
        }, 2500);
    };

    const onFirstMove = () => {
        onClickMove(null);
    };

    const onPreviousMove = () => {
        if (chess) {
            onClickMove(chess.previousMove());
        }
    };

    const onNextMove = () => {
        if (chess) {
            const nextMove = chess.nextMove();
            if (nextMove) {
                onClickMove(nextMove);
            }
        }
    };

    const onLastMove = () => {
        if (chess) {
            onClickMove(chess.lastMove());
        }
    };

    const onSave = useCallback(() => {
        if (!game || !chess) {
            return;
        }

        request.onStart();
        api.updateGame(game.cohort, game.id, {
            type: 'manual',
            pgnText: chess.renderPgn(),
            orientation: game.orientation || 'white',
        })
            .then(() => {
                trackEvent(EventType.UpdateGame, {
                    method: 'manual',
                    dojo_cohort: game.cohort,
                });
                request.onSuccess('Game updated');
            })
            .catch((err) => {
                console.error('updateGame: ', err);
                request.onFailure(err);
            });
    }, [chess, api, game, request]);

    return (
        <>
            {showPlayerHeaders && (
                <>
                    <PlayerHeader type='header' pgn={chess?.pgn} />
                    <PlayerHeader type='footer' pgn={chess?.pgn} />
                </>
            )}

            <Paper
                elevation={3}
                sx={{ mt: 1, gridArea: 'boardButtons', boxShadow: 'none' }}
            >
                <Stack direction='row' justifyContent='space-between' flexWrap='wrap'>
                    <Stack direction='row'>
                        <CopyToClipboard
                            text={window.location.href}
                            onCopy={() => onCopy('link')}
                        >
                            <Tooltip title='Copy URL'>
                                <IconButton aria-label='copy-url'>
                                    {copied === 'link' ? (
                                        <CheckIcon sx={{ color: 'text.secondary' }} />
                                    ) : (
                                        <LinkIcon sx={{ color: 'text.secondary' }} />
                                    )}
                                </IconButton>
                            </Tooltip>
                        </CopyToClipboard>

                        <CopyToClipboard text={pgn} onCopy={() => onCopy('pgn')}>
                            <Tooltip title='Copy PGN'>
                                <IconButton aria-label='copy-pgn'>
                                    {copied === 'pgn' ? (
                                        <CheckIcon sx={{ color: 'text.secondary' }} />
                                    ) : (
                                        <ContentPasteIcon
                                            sx={{ color: 'text.secondary' }}
                                        />
                                    )}
                                </IconButton>
                            </Tooltip>
                        </CopyToClipboard>

                        {showSave && (
                            <Tooltip title='Save PGN'>
                                <IconButton onClick={onSave}>
                                    <SaveIcon sx={{ color: 'text.secondary' }} />
                                </IconButton>
                            </Tooltip>
                        )}

                        {showDelete && game && <DeleteGameButton game={game} />}
                    </Stack>

                    <Stack direction='row'>
                        <Tooltip title='First Move'>
                            <IconButton aria-label='first move' onClick={onFirstMove}>
                                <FirstPageIcon sx={{ color: 'text.secondary' }} />
                            </IconButton>
                        </Tooltip>

                        <Tooltip title='Previous Move'>
                            <IconButton
                                aria-label='previous move'
                                onClick={onPreviousMove}
                            >
                                <ChevronLeftIcon sx={{ color: 'text.secondary' }} />
                            </IconButton>
                        </Tooltip>

                        <Tooltip title='Next Move'>
                            <IconButton aria-label='next move' onClick={onNextMove}>
                                <ChevronRightIcon sx={{ color: 'text.secondary' }} />
                            </IconButton>
                        </Tooltip>

                        <Tooltip title='Last Move'>
                            <IconButton aria-label='last move' onClick={onLastMove}>
                                <LastPageIcon sx={{ color: 'text.secondary' }} />
                            </IconButton>
                        </Tooltip>

                        <Tooltip title='Flip Board'>
                            <IconButton
                                aria-label='flip board'
                                onClick={toggleOrientation}
                            >
                                <FlipIcon sx={{ color: 'text.secondary' }} />
                            </IconButton>
                        </Tooltip>
                    </Stack>

                    <Stack direction='row'>
                        {showTags && setUnderboard && (
                            <Tooltip title='PGN Tags'>
                                <IconButton
                                    aria-label='pgn-tags'
                                    sx={{
                                        color:
                                            underboard === 'tags'
                                                ? 'info.main'
                                                : 'text.secondary',
                                    }}
                                    onClick={() =>
                                        setUnderboard(underboard === 'tags' ? '' : 'tags')
                                    }
                                >
                                    <SellIcon />
                                </IconButton>
                            </Tooltip>
                        )}

                        {showEditor && setUnderboard && (
                            <Tooltip title='Edit PGN'>
                                <IconButton
                                    aria-label='edit-pgn'
                                    sx={{
                                        color:
                                            underboard === 'editor'
                                                ? 'info.main'
                                                : 'text.secondary',
                                    }}
                                    onClick={() =>
                                        setUnderboard(
                                            underboard === 'editor' ? '' : 'editor'
                                        )
                                    }
                                >
                                    <EditIcon />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Stack>
                </Stack>
            </Paper>

            {underboard && (
                <Box gridArea='underboard' mt={2}>
                    {underboard === 'tags' && (
                        <Tags tags={chess?.pgn.header.tags} game={game} />
                    )}
                    {underboard === 'editor' && <Editor />}
                </Box>
            )}

            <RequestSnackbar request={request} showSuccess />
        </>
    );
};

export default BoardTools;
