/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { Logger } from "@aws-lambda-powertools/logger";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import fs, { createWriteStream } from "node:fs";
import * as tmp from "tmp";
import { CustomErrorFormatter } from "./CustomLogFormatter";
import admZip from "adm-zip";
import path from "node:path";
import { Upload } from "@aws-sdk/lib-storage";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { randomUUID } from "node:crypto";
import { JsonError } from "./Validator";
export const logger = new Logger({
  logFormatter: new CustomErrorFormatter(),
});
export async function getObjectAndSaveToFile(
  s3Client: S3Client,
  bucketName: string,
  objectKey: string
) {
  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
    });
    const response = await s3Client.send(command);
    if (!response.Body) {
      throw new Error("Can not get object from S3");
    }
    const { name: tempFilePath } = tmp.fileSync();
    const writeStream = createWriteStream(tempFilePath).on("error", (error) =>
      logger.error(`${error}`, { customKey: error })
    );
    const byteArray = await response.Body.transformToByteArray();
    await new Promise<void>((resolve, reject) => {
      writeStream.write(byteArray, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
    return tempFilePath;
  } catch (error) {
    logger.error(`${error}`, { customKey: error });
    throw error;
  }
}
export function extractFileFromZip(zipFilePath: string, fileInZip: string) {
  try {
    const tmpDir = tmp.dirSync().name;
    const zip = new admZip(zipFilePath);
    const entries = zip.getEntries();
    for (const entry of entries) {
      if (entry.entryName === fileInZip) {
        const extractedFilePath = path.join(tmpDir, entry.entryName);
        zip.extractEntryTo(entry.entryName, tmpDir, false, true);
        return extractedFilePath;
      }
    }
  } catch (error) {
    logger.error(`${error}`, { customKey: error });
    throw error;
  }
}

export const uploadFileToS3 = async (
  s3: S3Client,
  bucketName: string,
  key: string,
  filePath: string
): Promise<void> => {
  try {
    const fileStream = fs.createReadStream(filePath);
    await new Upload({
      client: s3,

      params: {
        Bucket: bucketName,
        Key: key,
        Body: fileStream,
      },
    }).done();
    logger.info("File uploaded to S3");
  } catch (error) {
    logger.error(`${error}`, { customKey: error });
    throw error;
  }
};

export function createRandomId() {
  return randomUUID();
}

export function addCorsHeader(arg: APIGatewayProxyResult) {
  if (!arg.headers) {
    arg.headers = {};
  }
  arg.headers["Access-Control-Allow-Origin"] = "*";
  arg.headers["Access-Control-Allow-Methods"] = "*";
}

export function parseJSON<T>(arg: string) {
  try {
    return JSON.parse(arg) as T;
  } catch (error) {
    if (error instanceof Error) {
      throw new JsonError(error.message);
    }
  }
}

export function hasAdminGroup(event: APIGatewayProxyEvent) {
  const context = event.requestContext;
  const authorizer = context?.authorizer;

  if (
    authorizer &&
    typeof authorizer.claims === "object" &&
    "cognito:groups" in authorizer.claims
  ) {
    const groups = (authorizer.claims as Record<string, unknown>)[
      "cognito:groups"
    ];
    if (Array.isArray(groups)) {
      return (groups as string[]).includes("admins");
    }
  }

  return false;
}
