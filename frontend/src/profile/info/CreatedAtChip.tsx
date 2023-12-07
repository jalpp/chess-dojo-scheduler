import { Chip, Tooltip } from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { toDojoDateString } from '../../calendar/displayDate';
import { useAuth } from '../../auth/Auth';

interface CreatedAtChipProps {
    createdAt?: string;
}

const CreatedAtChip: React.FC<CreatedAtChipProps> = ({ createdAt }) => {
    const user = useAuth().user;

    if (!createdAt) {
        return (
            <Tooltip title='Dojo member since 1.0'>
                <Chip
                    icon={<CalendarMonthIcon fontSize='small' />}
                    label='Dojo 1.0'
                    variant='outlined'
                    color='secondary'
                />
            </Tooltip>
        );
    }

    const date = toDojoDateString(new Date(createdAt), user?.timezoneOverride);
    return (
        <Tooltip title={`Dojo member since ${date}`}>
            <Chip
                icon={<CalendarMonthIcon fontSize='small' />}
                label={date}
                variant='outlined'
                color='secondary'
            />
        </Tooltip>
    );
};

export default CreatedAtChip;
