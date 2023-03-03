export enum GameResult {
    White = '1-0',
    Black = '0-1',
    Draw = '1/2-1/2',
}

export interface PgnHeaders {
    White: string;
    WhiteElo?: string;
    Black: string;
    BlackElo?: string;
    Date: string;
    Site: string;
    Result: GameResult;
    [key: string]: string | undefined;
}

export interface GameInfo {
    cohort: string;
    id: string;
    date: string;
    owner: string;
    headers: PgnHeaders;
}

export interface Comment {
    owner: string;
    ownerDiscord: string;
    ownerCohort: string;
    id: string;
    createdAt: string;
    updatedAt: string;
    content: string;
}

export type Game = GameInfo & {
    pgn: string;
    comments: Comment[];
};

export function isDefaultHeader(header: string): boolean {
    return (
        header === 'White' ||
        header === 'WhiteElo' ||
        header === 'Black' ||
        header === 'BlackElo' ||
        header === 'Date' ||
        header === 'Site' ||
        header === 'Result' ||
        header === 'EventDate'
    );
}