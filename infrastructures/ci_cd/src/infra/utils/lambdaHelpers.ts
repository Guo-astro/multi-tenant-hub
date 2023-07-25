import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as codedeploy from "aws-cdk-lib/aws-codedeploy";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import { Repository } from "aws-cdk-lib/aws-ecr";
import { generateLogicalId } from "./Utils";

export class LambdaIntegrationHelper<
  FunctionKey extends string | number | symbol,
  IntegrationKey extends string | number | symbol
> {
  private lambdaFunctionMap: Record<FunctionKey, lambda.IFunction> =
    {} as Record<FunctionKey, lambda.IFunction>;
  private integrationMap: Record<IntegrationKey, apigateway.LambdaIntegration> =
    {} as Record<IntegrationKey, apigateway.LambdaIntegration>;
  private scope: Construct;

  constructor(
    scope: Construct,
    lambdaFunctionArns: Record<FunctionKey, string>
  ) {
    this.scope = scope;

    for (const [key, value] of Object.entries(lambdaFunctionArns) as [
      string,
      string
    ][]) {
      const lambdaFunctionName = `${key}LambdaFunction`;
      const integrationName = `${key}Integration`;

      const { lambdaFunction, integration } = createLambdaIntegration(
        scope,
        lambdaFunctionName,
        value
      );
      this.lambdaFunctionMap[lambdaFunctionName as FunctionKey] =
        lambdaFunction;

      this.integrationMap[integrationName as IntegrationKey] = integration;
    }
  }
  public getLambdaFunctionMap(): Record<FunctionKey, lambda.IFunction> {
    return this.lambdaFunctionMap;
  }

  public getIntegrationMap(): Record<
    IntegrationKey,
    apigateway.LambdaIntegration
  > {
    return this.integrationMap;
  }
}
function createLambdaIntegration(
  scope: Construct,
  id: string,
  lambdaFunctionArn: string
): {
  lambdaFunction: lambda.IFunction;
  integration: apigateway.LambdaIntegration;
} {
  const lambdaFunction = lambda.Function.fromFunctionArn(
    scope,
    id,
    lambdaFunctionArn
  );
  return {
    lambdaFunction: lambdaFunction,
    integration: new apigateway.LambdaIntegration(lambdaFunction),
  };
}

interface CreateContaineredLambdaFunctionProps {
  functionName: string;
  lambdaEcrRepository: Repository;
  handlerName: string;
  imageTag: string;
  role: iam.IRole;
  tracing: lambda.Tracing;
  environment: { [key: string]: string };
  aliasName: string;
  deploymentConfig: codedeploy.ILambdaDeploymentConfig;
  alarmDescription: string;
  comparisonOperator: cloudwatch.ComparisonOperator;
  evaluationPeriods: number;
  threshold: number;
  statistic: cloudwatch.Statistic;
  period: cdk.Duration;
  cfnOutputSuffix?: string;
  tenantId: string;
}
export function createContaineredLambdaFunction(
  scope: Construct,
  props: CreateContaineredLambdaFunctionProps
): lambda.Function {
  const {
    functionName,
    lambdaEcrRepository,
    handlerName,
    imageTag: imageTag,
    role,
    tracing,
    environment,
    aliasName,
    deploymentConfig,
    alarmDescription,
    comparisonOperator,
    evaluationPeriods,
    threshold,
    statistic,
    period,
    cfnOutputSuffix,
    tenantId,
  } = props;
  const date = new Date();

  const jstDate = date.toLocaleString("en-US", { timeZone: "Asia/Tokyo" });
  const isoJstDate = new Date(jstDate).toISOString();
  const uniqueVersionId = `${isoJstDate}:${Date.now()}`;
  const combinedEnvironment = {
    ...environment,
    POWERTOOLS_METRICS_NAMESPACE: "MultiTenantHub",
  };

  // Lambda Function
  const lambdaFunction = new lambda.Function(
    scope,
    generateLogicalId(functionName, tenantId),

    {
      code: lambda.Code.fromEcrImage(lambdaEcrRepository, {
        cmd: [handlerName],
        tagOrDigest: imageTag,
      }),
      description: `This lambda deployed at ${uniqueVersionId}`,
      handler: lambda.Handler.FROM_IMAGE,
      runtime: lambda.Runtime.FROM_IMAGE,
      timeout: cdk.Duration.seconds(30),
      role,
      tracing,
      environment: combinedEnvironment,
    }
  );

  // Alias
  //TODO: Use alias later
  const alias = lambdaFunction.addAlias(aliasName);
  // CloudWatch Alarm
  const alarm = new cloudwatch.Alarm(
    scope,
    `${functionName}CanaryErrorsAlarm`,
    {
      alarmDescription,
      comparisonOperator,
      evaluationPeriods,
      metric: lambdaFunction.metricErrors().with({
        statistic,
        period,
        dimensionsMap: {
          Resource: `${lambdaFunction.functionName}:live`,
          FunctionName: lambdaFunction.functionName,
          ExecutedVersion: lambdaFunction.currentVersion.version,
        },
      }),
      threshold,
    }
  );

  // CodeDeploy Deployment Group
  new codedeploy.LambdaDeploymentGroup(
    scope,
    `${functionName}DeploymentGroup`,
    {
      alias,
      deploymentConfig,
      alarms: [alarm],
    }
  );

  return lambdaFunction;
}

interface CreateFileBasedLambdaFunctionProps {
  functionName: string;
  handlerName: string;
  assetPath: string;
  role: iam.IRole;
  tracing: lambda.Tracing;
  environment: { [key: string]: string };
  aliasName: string;
  deploymentConfig: codedeploy.ILambdaDeploymentConfig;
  alarmDescription: string;
  comparisonOperator: cloudwatch.ComparisonOperator;
  evaluationPeriods: number;
  threshold: number;
  statistic: cloudwatch.Statistic;
  period: cdk.Duration;
  runtime: lambda.Runtime;
  layers: lambda.ILayerVersion[];
  cfnOutputSuffix?: string;
  tenantId: string;
}

export function createFileBasedLambdaFunction(
  scope: Construct,
  props: CreateFileBasedLambdaFunctionProps
): lambda.Function {
  const {
    functionName,
    handlerName,
    assetPath,
    role,
    tracing,
    environment,
    aliasName,
    deploymentConfig,
    alarmDescription,
    comparisonOperator,
    evaluationPeriods,
    threshold,
    statistic,
    period,
    runtime,
    layers,
    cfnOutputSuffix,
    tenantId,
  } = props;

  const date = new Date();
  const jstDate = date.toLocaleString("en-US", { timeZone: "Asia/Tokyo" });
  const isoJstDate = new Date(jstDate).toISOString();
  const uniqueVersionId = `${isoJstDate}:${Date.now()}`;
  const combinedEnvironment = {
    ...environment,
    POWERTOOLS_METRICS_NAMESPACE: "MultiTenantHub",
  };

  // Lambda Function
  const lambdaFunction = new lambda.Function(
    scope,
    generateLogicalId(functionName, tenantId),
    {
      code: lambda.Code.fromAsset(assetPath, {
        bundling: {
          image: lambda.Runtime.PYTHON_3_9.bundlingImage,
          command: [
            "bash",
            "-c",
            "pip install -r requirements.txt -t /asset-output && cp -au . /asset-output",
          ],
        },
      }),
      description: `This lambda deployed at ${uniqueVersionId}`,
      handler: handlerName,
      runtime: runtime,
      timeout: cdk.Duration.seconds(90),
      role,
      tracing,
      environment: combinedEnvironment,
      layers,
    }
  );

  // createCfnOutputIfNotExists(scope, {
  //   id: `${functionName}CfnOutputId`,
  //   props: {
  //     description: "Function Arn to be used cross stack",
  //     value: lambdaFunction.functionArn,
  //     exportName: `${functionName}CfnOutput-${cfnOutputSuffix}`,
  //   },
  // });

  // Alias
  //TODO: Use alias later
  const alias = lambdaFunction.addAlias(aliasName);

  // CloudWatch Alarm
  const alarm = new cloudwatch.Alarm(
    scope,
    `${functionName}CanaryErrorsAlarm`,
    {
      alarmDescription,
      comparisonOperator,
      evaluationPeriods,
      metric: lambdaFunction.metricErrors().with({
        statistic,
        period,
        dimensionsMap: {
          Resource: `${lambdaFunction.functionName}:live`,
          FunctionName: lambdaFunction.functionName,
          ExecutedVersion: lambdaFunction.currentVersion.version,
        },
      }),
      threshold,
    }
  );

  // CodeDeploy Deployment Group
  new codedeploy.LambdaDeploymentGroup(
    scope,
    `${functionName}DeploymentGroup`,
    {
      alias,
      deploymentConfig,
      alarms: [alarm],
    }
  );

  return lambdaFunction;
}
