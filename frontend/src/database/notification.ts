/**
 * Represents the type of a Notification.
 */
export enum NotificationType {
    /** Notifications generated by comments on a game. */
    GameComment = 'GAME_COMMENT',

    /** Notifications generated by a completed game review. */
    GameReviewComplete = 'GAME_REVIEW_COMPLETE',

    /** Notifications generated by getting a new follower. */
    NewFollower = 'NEW_FOLLOWER',

    /** Notifications generated by comments on a timeline entry. */
    TimelineComment = 'TIMELINE_COMMENT',

    /** Notifications generated by reactions on a timeline entry. */
    TimelineReaction = 'TIMELINE_REACTION',

    /** Notifications generated by an explorer game added to the database. */
    ExplorerGame = 'EXPLORER_GAME',

    /** Notifications generated by a new request to join a club. */
    NewClubJoinRequest = 'NEW_CLUB_JOIN_REQUEST',

    /** Notifications generated by an approved club join request. */
    ClubJoinRequestApproved = 'CLUB_JOIN_REQUEST_APPROVED',
}

/**
 *  Data for a notification.
 */
export interface Notification {
    /** The id of the Notification. */
    id: string;

    /** The type of the Notification. */
    type: NotificationType;

    /** The time the Notification was last updated. */
    updatedAt: string;

    /** The number of unread instances of this notification. */
    count: number;

    /** Metadata for a game comment Notification. */
    gameCommentMetadata?: {
        /** The cohort of the Game. */
        cohort: string;

        /** The id of the Game. */
        id: string;

        /** The headers of the Game. */
        headers: {
            [key: string]: string;
        };
    };

    /** Metadata for a game review Notification. */
    gameReviewMetadata?: {
        /** The cohort of the Game. */
        cohort: string;

        /** The id of the Game. */
        id: string;

        /** The headers of the Game. */
        headers: {
            [key: string]: string;
        };

        /** The reviewer of the Game. */
        reviewer: {
            /** The username of the reviewer. */
            username: string;

            /** The display name of the reviewer. */
            displayName: string;

            /** The cohort of the reviewer. */
            cohort: string;
        };
    };

    /** Metadata for a new follower notification. */
    newFollowerMetadata?: {
        /** The username of the new follower. */
        username: string;

        /** The display name of the new follower. */
        displayName: string;

        /** The cohort of the new follower. */
        cohort: string;
    };

    /** Metadata for a timeline comment notification */
    timelineCommentMetadata?: {
        /** The owner of the associated timeline entry */
        owner: string;

        /** The id of the associated timeline entry */
        id: string;

        /** The requirement name of the associated timeline entry */
        name: string;
    };

    /** Metadata about the ExplorerGame. */
    explorerGameMetadata?: {
        /** The normalized FEN of the position. */
        normalizedFen: string;

        /** The cohort the game was in. */
        cohort: string;

        /** The id of the game. */
        id: string;

        /** The result of the ExplorerGame, as related to the position. */
        result: string;

        /** The headers of the game. */
        headers: {
            [key: string]: string;
        };
    };

    /** Metadata for a club join request notification. */
    clubMetadata?: {
        /** The id of the club. */
        id: string;

        /** The name of the club. */
        name: string;
    };
}

export function getTitle(notification: Notification): string {
    switch (notification.type) {
        case NotificationType.GameComment:
            return `${notification.gameCommentMetadata?.headers?.White} - ${notification.gameCommentMetadata?.headers?.Black}`;
        case NotificationType.GameReviewComplete:
            return `${notification.gameReviewMetadata?.headers?.White} - ${notification.gameReviewMetadata?.headers?.Black}`;
        case NotificationType.NewFollower:
            return 'You have a new follower';
        case NotificationType.TimelineComment:
        case NotificationType.TimelineReaction:
            return `${notification.timelineCommentMetadata?.name}`;
        case NotificationType.ExplorerGame:
            return `${notification.explorerGameMetadata?.headers?.White} - ${notification.explorerGameMetadata?.headers?.Black}`;
        case NotificationType.NewClubJoinRequest:
            return `${notification.clubMetadata?.name}`;
        case NotificationType.ClubJoinRequestApproved:
            return `${notification.clubMetadata?.name}`;
    }
}

export function getDescription(notification: Notification): string {
    let count = notification.count || 1;

    switch (notification.type) {
        case NotificationType.GameComment:
            return 'There are new comments on your game.';
        case NotificationType.GameReviewComplete:
            return `${notification.gameReviewMetadata?.reviewer.displayName} reviewed your game. Check the game settings for more info.`;
        case NotificationType.NewFollower:
            return `${notification.newFollowerMetadata?.displayName}`;
        case NotificationType.TimelineComment:
            return `There ${count !== 1 ? `are ${count}` : 'is a'} new comment${
                count !== 1 ? 's' : ''
            } on your activity.`;
        case NotificationType.TimelineReaction:
            return `There ${count !== 1 ? `are ${count}` : 'is a'} new reaction${
                count !== 1 ? 's' : ''
            } on your activity.`;
        case NotificationType.ExplorerGame:
            return `A new game was added containing a position you follow.`;
        case NotificationType.NewClubJoinRequest:
            return `There ${count !== 1 ? `are ${count}` : 'is a'} new request${
                count !== 1 ? 's' : ''
            } to join your club.`;
        case NotificationType.ClubJoinRequestApproved:
            return 'Your request to join the club was approved.';
    }
}
