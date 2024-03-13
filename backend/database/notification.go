package database

import (
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/aws/aws-sdk-go/service/dynamodb/expression"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/log"
)

type NotificationType string

const (
	// Notifications generated by comments on a game
	NotificationType_GameComment NotificationType = "GAME_COMMENT"

	// Notifications generated by getting a new follower
	NotificationType_NewFollower NotificationType = "NEW_FOLLOWER"

	// Notifications generated by comments on a timeline entry
	NotificationType_TimelineComment NotificationType = "TIMELINE_COMMENT"

	// Notifications generated by emoji reactions on a timeline entry
	NotificationType_TimelineReaction NotificationType = "TIMELINE_REACTION"

	// Notifications generated by an explorer game added to the database
	NotificationType_ExplorerGame NotificationType = "EXPLORER_GAME"

	// Notifications generated by a new request to join a club
	NotificationType_NewClubJoinRequest NotificationType = "NEW_CLUB_JOIN_REQUEST"

	// Notifications generated by approval to join a club
	NotificationType_ClubJoinRequestApproved NotificationType = "CLUB_JOIN_REQUEST_APPROVED"

	// Notifications generated by a sensei game review
	NotificationType_GameReviewComplete NotificationType = "GAME_REVIEW_COMPLETE"
)

// Data for a notification
type Notification struct {
	// The username of the user that this notification applies to
	Username string `dynamodbav:"username" json:"-"`

	// The id of the notification. It can take various forms depending
	// on the type of notification.
	Id string `dynamodbav:"id" json:"id"`

	// The type of the notification
	Type NotificationType `dynamodbav:"type" json:"type"`

	// The time the notification was last updated
	UpdatedAt string `dynamodbav:"updatedAt" json:"updatedAt"`

	// The number of unread instances of this notification
	Count int `dynamodbav:"count" json:"count"`

	// Metadata for a game comment notification
	GameCommentMetadata *GameCommentMetadata `dynamodbav:"gameCommentMetadata,omitempty" json:"gameCommentMetadata,omitempty"`

	// Metadata for a game review notification
	GameReviewMetadata *GameReviewMetadata `dynamodbav:"gameReviewMetadata,omitempty" json:"gameReviewMetadata,omitempty"`

	// Metadata for a new follower notification
	NewFollowerMetadata *NewFollowerMetadata `dynamodbav:"newFollowerMetadata,omitempty" json:"newFollowerMetadata,omitempty"`

	// Metadata for a timeline comment notification
	TimelineCommentMetadata *TimelineCommentMetadata `dynamodbav:"timelineCommentMetadata,omitempty" json:"timelineCommentMetadata,omitempty"`

	// Metadata for an explorer game notification
	ExplorerGameMetadata *ExplorerGameMetadata `dynamodbav:"explorerGameMetadata,omitempty" json:"explorerGameMetadata,omitempty"`

	// Metadata for club-related notifications
	ClubMetadata *ClubMetadata `dynamodbav:"clubMetadata,omitempty" json:"clubMetadata,omitempty"`
}

// Metadata for a game comment notification.
type GameCommentMetadata struct {
	// The cohort of the game
	Cohort DojoCohort `dynamodbav:"cohort" json:"cohort"`

	// The sort key of the game
	Id string `dynamodbav:"id" json:"id"`

	// The headers of the game
	Headers map[string]string `dynamodbav:"headers" json:"headers"`
}

// Metadata for a game review notification
type GameReviewMetadata struct {
	// Inherits all fields from GameCommentMetadata
	GameCommentMetadata

	// The reviewer of the game
	Reviewer Reviewer `dynamodbav:"reviewer" json:"reviewer"`
}

// Metadata for a new follower notification.
type NewFollowerMetadata struct {
	// The username of the follower
	Username string `dynamodbav:"username" json:"username"`

	// The display name of the follower
	DisplayName string `dynamodbav:"displayName" json:"displayName"`

	// The cohort of the follower
	Cohort DojoCohort `dynamodbav:"cohort" json:"cohort"`
}

// Metadata for a timeline comment notification.
type TimelineCommentMetadata struct {
	// The owner of the timeline entry
	Owner string `dynamodbav:"owner" json:"owner"`

	// The id of the timeline entry
	Id string `dynamodbav:"id" json:"id"`

	// The requirement name of the timeline entry
	Name string `dynamodbav:"name" json:"name"`
}

// Metadata for an explorer game notification.
type ExplorerGameMetadata struct {
	// The normalized fen of the position
	NormalizedFen string `dynamodbav:"normalizedFen" json:"normalizedFen"`

	// The cohort of the game
	Cohort DojoCohort `dynamodbav:"cohort" json:"cohort"`

	// The sort key of the game
	Id string `dynamodbav:"id" json:"id"`

	// The result of the explorer game, not the result of the game
	Result string `dynamodbav:"result" json:"result"`

	// The headers of the game
	Headers map[string]string `dynamodbav:"headers" json:"headers"`
}

// Metadata for a new request to join a club
type ClubMetadata struct {
	// The id of the club
	Id string `dynamodbav:"id" json:"id"`

	// The name of the club
	Name string `dynamodbav:"name" json:"name"`
}

type NotificationPutter interface {
	// PutNotification inserts the provided notification into the database.
	PutNotification(n *Notification) error
}

// GameCommentNotification returns a Notification object for a game comment.
// If the owner of the game has game comment notifications turned off, nil
// is returned.
func GameCommentNotification(g *Game) *Notification {
	if g == nil {
		return nil
	}

	user, err := DynamoDB.GetUser(g.Owner)
	if err != nil {
		log.Errorf("Failed to get user: %v", err)
		return nil
	}
	if user.NotificationSettings.SiteNotificationSettings.GetDisableGameComment() {
		return nil
	}

	return &Notification{
		Username:  g.Owner,
		Id:        fmt.Sprintf("%s|%s|%s", NotificationType_GameComment, g.Cohort, g.Id),
		Type:      NotificationType_GameComment,
		UpdatedAt: time.Now().Format(time.RFC3339),
		GameCommentMetadata: &GameCommentMetadata{
			Cohort:  g.Cohort,
			Id:      g.Id,
			Headers: g.Headers,
		},
	}
}

// GameReviewNotification returns a Notification object for a game review.
// If the owner of the game has game review notifications turned off, nil is
// returned.
func GameReviewNotification(g *Game) *Notification {
	if g == nil || g.Review == nil || g.Review.Reviewer == nil {
		return nil
	}

	user, err := DynamoDB.GetUser(g.Owner)
	if err != nil {
		log.Errorf("Failed to get user: %v", err)
		return nil
	}
	if user.NotificationSettings.SiteNotificationSettings.GetDisableGameReview() {
		return nil
	}

	return &Notification{
		Username:  g.Owner,
		Id:        fmt.Sprintf("%s|%s|%s", NotificationType_GameReviewComplete, g.Cohort, g.Id),
		Type:      NotificationType_GameReviewComplete,
		UpdatedAt: time.Now().Format(time.RFC3339),
		GameReviewMetadata: &GameReviewMetadata{
			GameCommentMetadata: GameCommentMetadata{
				Cohort:  g.Cohort,
				Id:      g.Id,
				Headers: g.Headers,
			},
			Reviewer: *g.Review.Reviewer,
		},
	}
}

// NewFollowerNotification returns a Notification object for a follower entry. If the
// poster of the follower entry has follower notifications turned off, nil is returned.
func NewFollowerNotification(f *FollowerEntry, cohort DojoCohort) *Notification {
	user, err := DynamoDB.GetUser(f.Poster)
	if err != nil {
		log.Errorf("Failed to get user: %v", err)
		return nil
	}
	if user.NotificationSettings.SiteNotificationSettings.GetDisableNewFollower() {
		return nil
	}

	return &Notification{
		Username:  f.Poster,
		Id:        fmt.Sprintf("%s|%s", NotificationType_NewFollower, f.Follower),
		Type:      NotificationType_NewFollower,
		UpdatedAt: time.Now().Format(time.RFC3339),
		NewFollowerMetadata: &NewFollowerMetadata{
			Username:    f.Follower,
			DisplayName: f.FollowerDisplayName,
			Cohort:      cohort,
		},
	}
}

// TimelineCommentNotification returns a Notification object for a comment on a
// timeline entry. If the owner of the timeline entry has timeline comment
// notifications turned off, nil is returned.
func TimelineCommentNotification(e *TimelineEntry) *Notification {
	user, err := DynamoDB.GetUser(e.Owner)
	if err != nil {
		log.Errorf("Failed to get user: %v", err)
		return nil
	}
	if user.NotificationSettings.SiteNotificationSettings.GetDisableNewsfeedComment() {
		return nil
	}

	return &Notification{
		Username:  e.Owner,
		Id:        fmt.Sprintf("%s|%s|%s", NotificationType_TimelineComment, e.Owner, e.Id),
		Type:      NotificationType_TimelineComment,
		UpdatedAt: time.Now().Format(time.RFC3339),
		TimelineCommentMetadata: &TimelineCommentMetadata{
			Owner: e.Owner,
			Id:    e.Id,
			Name:  e.RequirementName,
		},
	}
}

// TimelineReactionNotification returns a Notification object for a reaction
// on a timeline entry. If the owner of the timeline entry has timeline reaction
// notifications turned off, nil is returned.
func TimelineReactionNotification(e *TimelineEntry) *Notification {
	user, err := DynamoDB.GetUser(e.Owner)
	if err != nil {
		log.Errorf("Failed to get user: %v", err)
		return nil
	}
	if user.NotificationSettings.SiteNotificationSettings.GetDisableNewsfeedReaction() {
		return nil
	}

	return &Notification{
		Username:  e.Owner,
		Id:        fmt.Sprintf("%s|%s|%s", NotificationType_TimelineReaction, e.Owner, e.Id),
		Type:      NotificationType_TimelineReaction,
		UpdatedAt: time.Now().Format(time.RFC3339),
		TimelineCommentMetadata: &TimelineCommentMetadata{
			Owner: e.Owner,
			Id:    e.Id,
			Name:  e.RequirementName,
		},
	}
}

// Returns a Notification object for a request to join the given club.
func NewClubJoinRequestNotification(club *Club) *Notification {
	return &Notification{
		Username:  club.Owner,
		Id:        fmt.Sprintf("%s|%s", NotificationType_NewClubJoinRequest, club.Id),
		Type:      NotificationType_NewClubJoinRequest,
		UpdatedAt: time.Now().Format(time.RFC3339),
		ClubMetadata: &ClubMetadata{
			Id:   club.Id,
			Name: club.Name,
		},
	}
}

// Returns a Notification object indicating that a request to join the given club
// was approved.
func ClubJoinRequestApprovedNotification(username string, club *Club) *Notification {
	return &Notification{
		Username:  username,
		Id:        fmt.Sprintf("%s|%s", NotificationType_ClubJoinRequestApproved, club.Id),
		Type:      NotificationType_ClubJoinRequestApproved,
		UpdatedAt: time.Now().Format(time.RFC3339),
		ClubMetadata: &ClubMetadata{
			Id:   club.Id,
			Name: club.Name,
		},
	}
}

// PutNotification inserts the provided notification into the database.
func (repo *dynamoRepository) PutNotification(n *Notification) error {
	if n == nil {
		return nil
	}

	update := expression.
		Set(expression.Name("type"), expression.Value(n.Type)).
		Set(expression.Name("updatedAt"), expression.Value(n.UpdatedAt)).
		Add(expression.Name("count"), expression.Value(1))

	if n.GameCommentMetadata != nil {
		update.Set(expression.Name("gameCommentMetadata"), expression.Value(n.GameCommentMetadata))
	}
	if n.GameReviewMetadata != nil {
		update.Set(expression.Name("gameReviewMetadata"), expression.Value(n.GameReviewMetadata))
	}
	if n.NewFollowerMetadata != nil {
		update.Set(expression.Name("newFollowerMetadata"), expression.Value(n.NewFollowerMetadata))
	}
	if n.TimelineCommentMetadata != nil {
		update.Set(expression.Name("timelineCommentMetadata"), expression.Value(n.TimelineCommentMetadata))
	}
	if n.ClubMetadata != nil {
		update.Set(expression.Name("clubMetadata"), expression.Value(n.ClubMetadata))
	}

	expr, err := expression.NewBuilder().WithUpdate(update).Build()
	if err != nil {
		return errors.Wrap(500, "Temporary server error", "Unable to build update expression", err)
	}

	input := &dynamodb.UpdateItemInput{
		Key: map[string]*dynamodb.AttributeValue{
			"username": {S: aws.String(n.Username)},
			"id":       {S: aws.String(n.Id)},
		},
		UpdateExpression:          expr.Update(),
		ExpressionAttributeNames:  expr.Names(),
		ExpressionAttributeValues: expr.Values(),
		TableName:                 &notificationTable,
	}

	_, err = repo.svc.UpdateItem(input)
	return errors.Wrap(500, "Temporary server error", "DynamoDB UpdateItem failure", err)
}

// ListNotifications returns a list of notifications for the provided username.
func (repo *dynamoRepository) ListNotifications(username string, startKey string) ([]Notification, string, error) {
	input := &dynamodb.QueryInput{
		KeyConditionExpression: aws.String("#username = :username"),
		ExpressionAttributeNames: map[string]*string{
			"#username": aws.String("username"),
		},
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":username": {
				S: aws.String(username),
			},
		},
		ScanIndexForward: aws.Bool(false),
		TableName:        aws.String(notificationTable),
	}

	var notifications []Notification
	lastKey, err := repo.query(input, startKey, &notifications)
	if err != nil {
		return nil, "", err
	}
	return notifications, lastKey, nil
}

// DeleteNotification removes the notification with the specified key from the database.
func (repo *dynamoRepository) DeleteNotification(username, id string) error {
	input := &dynamodb.DeleteItemInput{
		Key: map[string]*dynamodb.AttributeValue{
			"username": {S: aws.String(username)},
			"id":       {S: aws.String(id)},
		},
		TableName: aws.String(notificationTable),
	}

	_, err := repo.svc.DeleteItem(input)
	return errors.Wrap(500, "Temporary server error", "Failed Dynamo DeleteItem call", err)
}
