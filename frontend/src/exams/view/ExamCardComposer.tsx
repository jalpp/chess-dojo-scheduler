import { Card, CardContent, Stack, Typography } from '@mui/material';
import Grid2 from '@mui/material/Unstable_Grid2/Grid2';
import { KingIcon, QueenIcon, RookIcon, KnightIcon} from '../../style/ChessIcons';
import { ExamCard } from './ExamCard';
import { ExamType } from '../../database/exam';


export const ExamCardComposer = () => {
    return (
        <Card variant='outlined'>
            <CardContent>
                <Stack
                    direction='column'
                    mb={2}
                    spacing={3}
                    justifyContent='center'
                    alignItems='center'
                >
                    <Typography
                        variant='h6'
                        align='center'
                        sx={{
                            fontWeight: 'bold',
                        }}
                    >
                        Attempt Test
                    </Typography>
                </Stack>
                <Grid2 container rowSpacing={2} columnSpacing={2} md={18} >
                    <ExamCard
                        name='Tactics Tests'
                        description='All Ratings'
                        href='/tests/tactics'
                        icon={QueenIcon}
                        colorType={ExamType.Tactics}
                    />

                    <ExamCard
                        name='Endgame Tests'
                        description='All Ratings'
                        href='/tests/endgame'
                        icon={RookIcon}
                        colorType={ExamType.Endgame}
                    />
                </Grid2>
                <Grid2 container rowSpacing={2} columnSpacing={2} md={18}>
                    <ExamCard
                        name='Checkmate Tests'
                        description='All Ratings'
                        href='/tests/checkmate'
                        icon={KingIcon}
                        colorType={ExamType.Polgar}
                    />

                    <ExamCard
                        name='Positional Tests'
                        description='Coming soon'
                        href='/tests/'
                        disabled={true}
                        icon={KnightIcon}
                        colorType={ExamType.Positional}
                        
                    />
                </Grid2>
            </CardContent>
        </Card>
    );
};
