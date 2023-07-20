/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import "source-map-support/register";
import { injectLambdaContext } from "@aws-lambda-powertools/logger";
import middy from "@middy/core";
import { CodePipelineEvent, Artifact } from "aws-lambda";
import AWS_CloudFormation, {
  CloudFormation,
} from "@aws-sdk/client-cloudformation";
import { CodePipeline } from "@aws-sdk/client-codepipeline";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { DynamoDB, ScanCommand } from "@aws-sdk/client-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";

import { unmarshall } from "@aws-sdk/util-dynamodb";
import { logger } from "../shared/Utils";
import { captureLambdaHandler } from "@aws-lambda-powertools/tracer";
import { tracer } from "../shared/Tracer";
import { logMetrics } from "@aws-lambda-powertools/metrics";
import { metrics } from "../shared/Metrics";

logger.info("Loading function");

const cf = new CloudFormation({});
const codePipeline = new CodePipeline({});
const dynamodb = DynamoDBDocument.from(new DynamoDB({}));
const s3Client = new S3Client({});
type OutputVariables = Record<string, string>;

//TODO: Doc it: Get the table name from the SaaS provider Stack output
let outputVariables: OutputVariables = {
  tenantStackMappingTableName: process.env.TENANT_STACK_MAPPING_TABLE_NAME!,
  authorizerFunctionArnCfnParam: process.env.authorizerFunctionArnCfnParam!,
  systemProviderSettingsTableNameCfnParam:
    process.env.SYSTEM_SETTINGS_TABLE_NAME!,
  tenantDetailsTableNameCfnParam: process.env.TENANT_DETAILS_TABLE_NAME!,
  tenantDetailsTableArnCfnParam: process.env.TENANT_DETAILS_TABLE_ARN!,
  usagePlanBasicTierIdCfnParam: process.env.USAGE_PLAN_BASIC_TIER_ID!,
  systemSettingsTableArnCfnParam: process.env.systemSettingsTableArnCfnParam!,
  usagePlanStandardTierIdCfnParam: process.env.USAGE_PLAN_STANDARD_TIER_ID!,
  usagePlanPremiumTierIdCfnParam: process.env.USAGE_PLAN_PREMIUM_TIER_ID!,
  usagePlanPlatinumTierIdCfnParam: process.env.USAGE_PLAN_PLATINUM_TIER_ID!,
};

const paramsStackMapping = {
  TableName: outputVariables.tenantStackMappingTableName,
  // Add any additional parameters or filters if needed
};

const paramsTenantDetails = {
  TableName: outputVariables.tenantDetailsTableNameCfnParam,
  // Add any additional parameters or filters if needed
};

const paramsTenantSettings = {
  TableName: outputVariables.systemProviderSettingsTableNameCfnParam,
  // Add any additional parameters or filters if needed
};

const fetchTableData = async (tablename: string) => {
  try {
    const data = await dynamodb.send(
      new ScanCommand({
        TableName: tablename,
      })
    );

    return data;
  } catch (error) {
    logger.error(`${error}`, { customKey: error });
  }
};
const table_tenant_stack_mapping = fetchTableData(paramsStackMapping.TableName);
function get_commit_hash(job_data: CodePipelineJobData): JobParams {
  try {
    // Get the user parameters which contain the stack, artifact, and file settings
    const user_parameters =
      job_data["actionConfiguration"]["configuration"]["UserParameters"];
    const decoded_parameters = JSON.parse(user_parameters) as JobParams;

    return decoded_parameters;
  } catch (error) {
    // We're expecting the user parameters to be encoded as JSON
    // so we can pass multiple values. If the JSON can't be decoded
    // then fail the job with a helpful message.
    logger.error(`${error}`, { customKey: error });

    throw new Error(
      "UserParameters could not be decoded as JSON (Possible missing commit id)"
    );
  }
}
type CodePipelineJob = Pick<
  CodePipelineEvent,
  "CodePipeline.job"
>["CodePipeline.job"];
type CodePipelineJobData = Pick<CodePipelineJob, "data">["data"];
interface JobParams {
  commit_id: string;
}

interface TenantDetails {
  userPoolId: string;
  appClientId: string;
}

interface TenantSettings {
  settingValue: string;
}

const getTenantParams = async (
  tenantId: string
): Promise<Array<AWS_CloudFormation.Parameter>> => {
  let userPoolId = "";
  let appClientId = "";
  try {
    logger.info(tenantId);
    if (tenantId === "pooled") {
      const userPoolIdResult = await dynamodb.get({
        TableName: paramsTenantSettings.TableName,
        Key: { settingName: "userPoolId-pooled" },
      });
      logger.info(`${JSON.stringify(userPoolIdResult)}`);

      const appClientIdResult = await dynamodb.get({
        TableName: paramsTenantSettings.TableName,
        Key: { settingName: "appClientId-pooled" },
      });
      logger.info(`${JSON.stringify(appClientIdResult)}`);

      const userPoolIdSetting: TenantSettings =
        userPoolIdResult.Item as TenantSettings;
      const appClientIdSetting: TenantSettings =
        appClientIdResult.Item as TenantSettings;

      userPoolId = userPoolIdSetting.settingValue ?? "";
      appClientId = appClientIdSetting.settingValue ?? "";
    } else {
      const tenantDetails = await dynamodb.get({
        TableName: paramsTenantDetails.TableName,
        Key: { tenantId: tenantId },
      });
      logger.info(`${JSON.stringify(tenantDetails)}`);

      const details: TenantDetails | undefined = tenantDetails.Item as
        | TenantDetails
        | undefined;
      if (details) {
        userPoolId = details.userPoolId;
        appClientId = details.appClientId;
      }
    }
  } catch (error) {
    logger.error(`${error}`, { customKey: error });
  }

  const params: Array<AWS_CloudFormation.Parameter> = [
    {
      ParameterKey: "tenanIdCfnParam",
      ParameterValue: tenantId,
    },
  ];

  outputVariables.tenanIdCfnParam = tenantId;
  return params;
};
const addParameter = (
  params: Array<AWS_CloudFormation.Parameter>,
  parameterKey: string,
  parameterValue: string
): void => {
  params.push({
    ParameterKey: parameterKey,
    ParameterValue: parameterValue,
  });
};
const getStackStatus = async (stack: string): Promise<string> => {
  try {
    const stackDescription = await cf.describeStacks({ StackName: stack });
    if (
      stackDescription.Stacks &&
      stackDescription.Stacks.length > 0 &&
      stackDescription.Stacks[0].StackStatus != null
    ) {
      return stackDescription.Stacks[0].StackStatus;
    } else {
      throw new Error("Stack not found");
    }
  } catch (error) {
    logger.error(`${error}`, { customKey: error });
    throw new Error(`Error retrieving stack status: ${error}`);
  }
};
const putJobSuccess = async (
  jobId: string,
  message: string,
  outputVariables: OutputVariables
) => {
  logger.info("Putting job success");
  logger.info(message);

  try {
    await codePipeline.putJobSuccessResult({
      jobId: jobId,
      outputVariables,
    });
  } catch (error) {
    logger.error(`${error}`, { customKey: error });

    throw new Error(`Error putting job success: ${error}`);
  }
};
const putJobFailure = async (job: string, message: string) => {
  logger.info("Putting job failure");
  logger.info(message);

  try {
    await codePipeline.putJobFailureResult({
      jobId: job,
      failureDetails: { message, type: "JobFailed" },
    });
  } catch (error) {
    logger.error(`${error}`, { customKey: error });
    throw new Error(`Error putting job failure: ${error}`);
  }
};
/**
 *
 * @param job
 * @param message
 * continueJobLater cannot output env vars
 */
const continueJobLater = async (
  job: string,
  message: string
): Promise<void> => {
  // Use the continuation token to keep track of any job execution state
  // This data will be available when a new job is scheduled to continue the current execution
  const continuationToken = JSON.stringify({ previous_job_id: job });

  logger.info("Putting job continuation");
  logger.info(message);

  try {
    await codePipeline.putJobSuccessResult({
      jobId: job,
      continuationToken,
    });
  } catch (error) {
    logger.error(`${error}`, { customKey: error });
    throw new Error(`Error putting job continuation: ${error}`);
  }
};
const checkStackUpdateStatus = async (
  jobId: string,
  stack: string,
  outputVariables: OutputVariables
) => {
  const status = await getStackStatus(stack);

  if (["UPDATE_COMPLETE", "CREATE_COMPLETE"].includes(status)) {
    // If the update/create finished successfully then succeed the job and don't continue.
    await putJobSuccess(jobId, "Stack update complete", outputVariables);
  } else if (
    [
      "UPDATE_IN_PROGRESS",
      "UPDATE_ROLLBACK_IN_PROGRESS",
      "UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS",
      "CREATE_IN_PROGRESS",
      "ROLLBACK_IN_PROGRESS",
      "UPDATE_COMPLETE_CLEANUP_IN_PROGRESS",
    ].includes(status)
  ) {
    // If the job isn't finished yet then continue it
    await continueJobLater(jobId, "Stack update still in progress");
  } else {
    // If the Stack is a state which isn't "in progress" or "complete"
    // then the stack update/create has failed so end the job with a failed result.
    await putJobFailure(jobId, "Update failed: " + status);
  }
};
async function stackExists(stack: string): Promise<boolean> {
  try {
    await cf.describeStacks({ StackName: stack });
    return true;
  } catch (error) {
    logger.warn(`${error}`, { customKey: error });

    if (error instanceof Error) {
      return false;
    } else {
      throw error;
    }
  }
}
async function updateStack(
  stack: string,
  params: Array<AWS_CloudFormation.Parameter>
) {
  try {
    await cf.updateStack({
      StackName: stack,
      Capabilities: ["CAPABILITY_NAMED_IAM", "CAPABILITY_AUTO_EXPAND"],
      Parameters: params,
    });
    return true;
  } catch (error) {
    logger.error(`${error}`, { customKey: error });

    if (error instanceof Error) {
      if (error.message === "No updates are to be performed.") {
        return false;
      } else {
        throw new Error(`Error updating CloudFormation stack "${stack}"`);
      }
    }
  }
}
const create_stack = async (
  stack: string,
  params: Array<AWS_CloudFormation.Parameter>
): Promise<void> => {
  try {
    await cf.createStack({
      StackName: stack,
      Capabilities: ["CAPABILITY_NAMED_IAM", "CAPABILITY_AUTO_EXPAND"],
      Parameters: params,
    });
  } catch (error) {
    logger.error(`${error}`, { customKey: error });
    error;

    if (error instanceof Error) {
      throw new TypeError(
        `Failed to create stack "${stack}": ${error.message}`
      );
    }
  }
};

const start_update_or_create = async (
  job_id: string,
  stack: string,
  params: Array<AWS_CloudFormation.Parameter>,
  outputVariables: OutputVariables
): Promise<void> => {
  if (await stackExists(stack)) {
    const status = await getStackStatus(stack);
    if (
      !["CREATE_COMPLETE", "ROLLBACK_COMPLETE", "UPDATE_COMPLETE"].includes(
        status
      )
    ) {
      // If the CloudFormation stack is not in a state where it can be updated again,
      // fail the job right away.
      await putJobFailure(
        job_id,
        "Stack cannot be updated when status is: " + status
      );
      return;
    }

    const were_updates = await updateStack(stack, params);

    if (were_updates === true) {
      // If there were updates, continue the job so it can monitor the progress of the update.
      await continueJobLater(job_id, "Stack update started");
    } else {
      // If there were no updates, succeed the job immediately.
      await putJobSuccess(
        job_id,
        "There were no stack updates",
        outputVariables
      );
    }
  } else {
    // If the stack doesn't already exist, pass outputVariables to the next stage to trigger cdk deploy .
    await putJobSuccess(
      job_id,
      "Output env vars for cdk deploy. putJobSuccess for now",
      outputVariables
    );
  }
};

const findArtifactByName = (artifacts: Artifact[], name: string): Artifact => {
  for (const artifact of artifacts) {
    if (artifact.name === name) {
      return artifact;
    }
  }

  throw new Error(`Input artifact named "${name}" not found in event`);
};

interface ArtifactLocation {
  s3Location: {
    bucketName: string;
    objectKey: string;
  };
}

// const getTemplateUrl = async (
//   s3: S3Client,
//   artifact: { location: ArtifactLocation },
//   fileInZip: string
// ): Promise<string> => {
//   const { bucketName, objectKey } = artifact.location.s3Location;
//   logger.info(bucketName, objectKey);

//   const tmpFilePath = await getObjectAndSaveToFile(s3, bucketName, objectKey);
//   logger.info(`getObjectAndSaveToFile ${tmpFilePath}`);

//   const extractedFile = extractFileFromZip(tmpFilePath, fileInZip);
//   if (extractedFile == null) {
//     throw new Error("extractedFile is null");
//   }
//   await uploadFileToS3(s3, bucketName, fileInZip, extractedFile);
//   return `https://${bucketName}.s3.amazonaws.com/${fileInZip}`;
// };

const updateTenantstackMapping = async (
  tenantId: string,
  commit_id: string
): Promise<void> => {
  try {
    await dynamodb.update({
      TableName: paramsStackMapping.TableName,
      Key: { tenantId: tenantId },
      UpdateExpression: "set codeCommitId = :codeCommitId",
      ExpressionAttributeValues: { ":codeCommitId": commit_id },
      ReturnValues: "NONE",
    });
  } catch (error) {
    logger.error(`${error}`, { customKey: error });
    if (error instanceof Error) {
      throw new TypeError(
        `Failed to update tenant stack mapping for tenant "${tenantId}": ${error.message}`
      );
    }
  }
};
const lambdaHandler = async (event: CodePipelineEvent) => {
  logger.info(`Received event ${JSON.stringify(event)}`);
  const job_id = event["CodePipeline.job"]["id"];

  try {
    const job_data = event["CodePipeline.job"]["data"];
    const params = get_commit_hash(job_data);
    const commit_id = params["commit_id"];

    logger.info(
      "Get all the stacks for each tenant to be updated/created from tenant stack mapping table"
    );

    const mappings = await table_tenant_stack_mapping;

    logger.info("Update/Create stacks for all tenants");

    if (!mappings || !mappings["Items"]) {
      throw Error("table_tenant_stack_mapping is undefined");
    }
    logger.info(`applyLatestRelease: ${JSON.stringify(mappings)} `);
    for (const _mapping of mappings["Items"]) {
      const mapping = unmarshall(_mapping);
      const stack = mapping["stackName"];
      const tenantId = mapping["tenantId"];
      const applyLatestRelease = mapping["applyLatestRelease"];

      if (!Boolean(applyLatestRelease)) {
        continue;
      }

      logger.info(
        `Get the parameters to be passed to the Cloudformation from tenant table. TenanId: ${tenantId}`
      );

      if (!Boolean(tenantId)) {
        throw Error("tenantId is undefined");
      }

      const params = await getTenantParams(tenantId);
      logger.info("Passing parameter to enable canary deployment for lambda's");
      //TODO: doc it. These are parameters pass through to TenantDeploymentStack.Not really used in this handler.
      for (const [key, value] of Object.entries(outputVariables)) {
        addParameter(params, key, value);
      }

      if ("continuationToken" in job_data) {
        logger.info(
          "If we're continuing then the create/update has already been triggered we just need to check if it has finished."
        );

        if (!Boolean(stack)) {
          throw Error("tenant stack is undefined");
        }

        await checkStackUpdateStatus(job_id, stack, outputVariables);
      } else {
        logger.info(" Kick off a stack update or create");
        if (!Boolean(stack)) {
          throw Error("tenant stack is undefined");
        }

        await start_update_or_create(job_id, stack, params, outputVariables);

        logger.info(
          " If we are applying the release, update tenant stack mapping with the pipeline id"
        );
        await updateTenantstackMapping(tenantId, commit_id);
      }
    }
  } catch (error) {
    logger.error(`${error}`, { customKey: error });

    if (error instanceof Error) {
      await putJobFailure(job_id, "Function exception: " + String(error));
    }
  }

  logger.info("Function complete.");

  const response = {
    result: "success",
    message: "Changeset executed successfully",
  };

  return { statusCode: 200, body: JSON.stringify(response) };
};

export const handler = middy(lambdaHandler)
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(captureLambdaHandler(tracer("tenant-stack")))
  .use(logMetrics(metrics("tenant-stack", "codepipeline")));
