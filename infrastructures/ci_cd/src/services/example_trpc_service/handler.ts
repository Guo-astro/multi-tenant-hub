import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { postSpaces } from "./PostSpaces";
import { getSpaces } from "./GetSpaces";
import { updateSpace } from "./UpdateSpace";
import { deleteSpace } from "./DeleteSpace";
import { JsonError, MissingFieldError } from "../../infra/shared/Validator";
import { addCorsHeader } from "../../infra/shared/Utils";

const ddbClient = new DynamoDBClient({});

async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  let response: APIGatewayProxyResult | undefined;

  try {
    switch (event.httpMethod) {
      case "GET":
        response = await getSpaces(event, ddbClient);
        break;
      case "POST":
        response = await postSpaces(event, ddbClient);
        break;
      case "PUT":
        response = await updateSpace(event, ddbClient);
        break;
      case "DELETE":
        response = await deleteSpace(event, ddbClient);
        break;
      default:
        break;
    }
  } catch (error) {
    if (error instanceof MissingFieldError) {
      response = {
        statusCode: 400,
        body: error.message,
      };
    } else if (error instanceof JsonError) {
      response = {
        statusCode: 400,
        body: error.message,
      };
    } else if (error instanceof Error) {
      response = {
        statusCode: 500,
        body: error.message,
      };
    }
  }

  if (response) {
    addCorsHeader(response);
    return response;
  }

  return {
    statusCode: 500,
    body: "Internal Server Error",
  };
}

export { handler };
