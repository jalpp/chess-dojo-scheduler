import { useState } from 'react';
import {
    Typography,
    Stack,
    Checkbox,
    Divider,
    IconButton,
    Grid,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    DialogContentText,
    TextField,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import EditIcon from '@mui/icons-material/Edit';

import {
    Requirement,
    RequirementProgress,
    ScoreboardDisplay,
} from '../database/requirement';
import ScoreboardProgress from '../scoreboard/ScoreboardProgress';
import { ALL_COHORTS } from '../database/user';
import { useApi } from '../api/Api';
import { useRequest } from '../api/Request';
import InputSlider from './InputSlider';

const NUMBER_REGEX = /^[0-9]*$/;

interface UpdateDialogProps {
    open: boolean;
    onClose: () => void;
    requirement: Requirement;
    cohort: string;
    totalCount: number;
    currentCount: number;
}

const UpdateDialog: React.FC<UpdateDialogProps> = ({
    open,
    onClose,
    requirement,
    cohort,
    totalCount,
    currentCount,
}) => {
    const api = useApi();
    const [value, setValue] = useState<number>(currentCount);
    const [hours, setHours] = useState('');
    const [minutes, setMinutes] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const request = useRequest();

    const isSlider =
        requirement.scoreboardDisplay === ScoreboardDisplay.ProgressBar ||
        requirement.scoreboardDisplay === ScoreboardDisplay.Unspecified;

    const onSubmit = () => {
        let hoursInt = 0;
        let minutesInt = 0;
        const errors: Record<string, string> = {};
        if (hours !== '') {
            if (NUMBER_REGEX.test(hours)) {
                hoursInt = parseInt(hours);
            } else {
                errors.hours = 'Only numeric characters are accepted';
            }
        }
        if (minutes !== '') {
            if (NUMBER_REGEX.test(minutes)) {
                minutesInt = parseInt(minutes);
            } else {
                errors.minutes = 'Only numeric characters are accepted';
            }
        }
        setErrors(errors);

        if (Object.keys(errors).length > 0) {
            return;
        }

        const updatedValue = isSlider ? value - currentCount : totalCount;

        request.onStart();
        api.updateUserProgress(
            cohort,
            requirement.id,
            updatedValue,
            hoursInt * 60 + minutesInt
        )
            .then((response) => {
                console.log('updateUserProgress: ', response);
                onClose();
                setHours('');
                setMinutes('');
                request.reset();
            })
            .catch((err) => {
                console.error('updateUserProgress: ', err);
            });
    };

    return (
        <Dialog open={open} onClose={request.isLoading() ? undefined : onClose}>
            <DialogTitle>Update {requirement.name}?</DialogTitle>
            <DialogContent>
                <Stack spacing={2}>
                    {isSlider && (
                        <InputSlider value={value} setValue={setValue} max={totalCount} />
                    )}
                    <DialogContentText>
                        Optionally add how long it took to{' '}
                        {isSlider ? 'update' : 'complete'} this requirement in order for
                        it to be added to your activity breakdown.
                    </DialogContentText>
                    <Grid container width={1}>
                        <Grid item xs={12} sm>
                            <TextField
                                label='Hours'
                                value={hours}
                                inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                onChange={(event) => setHours(event.target.value)}
                                error={!!errors.hours}
                                helperText={errors.hours}
                                fullWidth
                            />
                        </Grid>
                        <Grid item xs={12} sm pl={{ sm: 2 }} pt={{ xs: 2, sm: 0 }}>
                            <TextField
                                label='Minutes'
                                value={minutes}
                                inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                onChange={(event) => setMinutes(event.target.value)}
                                error={!!errors.minutes}
                                helperText={errors.minutes}
                                fullWidth
                            />
                        </Grid>
                    </Grid>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={request.isLoading()}>
                    Cancel
                </Button>
                <LoadingButton
                    loading={request.isLoading()}
                    onClick={onSubmit}
                    disabled={isSlider ? value === currentCount : false}
                >
                    {isSlider ? 'Update' : 'Complete'}
                </LoadingButton>
            </DialogActions>
        </Dialog>
    );
};

interface ProgressItemProps {
    progress?: RequirementProgress;
    requirement: Requirement;
    cohort: string;
}

const DESCRIPTION_MAX_LENGTH = 90;

const ProgressItem: React.FC<ProgressItemProps> = ({ progress, requirement, cohort }) => {
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const totalCount = requirement.counts[cohort] || requirement.counts[ALL_COHORTS];
    const currentCount = progress?.counts[cohort] || progress?.counts[ALL_COHORTS] || 0;

    let DescriptionElement = null;
    let UpdateElement = null;

    switch (requirement.scoreboardDisplay) {
        case ScoreboardDisplay.Hidden:
        case ScoreboardDisplay.Checkbox:
            UpdateElement = (
                <Checkbox
                    aria-label={`Checkbox ${requirement.name}`}
                    checked={currentCount >= totalCount}
                    onClick={() => setShowUpdateModal(true)}
                    disabled={currentCount >= totalCount}
                />
            );
            break;

        case ScoreboardDisplay.ProgressBar:
        case ScoreboardDisplay.Unspecified:
            DescriptionElement = (
                <ScoreboardProgress value={currentCount} max={totalCount} min={0} />
            );
            UpdateElement =
                currentCount >= totalCount ? (
                    <Checkbox checked disabled />
                ) : (
                    <IconButton
                        aria-label={`Update ${requirement.name}`}
                        onClick={() => setShowUpdateModal(true)}
                    >
                        <EditIcon />
                    </IconButton>
                );
            break;
    }

    return (
        <Stack spacing={2} mt={2}>
            <UpdateDialog
                open={showUpdateModal}
                onClose={() => setShowUpdateModal(false)}
                requirement={requirement}
                cohort={cohort}
                totalCount={totalCount}
                currentCount={currentCount}
            />
            <Grid
                container
                columnGap={0.5}
                alignItems='center'
                justifyContent='space-between'
            >
                <Grid item xs={9} xl={10}>
                    <Typography>{requirement.name}</Typography>
                    <Typography color='text.secondary'>
                        {`${requirement.description.substring(
                            0,
                            DESCRIPTION_MAX_LENGTH
                        )}${
                            requirement.description.length > DESCRIPTION_MAX_LENGTH
                                ? '...'
                                : ''
                        }`}
                    </Typography>
                    {DescriptionElement}
                </Grid>
                <Grid item xs={2} xl={1}>
                    <Stack direction='row' alignItems='center' justifyContent='end'>
                        {UpdateElement}
                        <IconButton aria-label={`Info ${requirement.name}`}>
                            <InfoOutlinedIcon sx={{ color: 'text.secondary' }} />
                        </IconButton>
                    </Stack>
                </Grid>
            </Grid>
            <Divider />
        </Stack>
    );
};

export default ProgressItem;