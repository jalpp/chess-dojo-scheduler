import { Box, Container, Stack, Typography } from '@mui/material';

import { ModuleProps } from './Module';
import PgnBoard from '../../board/pgn/PgnBoard';

const PgnViewerModule: React.FC<ModuleProps> = ({ module }) => {
    if (!module.pgn) {
        return null;
    }

    return (
        <Stack>
            <Typography variant='h6'>{module.name}</Typography>
            <Typography>{module.description}</Typography>

            <Container
                maxWidth={false}
                sx={{
                    pt: 4,
                    pb: 4,
                    px: '0 !important',
                    '--gap': '16px',
                    '--site-header-height': '80px',
                    '--site-header-margin': '60px',
                    '--player-header-height': '0px',
                    '--toc-width': '21vw',
                    '--coach-width': '400px',
                    '--tools-height': '40px',
                    '--board-width':
                        'calc(100vw - var(--coach-width) - 60px - var(--toc-width))',
                    '--board-height':
                        'calc(100vh - var(--site-header-height) - var(--site-header-margin) - var(--tools-height) - 8px - 2 * var(--player-header-height))',
                    '--board-size': 'calc(min(var(--board-width), var(--board-height)))',
                }}
            >
                <Box
                    sx={{
                        display: 'grid',
                        rowGap: '16px',
                        gridTemplateRows: {
                            xs: 'auto auto',
                        },
                        gridTemplateColumns: {
                            xs: '1fr',
                            md: 'auto var(--board-size) var(--gap) var(--coach-width) auto',
                        },
                        gridTemplateAreas: {
                            xs: '"pgn" "extras"',
                            md: '"pgn pgn pgn pgn pgn" ". extras . . ."',
                        },
                    }}
                >
                    <PgnBoard pgn={module.pgn} showPlayerHeaders={false} />
                </Box>
            </Container>
        </Stack>
    );
};

export default PgnViewerModule;