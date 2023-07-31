import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as glueCatalog from "aws-cdk-lib/aws-glue"; // Import the glue-catalog module
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import type { Construct } from "constructs";
import type { SaasCostByTenantStackProps } from "@/shared/prop_extensions.types";

export class SaasCostByTenantStack extends cdk.Stack {
  public readonly curBucket: cdk.aws_s3.Bucket;
  constructor(scope: Construct, id: string, props: SaasCostByTenantStackProps) {
    super(scope, id, props);
    /**https://github.com/aws-cloudformation/cloudformation-coverage-roadmap/issues/1565 */

    this.curBucket = new s3.Bucket(this, "CURBucket", {
      bucketName: `curbucket${new Date().getTime()}`, // Set the explicit bucket name

      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const curDatabase = new glueCatalog.CfnDatabase(this, "AWSCURDatabase", {
      catalogId: cdk.Aws.ACCOUNT_ID,
      databaseInput: {
        name: "costexplorerdb",
      },
    });

    const curCrawlerComponentRole = new iam.Role(
      this,
      "AWSCURCrawlerComponentFunction",
      {
        assumedBy: new iam.ServicePrincipal("glue.amazonaws.com"),
      }
    );

    curCrawlerComponentRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AWSGlueServiceRole"
      )
    );

    curCrawlerComponentRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        resources: [
          `arn:aws:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:log-group:*`,
        ],
        effect: iam.Effect.ALLOW,
      })
    );

    curCrawlerComponentRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "glue:UpdateDatabase",
          "glue:UpdatePartition",
          "glue:CreateTable",
          "glue:UpdateTable",
          "glue:ImportCatalogToGlue",
        ],
        resources: ["*"],
        effect: iam.Effect.ALLOW,
      })
    );

    curCrawlerComponentRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject", "s3:PutObject"],
        resources: [`${this.curBucket.bucketArn}*`],
        effect: iam.Effect.ALLOW,
      })
    );

    curCrawlerComponentRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["kms:Decrypt"],
        resources: ["*"],
        effect: iam.Effect.ALLOW,
      })
    );

    const curCrawlerLambdaExecutorRole = new iam.Role(
      this,
      "AWSCURCrawlerLambdaExecutor",
      {
        assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      }
    );

    curCrawlerLambdaExecutorRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        resources: [
          `arn:aws:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:log-group:*`,
        ],
        effect: iam.Effect.ALLOW,
      })
    );

    curCrawlerLambdaExecutorRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["glue:StartCrawler"],
        resources: ["*"],
        effect: iam.Effect.ALLOW,
      })
    );

    new glueCatalog.CfnCrawler(this, "AWSCURCrawler", {
      name: "AWSCURCrawler-Multi-tenant",
      databaseName: curDatabase.ref,
      role: curCrawlerComponentRole.roleArn,
      targets: {
        s3Targets: [
          {
            path: `s3://${this.curBucket.bucketName}/curoutput`,
            exclusions: [
              "**.json",
              "**.yml",
              "**.sql",
              "**.csv",
              "**.gz",
              "**.zip",
            ],
          },
        ],
      },
      schemaChangePolicy: {
        updateBehavior: "UPDATE_IN_DATABASE",
        deleteBehavior: "DELETE_FROM_DATABASE",
      },
    });

    const curInitializer = new lambda.Function(this, "AWSCURInitializer", {
      code: lambda.Code.fromInline(`
          const AWS = require('aws-sdk');
          const response = require('./cfn-response');
          exports.handler = function(event, context, callback) {
            if (event.RequestType === 'Delete') {
              response.send(event, context, response.SUCCESS);
            } else {
              const glue = new AWS.Glue();
              glue.startCrawler({ Name: 'AWSCURCrawler-Multi-tenant' }, function(err, data) {
                if (err) {
                  const responseData = JSON.parse(this.httpResponse.body);
                  if (responseData['__type'] == 'CrawlerRunningException') {
                    callback(null, responseData.Message);
                  } else {
                    const responseString = JSON.stringify(responseData);
                    if (event.ResponseURL) {
                      response.send(event, context, response.FAILED,{ msg: responseString });
                    } else {
                      callback(responseString);
                    }
                  }
                }
                else {
                  if (event.ResponseURL) {
                    response.send(event, context, response.SUCCESS);
                  } else {
                    callback(null, response.SUCCESS);
                  }
                }
              });
            }
          };
        `),
      handler: "index.handler",
      timeout: cdk.Duration.seconds(30),
      runtime: lambda.Runtime.NODEJS_16_X,
      reservedConcurrentExecutions: 1,
      role: curCrawlerLambdaExecutorRole,
    });

    const tenantCostAndUsageAttributionTable = new dynamodb.Table(
      this,
      "TenantCostandUsageAttributionTable",
      {
        tableName: "TenantCostAndUsageAttribution",
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        pointInTimeRecovery: true, //TODO: Choose the appropriate removal policy for different environments
        removalPolicy: cdk.RemovalPolicy.DESTROY, //TODO: Choose the appropriate removal policy for different environments
        partitionKey: { name: "Date", type: dynamodb.AttributeType.NUMBER },
        sortKey: {
          name: "TenantId#ServiceName",
          type: dynamodb.AttributeType.STRING,
        },
      }
    );

    const queryLogInsightsExecutionRole = new iam.Role(
      this,
      "QueryLogInsightsExecutionRole",
      {
        roleName: "query-log-insights-execution-role",
        assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      }
    );

    queryLogInsightsExecutionRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AWSLambdaBasicExecutionRole"
      )
    );

    queryLogInsightsExecutionRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "logs:GetQueryResults",
          "logs:StartQuery",
          "logs:StopQuery",
          "logs:FilterLogEvents",
          "logs:DescribeLogGroups",
          "cloudformation:ListStackResources",
        ],
        resources: ["*"],
        effect: iam.Effect.ALLOW,
      })
    );

    queryLogInsightsExecutionRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["s3:*"],
        resources: [`${this.curBucket.bucketArn}*`],
        effect: iam.Effect.ALLOW,
      })
    );

    queryLogInsightsExecutionRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["dynamodb:*"],
        resources: [tenantCostAndUsageAttributionTable.tableArn],
        effect: iam.Effect.ALLOW,
      })
    );

    queryLogInsightsExecutionRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["Athena:*"],
        resources: ["*"],
        effect: iam.Effect.ALLOW,
      })
    );

    queryLogInsightsExecutionRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["glue:*"],
        resources: ["*"],
        effect: iam.Effect.ALLOW,
      })
    );

    const getDynamoDBUsageAndCostByTenant = new lambda.Function(
      this,
      "GetDynamoDBUsageAndCostByTenant",
      {
        code: lambda.Code.fromAsset("src/services/tenant_cost"),
        handler:
          "tenant_usage_and_cost.calculate_daily_dynamodb_attribution_by_tenant",
        runtime: lambda.Runtime.PYTHON_3_9,
        role: queryLogInsightsExecutionRole,
        environment: {
          ATHENA_S3_OUTPUT: this.curBucket.bucketName,
        },
      }
    );

    const getLambdaUsageAndCostByTenant = new lambda.Function(
      this,
      "GetLambdaUsageAndCostByTenant",
      {
        code: lambda.Code.fromAsset("src/services/tenant_cost"),
        handler:
          "tenant_usage_and_cost.calculate_daily_lambda_attribution_by_tenant",
        runtime: lambda.Runtime.PYTHON_3_9,
        role: queryLogInsightsExecutionRole,
        environment: {
          ATHENA_S3_OUTPUT: this.curBucket.bucketName,
        },
      }
    );

    new events.Rule(this, "DynamoDBUsageAndCostScheduleRule", {
      schedule: events.Schedule.rate(cdk.Duration.minutes(5)),
      targets: [new targets.LambdaFunction(getDynamoDBUsageAndCostByTenant)],
    });

    new events.Rule(this, "LambdaUsageAndCostScheduleRule", {
      schedule: events.Schedule.rate(cdk.Duration.minutes(5)),
      targets: [new targets.LambdaFunction(getLambdaUsageAndCostByTenant)],
    });

    new cdk.CfnOutput(this, "CURBucketname", {
      description: "The name of S3 bucket name",
      value: this.curBucket.bucketName,
      exportName: "CURBucketname",
    });

    new cdk.CfnOutput(this, "AWSCURInitializerFunctionName", {
      description: "Function name of CUR initializer",
      value: curInitializer.functionName,
      exportName: "AWSCURInitializerFunctionName",
    });
  }
}
