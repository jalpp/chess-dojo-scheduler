package database

import (
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/aws/aws-sdk-go/service/dynamodb/dynamodbattribute"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
)

type NotificationType string

const (
	// Notifications generated by comments on a game
	NotificationType_GameComment NotificationType = "GAME_COMMENT"
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

	// Metadata for a game comment notification
	GameCommentMetadata *GameCommentMetadata `dynamodbav:"gameCommentMetadata" json:"gameCommentMetadata"`
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

// GameCommentNotification returns a Notification object for a game comment.
func GameCommentNotification(g *Game) *Notification {
	if g == nil {
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

// PutNotification inserts the provided notification into the database.
func (repo *dynamoRepository) PutNotification(n *Notification) error {
	item, err := dynamodbattribute.MarshalMap(n)
	if err != nil {
		return errors.Wrap(500, "Temporary server error", "Unable to marshal notification", err)
	}

	input := &dynamodb.PutItemInput{
		Item:      item,
		TableName: aws.String(notificationTable),
	}
	_, err = repo.svc.PutItem(input)
	return errors.Wrap(500, "Temporary server error", "DynamoDB PutItem failure", err)
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