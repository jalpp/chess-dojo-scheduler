import { Container, Stack, Typography } from '@mui/material';
import { useRequiredAuth } from '../auth/Auth';
import TacticsScoreCard from '../profile/stats/TacticsScoreCard';
import ExamGraphComposer from './list/ExamGraphComposer';
import { ExamCardComposer } from './view/ExamCardComposer';

/**
 * Renders a simple landing page that directs users to the different types of exams
 * (tactics, polgar, endgame, etc).
 */
export const ExamLandingPage = () => {
    const auth = useRequiredAuth();
    const user = auth.user;

    return (
        <Container maxWidth='lg' sx={{ py: 5 }}>
            <Stack spacing={3}>
                <Typography variant='h4' align='center'>
                    ChessDojo Tactics Tests
                </Typography>
                <Typography>
                    Welcome to ChessDojo tactics test, a place to view your tactical
                    ratings, your tactical history graph and to start new tactics test
                </Typography>
            </Stack>
            <Stack spacing={3}>
                <TacticsScoreCard user={user} />

                <ExamGraphComposer user={user} width={700} height={500} />

                <ExamCardComposer />
            </Stack>
        </Container>
    );
};
