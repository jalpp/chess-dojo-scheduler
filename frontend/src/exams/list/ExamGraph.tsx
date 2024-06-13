import { LineChart } from '@mui/x-charts/LineChart';
import * as React from 'react';

interface ExamVals {
    polgarData: number[];
    tacData: number[];
    endgameData: number[];
    xLabels: string[];
    width: number;
    height: number;
}

const ExamGraph: React.FC<ExamVals> = ({
    polgarData,
    tacData,
    endgameData,
    xLabels,
    width,
    height,
}) => {
    return (
        <LineChart
            width={width}
            height={height}
            series={[
                { data: polgarData, label: 'Checkmate' },
                { data: tacData, label: 'Tactics' },
                { data: endgameData, label: 'Endgame' },
            ]}
            xAxis={[{ scaleType: 'point', data: xLabels }]}
        />
    );
};

export default ExamGraph;
