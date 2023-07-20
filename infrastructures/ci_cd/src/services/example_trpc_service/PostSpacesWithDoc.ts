import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { nanoid } from "nanoid";

export async function postSpacesWithDoc(
  event: APIGatewayProxyEvent,
  ddbClient: DynamoDBClient
): Promise<APIGatewayProxyResult> {
  const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

  const randomId = nanoid();
  if (event.body) {
    const item = JSON.parse(event.body);

    const result = await ddbDocClient.send(
      new PutItemCommand({
        TableName: process.env.TABLE_NAME,

        Item: item,
      })
    );
    console.log(result);

    return {
      statusCode: 201,
      body: JSON.stringify({ id: randomId }),
    };
  } else {
    return {
      statusCode: 500,
      body: JSON.stringify({ id: randomId, msg: "body not exsit" }),
    };
  }
}
