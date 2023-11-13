import { Game } from './game';

/** A single position in the games explorer, aggregating results across all games. */
export interface ExplorerPosition {
    /**
     * The normalized FEN of the position. FENs are normalized in the following way:
     * 1. The en passant target square is set to -, unless en passant is currently a legal move.
     * 2. The halfmove clock field is set to 0.
     * 3. The fullmove clock field is set to 1.
     *
     * This is the hash key of the explorer table.
     */
    normalizedFen: string;

    /**
     * Set to the value `POSITION` for all explorer positions. This is the range key of the
     * explorer table and is more useful in the ExplorerGame interface.
     */
    id: string;

    /**
     * The opening of the position, if it has a name.
     */
    opening?: {
        /** The ECO of the opening. */
        eco: string;

        /** The name of the opening */
        name: string;
    };

    /** A map from cohort to ExplorerResult. Each game is included in this map only once. */
    results: Record<string, ExplorerResult>;

    /**
     * The moves that continued from this position. A map from the SAN of the move to the
     * ExplorerMove object. Each game that reaches this position is only counted once for
     * a specific SAN. For example, if a game reaches a given FEN twice by repeating moves,
     * and white plays a different move on the second time, that game will be counted twice
     * under two separate SANs. But if a game plays a specific SAN and then plays that same
     * SAN in the same position in an analysis variation, then the game is counted only once
     * under that SAN.
     */
    moves: Record<string, ExplorerMove>;
}

/** A single move option in the games explorer, aggregating results across all games. */
export interface ExplorerMove {
    /** The SAN of the move. */
    san: string;

    /** A map from cohort to ExplorerResult. */
    results: Record<string, ExplorerResult>;
}

/** A set of results for an ExplorerMove or ExplorerPosition. */
export interface ExplorerResult {
    /** The number of games in which white won. */
    white?: number;

    /** The number of games in which black won. */
    black?: number;

    /** The number of games in which the move drew. */
    draws?: number;

    /**
     * The number of games in which the move appeared only in analysis,
     * and therefore didn't have a traditional result associated.
     */
    analysis?: number;
}

/**
 * A linking between an ExplorerPosition and a game submitted to the Dojo database.
 * Note that each game in the database should only have one associated ExplorerGame for a given
 * ExplorerPosition. So if a game repeats moves or if a certain position shows up in multiple
 * variations, then still only one ExplorerGame object is created.
 */
export interface ExplorerGame {
    /**
     * This is the hash key of the explorer table. See the comment on ExplorerPosition
     * for more info on the format.
     */
    normalizedFen: string;

    /**
     * The range key of the table, in the form GAME#cohort#date_uuid, where GAME is the
     * literal value `GAME`, cohort is the value of the hash key in the games table and
     * date_uuid is the value of the range key in the games table.
     */
    id: string;

    /** The cohort of the game. */
    cohort: string;

    /** The username of the owner of the game. */
    owner: string;

    /** The display name of the owner of the game. */
    ownerDisplayName: string;

    /**
     * The result of the game, as related to the associated FEN. IE: if the FEN does not appear in
     * the mainline of the game and instead appears only in analysis, then this is `analysis`. Otherwise,
     * it is the result of the game.
     */
    result: keyof ExplorerResult;

    /** The game that generated this ExplorerGame. The PGN is not included. */
    game: Game;
}

/**
 * A user following this position. The user will be notified when a new
 * analysis is uploaded containing this position.
 */
export interface ExplorerPositionFollower {
    /**
     * This is the hash key of the explorer table. See the comment on ExplorerPosition
     * for more info on the format.
     */
    normalizedFen: string;

    /**
     * The range key of the table, in the form FOLLOWER#username, where FOLLOWER is the
     * literal value `FOLLOWER` and username is the username of the follower.
     */
    id: string;

    /**
     * The minimum cohort the new analysis must be in for the user to be notified
     * (inclusive). If not provided, then there is no minimum cohort.
     */
    minCohort?: string;

    /**
     * The maximum cohort the new analysis must be in for the user to be notified
     * (inclusive). If not provided, then there is no maximum cohort.
     */
    maxCohort?: string;

    /**
     * Whether to disable notifications if the position only appears in a variation
     * of the analysis and not the mainline.
     */
    disableVariations?: boolean;
}

/**
 * Returns the normalized version of the provided FEN. See the comment on ExplorerPosition for a
 * description of how FENs are normalized.
 * @param fen The FEN to normalize.
 * @returns The normalized FEN.
 */
export function normalizeFen(fen: string): string {
    const tokens = fen.split(' ');
    if (tokens.length < 4) {
        throw new Error(`Invalid FEN: '${fen}'. FEN does not have at least 4 tokens.`);
    }

    const pieces = tokens[0];
    const color = tokens[1];
    const castling = tokens[2];
    const enPassant = tokens[3];

    return `${pieces} ${color} ${castling} ${enPassant} 0 1`;
}

/**
 * Returns the total number of games for the given ExplorerResult map.
 * @param results The ExplorerResults to get the total number of games for.
 */
export function getGameCount(results: Record<string, ExplorerResult>): number {
    return Object.values(results).reduce(
        (sum, result) =>
            sum +
            (result.white || 0) +
            (result.draws || 0) +
            (result.black || 0) +
            (result.analysis || 0),
        0
    );
}

/**
 * Returns the total number of games where the provided move had the provided result.
 * @param move The ExplorerMove to get the result count for.
 * @param result The result to count.
 * @returns The total number of games where the provided move had the provided result.
 */
export function getResultCount(move: ExplorerMove, result: keyof ExplorerResult): number {
    return Object.values(move.results).reduce((sum, r) => sum + (r[result] || 0), 0);
}
