import { PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import {
    MateInOneSessionResult,
    SubmitMateInOneSessionResponse,
    submitMateInOneSessionSchema,
} from '@jackstenglein/chess-dojo-common/src/mateInOne/api';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
    errToApiGatewayProxyResultV2,
    parseBody,
    requireUserInfo,
    success,
} from '../../directoryService/api';
import { dynamo } from '../../directoryService/database';

const mateInOneResultsTable = `${process.env.stage}-mate-in-one-results`;

/**
 * Handles POST /puzzle/mate-in-one/session.
 * Validates and persists a mate-in-one drill session result to DynamoDB.
 *
 * @param event - The API Gateway proxy event.
 * @returns An empty response on success.
 */
export const submitSessionHandler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log('Event: %j', event);
        const userInfo = requireUserInfo(event);
        const request = parseBody(event, submitMateInOneSessionSchema);

        const result: MateInOneSessionResult = {
            ...request,
            username: userInfo.username,
            createdAt: request.createdAt ?? new Date().toISOString(),
        };

        await dynamo.send(
            new PutItemCommand({
                TableName: mateInOneResultsTable,
                Item: marshall(result, { removeUndefinedValues: true }),
            }),
        );

        const response: SubmitMateInOneSessionResponse = {};
        return success(response);
    } catch (err) {
        return errToApiGatewayProxyResultV2(err);
    }
};
