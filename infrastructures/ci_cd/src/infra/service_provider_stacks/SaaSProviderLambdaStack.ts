import { NestedStack } from "aws-cdk-lib";
import { Construct } from "constructs";
import { LambdaStackProps } from "shared/prop_extensions.types";
import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as codedeploy from "aws-cdk-lib/aws-codedeploy";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import { Repository } from "aws-cdk-lib/aws-ecr";
import { createContaineredLambdaFunction } from "../utils/lambdaHelpers";

export class SaaSProviderLambdaStack extends NestedStack {
  public readonly registerTenantLambdaExecutionRoleArn: string;
  public readonly tenantManagementLambdaExecutionRoleArn: string;
  public readonly registerTenantFunctionArn: string;
  public readonly provisionTenantFunctionArn: string;
  public readonly deProvisionTenantFunctionArn: string;
  public readonly activateTenantFunctionArn: string;
  public readonly getTenantConfigFunctionArn: string;
  public readonly getTenantsFunctionArn: string;
  public readonly createTenantFunctionArn: string;
  public readonly getTenantFunctionArn: string;
  public readonly deactivateTenantFunctionArn: string;
  public readonly updateTenantFunctionArn: string;
  public readonly getUsersFunctionArn: string;
  public readonly getUserFunctionArn: string;
  public readonly updateUserFunctionArn: string;
  public readonly disableUserFunctionArn: string;
  public readonly createTenantAdminUserFunctionArn: string;
  public readonly createUserFunctionArn: string;
  public readonly disableUsersByTenantFunctionArn: string;
  public readonly enableUsersByTenantFunctionArn: string;
  public readonly updateSettingsTableFunctionArn: string;
  public readonly updateTenantStackMapTableFunctionArn: string;
  public readonly sharedServicesAuthorizerFunctionArn: string;
  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    const {
      cognitoOperationUsersUserPoolId,
      cognitoOperationUsersUserPoolClientId,
      cognitoUserPoolId,
      cognitoUserPoolClientId,
      tenantDetailsTableArn,
      serverlessSaaSSettingsTableArn,
      apiKeyOperationUsersParameter,
      apiKeyPlatinumTierParameter,
      apiKeyPremiumTierParameter,
      apiKeyStandardTierParameter,
      apiKeyBasicTierParameter,
      tenantStackMappingTableArn,
      tenantUserMappingTableArn,
      tenantStackMappingTableName,
      tenantProvisioningPipelineName,
      tenantUserPoolCallbackURLParameter,
      lambdaEcrRepositoryUri,
      lambdaImageTag,
      tenantDetailsTableName,
      tenantUserMappingTableName,
      serverlessSaaSSettingsTableName,
      tenantDetailsTableIndexArn,
      tenantUserMappingTableIndexArn,
    } = props;
    console.log("lambdaImageTag", lambdaImageTag);
    //   use the fetched param value
    const repositoryName = lambdaEcrRepositoryUri.split("/").pop()!;

    // `repository` is of type `IRepository`, not `Repository`
    const lambdaEcrRepository = Repository.fromRepositoryName(
      this,
      "MyRepository",
      repositoryName
    ) as Repository;

    const authorizerExecutionRole = new iam.Role(
      this,
      "AuthorizerExecutionRole",
      {
        roleName: "authorizer-execution-role",
        assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "CloudWatchLambdaInsightsExecutionRolePolicy"
          ),
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "service-role/AWSLambdaBasicExecutionRole"
          ),
          iam.ManagedPolicy.fromAwsManagedPolicyName("AWSXrayWriteOnlyAccess"),
        ],
      }
    );

    authorizerExecutionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["cognito-idp:List*"],
        resources: [
          `arn:aws:cognito-idp:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:userpool/*`,
        ],
      })
    );

    authorizerExecutionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["dynamodb:GetItem"],
        resources: [tenantDetailsTableArn, tenantDetailsTableIndexArn],
      })
    );

    authorizerExecutionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "dynamodb:BatchGetItem",
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
          "dynamodb:Scan",
        ],
        resources: [
          `arn:aws:dynamodb:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:table/*`,
        ],
      })
    );

    const tenantUserPoolLambdaExecutionRole = new iam.Role(
      this,
      "TenantUserPoolLambdaExecutionRole",
      {
        roleName: `tenant-userpool-lambda-execution-role-${cdk.Aws.REGION}`,
        path: "/",
        assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "CloudWatchLambdaInsightsExecutionRolePolicy"
          ),
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "service-role/AWSLambdaBasicExecutionRole"
          ),
          iam.ManagedPolicy.fromAwsManagedPolicyName("AWSXrayWriteOnlyAccess"),
        ],
      }
    );

    tenantUserPoolLambdaExecutionRole.attachInlinePolicy(
      new iam.Policy(this, "TenantUserPoolLambdaExecutionPolicy", {
        document: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ["cognito-idp:*"],
              resources: ["*"],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ["dynamodb:GetItem"],
              resources: [tenantDetailsTableArn, tenantDetailsTableIndexArn],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ["dynamodb:GetItem", "dynamodb:Query"],
              resources: [
                tenantUserMappingTableArn,
                tenantUserMappingTableIndexArn,
              ],
            }),
          ],
        }),
      })
    );

    const createUserLambdaExecutionRole = new iam.Role(
      this,
      "CreateUserLambdaExecutionRole",
      {
        roleName: `create-user-lambda-execution-role-${cdk.Aws.REGION}`,
        path: "/",
        assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "CloudWatchLambdaInsightsExecutionRolePolicy"
          ),
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "service-role/AWSLambdaBasicExecutionRole"
          ),
          iam.ManagedPolicy.fromAwsManagedPolicyName("AWSXrayWriteOnlyAccess"),
        ],
      }
    );

    createUserLambdaExecutionRole.attachInlinePolicy(
      new iam.Policy(this, "CreateUserLambdaExecutionPolicy", {
        document: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ["cognito-idp:*"],
              resources: ["*"],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ["dynamodb:PutItem"],
              resources: [
                tenantUserMappingTableArn,
                tenantUserMappingTableIndexArn,
              ],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ["dynamodb:GetItem"],
              resources: [tenantDetailsTableArn, tenantDetailsTableIndexArn],
            }),
          ],
        }),
      })
    );

    const tenantManagementLambdaExecutionRole = new iam.Role(
      this,
      "TenantManagementLambdaExecutionRole",
      {
        roleName: `tenant-management-lambda-execution-role-${cdk.Aws.REGION}`,
        path: "/",
        assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "CloudWatchLambdaInsightsExecutionRolePolicy"
          ),
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "service-role/AWSLambdaBasicExecutionRole"
          ),
          iam.ManagedPolicy.fromAwsManagedPolicyName("AWSXrayWriteOnlyAccess"),
        ],
      }
    );

    tenantManagementLambdaExecutionRole.attachInlinePolicy(
      new iam.Policy(this, "CreateTenantExecutionPolicy", {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              "dynamodb:PutItem",
              "dynamodb:GetItem",
              "dynamodb:UpdateItem",
              "dynamodb:Scan",
              "dynamodb:Query",
            ],
            resources: [tenantDetailsTableArn, tenantDetailsTableIndexArn],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["dynamodb:GetItem"],
            resources: [serverlessSaaSSettingsTableArn],
          }),
        ],
      })
    );
    const registerTenantLambdaExecutionRole = new iam.Role(
      this,
      "RegisterTenantLambdaExecutionRole",
      {
        roleName: `tenant-registration-lambda-execution-role-${cdk.Aws.REGION}`,
        path: "/",
        assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "CloudWatchLambdaInsightsExecutionRolePolicy"
          ),
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "service-role/AWSLambdaBasicExecutionRole"
          ),
          iam.ManagedPolicy.fromAwsManagedPolicyName("AWSXrayWriteOnlyAccess"),
        ],
      }
    );

    const provisionTenantLambdaExecutionRole = new iam.Role(
      this,
      "ProvisionTenantLambdaExecutionRole",
      {
        roleName: `tenant-provisioning-lambda-execution-role-${cdk.Aws.REGION}`,
        path: "/",
        assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "CloudWatchLambdaInsightsExecutionRolePolicy"
          ),
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "service-role/AWSLambdaBasicExecutionRole"
          ),
          iam.ManagedPolicy.fromAwsManagedPolicyName("AWSXrayWriteOnlyAccess"),
        ],
      }
    );

    provisionTenantLambdaExecutionRole.attachInlinePolicy(
      new iam.Policy(this, "ProvisionTenantLambdaExecutionPolicy", {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["dynamodb:PutItem", "dynamodb:DeleteItem"],
            resources: [tenantStackMappingTableArn],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["codepipeline:StartPipelineExecution"],
            resources: [
              `arn:aws:codepipeline:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:${props.tenantProvisioningPipelineName}`,
            ],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["cloudformation:DeleteStack"],
            resources: ["*"],
          }),
        ],
      })
    );

    const deProvisionTenantLambdaExecutionRole = new iam.Role(
      this,
      "DeProvisionTenantLambdaExecutionRole",
      {
        roleName: `tenant-deprovisioning-lambda-execution-role-${cdk.Aws.REGION}`,
        path: "/",
        assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "CloudWatchLambdaInsightsExecutionRolePolicy"
          ),
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "service-role/AWSLambdaBasicExecutionRole"
          ),
          iam.ManagedPolicy.fromAwsManagedPolicyName("AWSXrayWriteOnlyAccess"),
        ],
      }
    );

    deProvisionTenantLambdaExecutionRole.attachInlinePolicy(
      new iam.Policy(this, "DeProvisionTenantLambdaExecutionPolicy", {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["*"],
            resources: ["*"],
          }),
        ],
      })
    );
    const updateSettingsTableLambdaExecutionRole = new iam.Role(
      this,
      "UpdateSettingsTableLambdaExecutionRole",
      {
        roleName: `update-settingstable-lambda-execution-role-${cdk.Aws.REGION}`,
        path: "/",
        assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "CloudWatchLambdaInsightsExecutionRolePolicy"
          ),
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "service-role/AWSLambdaBasicExecutionRole"
          ),
          iam.ManagedPolicy.fromAwsManagedPolicyName("AWSXrayWriteOnlyAccess"),
        ],
      }
    );

    updateSettingsTableLambdaExecutionRole.attachInlinePolicy(
      new iam.Policy(this, "UpdateSettingsTableLambdaExecutionPolicy", {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["dynamodb:PutItem"],
            resources: [serverlessSaaSSettingsTableArn],
          }),
        ],
      })
    );

    const updateTenantStackMapTableLambdaExecutionRole = new iam.Role(
      this,
      "UpdateTenantStackMapTableLambdaExecutionRole",
      {
        roleName: `update-tenantstackmap-lambda-execution-role-${cdk.Aws.REGION}`,
        path: "/",
        assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "CloudWatchLambdaInsightsExecutionRolePolicy"
          ),
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "service-role/AWSLambdaBasicExecutionRole"
          ),
          iam.ManagedPolicy.fromAwsManagedPolicyName("AWSXrayWriteOnlyAccess"),
        ],
      }
    );

    updateTenantStackMapTableLambdaExecutionRole.attachInlinePolicy(
      new iam.Policy(this, "UpdateTenantStackMapTableLambdaExecutionPolicy", {
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["dynamodb:PutItem"],
            resources: [tenantStackMappingTableArn],
          }),
        ],
      })
    );

    const sharedServicesAuthorizerFunction = createContaineredLambdaFunction(
      this,
      {
        functionName: "sharedServicesAuthorizerFunction",
        lambdaEcrRepository: lambdaEcrRepository,
        imageTag: lambdaImageTag,
        handlerName: "shared_service_authorizer.lambda_handler",
        role: authorizerExecutionRole,
        tracing: lambda.Tracing.ACTIVE,

        environment: {
          TENANT_DETAILS_TABLE_NAME: tenantDetailsTableName,
          OPERATION_USERS_USER_POOL: cognitoOperationUsersUserPoolId,
          OPERATION_USERS_APP_CLIENT: cognitoOperationUsersUserPoolClientId,
          OPERATION_USERS_API_KEY: apiKeyOperationUsersParameter,
          AUTHORIZER_EXECUTION_ROLE_NAME: authorizerExecutionRole.roleName,
        },
        aliasName: "live",
        deploymentConfig:
          codedeploy.LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
        alarmDescription: "Lambda function canary errors",
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        evaluationPeriods: 2,
        threshold: 0,
        statistic: cloudwatch.Statistic.SUM,
        period: cdk.Duration.seconds(60),
      }
    );

    const createTenantAdminUserFunction = createContaineredLambdaFunction(
      this,
      {
        functionName: "createTenantAdminUserFunction",
        lambdaEcrRepository: lambdaEcrRepository,
        imageTag: lambdaImageTag,
        handlerName: "user-management.create_tenant_admin_user",
        role: createUserLambdaExecutionRole,
        tracing: lambda.Tracing.ACTIVE,

        environment: {
          TENANT_USER_MAP_TABLE_NAME: tenantUserMappingTableName,
          TENANT_DETAILS_TABLE_NAME: tenantDetailsTableName,
          TENANT_USER_POOL_ID: cognitoUserPoolId,
          TENANT_APP_CLIENT_ID: cognitoUserPoolClientId,
          TENANT_USER_POOL_CALLBACK_URL: cdk.Fn.join("", [
            "https://",
            tenantUserPoolCallbackURLParameter,
            "/",
          ]),
          POWERTOOLS_SERVICE_NAME: "UserManagement.CreateTenantAdmin",
        },
        aliasName: "live",
        deploymentConfig:
          codedeploy.LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
        alarmDescription: "Lambda function canary errors",
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        evaluationPeriods: 2,
        threshold: 0,
        statistic: cloudwatch.Statistic.SUM,
        period: cdk.Duration.seconds(60),
      }
    );

    const createTenantNormalUserFunction = createContaineredLambdaFunction(
      this,
      {
        functionName: "createTenantNormalUserFunction",
        lambdaEcrRepository: lambdaEcrRepository,
        imageTag: lambdaImageTag,
        handlerName: "user-management.create_user",
        role: createUserLambdaExecutionRole,
        tracing: lambda.Tracing.ACTIVE,

        environment: {
          POWERTOOLS_SERVICE_NAME: "UserManagement.CreateUser",
          TENANT_USER_MAP_TABLE_NAME: tenantUserMappingTableName,
          TENANT_DETAILS_TABLE_NAME: tenantDetailsTableName,
        },
        aliasName: "live",
        deploymentConfig:
          codedeploy.LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
        alarmDescription: "Lambda function canary errors",
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        evaluationPeriods: 2,
        threshold: 0,
        statistic: cloudwatch.Statistic.SUM,
        period: cdk.Duration.seconds(60),
      }
    );

    const updateTenantNormalUserFunction = createContaineredLambdaFunction(
      this,
      {
        functionName: "updateTenantNormalUserFunction",
        lambdaEcrRepository: lambdaEcrRepository,
        imageTag: lambdaImageTag,
        handlerName: "user-management.update_user",
        role: tenantUserPoolLambdaExecutionRole,
        tracing: lambda.Tracing.ACTIVE,

        environment: {
          POWERTOOLS_SERVICE_NAME: "UserManagement.UpdateUser",
          TENANT_USER_MAP_TABLE_NAME: tenantUserMappingTableName,
          TENANT_DETAILS_TABLE_NAME: tenantDetailsTableName,
        },
        aliasName: "live",
        deploymentConfig:
          codedeploy.LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
        alarmDescription: "Lambda function canary errors",
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        evaluationPeriods: 2,
        threshold: 0,
        statistic: cloudwatch.Statistic.SUM,
        period: cdk.Duration.seconds(60),
      }
    );

    const disableTenantNormalUserFunction = createContaineredLambdaFunction(
      this,
      {
        functionName: "disableTenantNormalUserFunction",
        lambdaEcrRepository: lambdaEcrRepository,
        imageTag: lambdaImageTag,
        handlerName: "user-management.disable_user",
        role: tenantUserPoolLambdaExecutionRole,
        tracing: lambda.Tracing.ACTIVE,

        environment: {
          POWERTOOLS_SERVICE_NAME: "UserManagement.DisableUser",
          TENANT_USER_MAP_TABLE_NAME: tenantUserMappingTableName,
          TENANT_DETAILS_TABLE_NAME: tenantDetailsTableName,
        },
        aliasName: "live",
        deploymentConfig:
          codedeploy.LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
        alarmDescription: "Lambda function canary errors",
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        evaluationPeriods: 2,
        threshold: 0,
        statistic: cloudwatch.Statistic.SUM,
        period: cdk.Duration.seconds(60),
      }
    );
    const disableUsersByTenantFunction = createContaineredLambdaFunction(this, {
      functionName: "disableUsersByTenantFunction",
      lambdaEcrRepository: lambdaEcrRepository,
      imageTag: lambdaImageTag,
      handlerName: "user-management.disable_users_by_tenant",
      role: tenantUserPoolLambdaExecutionRole,
      tracing: lambda.Tracing.ACTIVE,

      environment: {
        POWERTOOLS_SERVICE_NAME: "UserManagement.DisableUsersByTenant",
        TENANT_USER_MAP_TABLE_NAME: tenantUserMappingTableName,
        TENANT_DETAILS_TABLE_NAME: tenantDetailsTableName,
      },
      aliasName: "live",
      deploymentConfig:
        codedeploy.LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
      alarmDescription: "Lambda function canary errors",
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 2,
      threshold: 0,
      statistic: cloudwatch.Statistic.SUM,
      period: cdk.Duration.seconds(60),
    });
    const enableUsersByTenantFunction = createContaineredLambdaFunction(this, {
      functionName: "enableUsersByTenantFunction",
      lambdaEcrRepository: lambdaEcrRepository,
      imageTag: lambdaImageTag,
      handlerName: "user-management.enable_users_by_tenant",
      role: tenantUserPoolLambdaExecutionRole,
      tracing: lambda.Tracing.ACTIVE,

      environment: {
        POWERTOOLS_SERVICE_NAME: "UserManagement.EnableUsersByTenant",
        TENANT_USER_MAP_TABLE_NAME: tenantUserMappingTableName,
        TENANT_DETAILS_TABLE_NAME: tenantDetailsTableName,
      },
      aliasName: "live",
      deploymentConfig:
        codedeploy.LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
      alarmDescription: "Lambda function canary errors",
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 2,
      threshold: 0,
      statistic: cloudwatch.Statistic.SUM,
      period: cdk.Duration.seconds(60),
    });

    const getUserFunction = createContaineredLambdaFunction(this, {
      functionName: "getUserFunction",
      lambdaEcrRepository: lambdaEcrRepository,
      imageTag: lambdaImageTag,
      handlerName: "user-management.get_user",
      role: tenantUserPoolLambdaExecutionRole,
      tracing: lambda.Tracing.ACTIVE,

      environment: {
        POWERTOOLS_SERVICE_NAME: "UserManagement.GetUser",
        TENANT_USER_MAP_TABLE_NAME: tenantUserMappingTableName,
        TENANT_DETAILS_TABLE_NAME: tenantDetailsTableName,
      },
      aliasName: "live",
      deploymentConfig:
        codedeploy.LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
      alarmDescription: "Lambda function canary errors",
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 2,
      threshold: 0,
      statistic: cloudwatch.Statistic.SUM,
      period: cdk.Duration.seconds(60),
    });

    const getUsersFunction = createContaineredLambdaFunction(this, {
      functionName: "getUsersFunction",
      lambdaEcrRepository: lambdaEcrRepository,
      imageTag: lambdaImageTag,
      handlerName: "user-management.get_users",
      role: tenantUserPoolLambdaExecutionRole,
      tracing: lambda.Tracing.ACTIVE,

      environment: {
        POWERTOOLS_SERVICE_NAME: "UserManagement.GetUsers",
        TENANT_USER_MAP_TABLE_NAME: tenantUserMappingTableName,
        TENANT_DETAILS_TABLE_NAME: tenantDetailsTableName,
      },
      aliasName: "live",
      deploymentConfig:
        codedeploy.LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
      alarmDescription: "Lambda function canary errors",
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 2,
      threshold: 0,
      statistic: cloudwatch.Statistic.SUM,
      period: cdk.Duration.seconds(60),
    });
    // Tenant Management
    const createTenantFunction = createContaineredLambdaFunction(this, {
      functionName: "createTenantFunction",
      lambdaEcrRepository: lambdaEcrRepository,
      imageTag: lambdaImageTag,
      handlerName: "tenant-management.create_tenant",
      role: tenantManagementLambdaExecutionRole,
      tracing: lambda.Tracing.ACTIVE,

      environment: {
        POWERTOOLS_SERVICE_NAME: "TenantManagement.CreateTenant",
        SYSTEM_SETTINGS_TABLE_NAME: serverlessSaaSSettingsTableName,
        TENANT_DETAILS_TABLE_NAME: tenantDetailsTableName,
      },
      aliasName: "live",
      deploymentConfig:
        codedeploy.LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
      alarmDescription: "Lambda function canary errors",
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 2,
      threshold: 0,
      statistic: cloudwatch.Statistic.SUM,
      period: cdk.Duration.seconds(60),
    });

    const activateTenantFunction = createContaineredLambdaFunction(this, {
      functionName: "activateTenantFunction",
      lambdaEcrRepository: lambdaEcrRepository,
      imageTag: lambdaImageTag,
      handlerName: "tenant-management.activate_tenant",
      role: tenantManagementLambdaExecutionRole,
      tracing: lambda.Tracing.ACTIVE,

      environment: {
        POWERTOOLS_SERVICE_NAME: "TenantManagement.ActivateTenant",
        ENABLE_USERS_BY_TENANT: "/users/enable",
        PROVISION_TENANT: "/provisioning/",
        SYSTEM_SETTINGS_TABLE_NAME: serverlessSaaSSettingsTableName,
        TENANT_DETAILS_TABLE_NAME: tenantDetailsTableName,
      },
      aliasName: "live",
      deploymentConfig:
        codedeploy.LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
      alarmDescription: "Lambda function canary errors",
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 2,
      threshold: 0,
      statistic: cloudwatch.Statistic.SUM,
      period: cdk.Duration.seconds(60),
    });

    const getTenantFunction = createContaineredLambdaFunction(this, {
      functionName: "getTenantFunction",
      lambdaEcrRepository: lambdaEcrRepository,
      imageTag: lambdaImageTag,
      handlerName: "tenant-management.get_tenant",
      role: tenantManagementLambdaExecutionRole,
      tracing: lambda.Tracing.ACTIVE,

      environment: {
        POWERTOOLS_SERVICE_NAME: "TenantManagement.GetTenant",
        SYSTEM_SETTINGS_TABLE_NAME: serverlessSaaSSettingsTableName,
        TENANT_DETAILS_TABLE_NAME: tenantDetailsTableName,
      },
      aliasName: "live",
      deploymentConfig:
        codedeploy.LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
      alarmDescription: "Lambda function canary errors",
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 2,
      threshold: 0,
      statistic: cloudwatch.Statistic.SUM,
      period: cdk.Duration.seconds(60),
    });
    const deactivateTenantFunction = createContaineredLambdaFunction(this, {
      functionName: "deactivateTenantFunction",
      lambdaEcrRepository: lambdaEcrRepository,
      imageTag: lambdaImageTag,
      handlerName: "tenant-management.deactivate_tenant",
      role: tenantManagementLambdaExecutionRole,
      tracing: lambda.Tracing.ACTIVE,

      environment: {
        POWERTOOLS_SERVICE_NAME: "TenantManagement.DeactivateTenant",
        DEPROVISION_TENANT: "/provisioning/",
        DISABLE_USERS_BY_TENANT: "/users/disable",
        SYSTEM_SETTINGS_TABLE_NAME: serverlessSaaSSettingsTableName,
        TENANT_DETAILS_TABLE_NAME: tenantDetailsTableName,
      },
      aliasName: "live",
      deploymentConfig:
        codedeploy.LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
      alarmDescription: "Lambda function canary errors",
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 2,
      threshold: 0,
      statistic: cloudwatch.Statistic.SUM,
      period: cdk.Duration.seconds(60),
    });

    const updateTenantFunction = createContaineredLambdaFunction(this, {
      functionName: "updateTenantFunction",
      lambdaEcrRepository: lambdaEcrRepository,
      imageTag: lambdaImageTag,
      handlerName: "tenant-management.update_tenant",
      role: tenantManagementLambdaExecutionRole,
      tracing: lambda.Tracing.ACTIVE,

      environment: {
        POWERTOOLS_SERVICE_NAME: "TenantManagement.UpdateTenant",
        PLATINUM_TIER_API_KEY: apiKeyPlatinumTierParameter,
        PREMIUM_TIER_API_KEY: apiKeyPremiumTierParameter,
        STANDARD_TIER_API_KEY: apiKeyStandardTierParameter,
        BASIC_TIER_API_KEY: apiKeyBasicTierParameter,
        SYSTEM_SETTINGS_TABLE_NAME: serverlessSaaSSettingsTableName,
        TENANT_DETAILS_TABLE_NAME: tenantDetailsTableName,
      },
      aliasName: "live",
      deploymentConfig:
        codedeploy.LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
      alarmDescription: "Lambda function canary errors",
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 2,
      threshold: 0,
      statistic: cloudwatch.Statistic.SUM,
      period: cdk.Duration.seconds(60),
    });

    const getTenantsFunction = createContaineredLambdaFunction(this, {
      functionName: "getTenantsFunction",
      lambdaEcrRepository: lambdaEcrRepository,
      imageTag: lambdaImageTag,
      handlerName: "tenant-management.get_tenants",
      role: tenantManagementLambdaExecutionRole,
      tracing: lambda.Tracing.ACTIVE,

      environment: {
        POWERTOOLS_SERVICE_NAME: "TenantManagement.GetTenants",
        SYSTEM_SETTINGS_TABLE_NAME: serverlessSaaSSettingsTableName,
        TENANT_DETAILS_TABLE_NAME: tenantDetailsTableName,
      },
      aliasName: "live",
      deploymentConfig:
        codedeploy.LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
      alarmDescription: "Lambda function canary errors",
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 2,
      threshold: 0,
      statistic: cloudwatch.Statistic.SUM,
      period: cdk.Duration.seconds(60),
    });
    const loadTenantConfigFunction = createContaineredLambdaFunction(this, {
      functionName: "loadTenantConfigFunction",
      lambdaEcrRepository: lambdaEcrRepository,
      imageTag: lambdaImageTag,
      handlerName: "tenant-management.load_tenant_config",
      role: tenantManagementLambdaExecutionRole,
      tracing: lambda.Tracing.ACTIVE,

      environment: {
        POWERTOOLS_SERVICE_NAME: "TenantManagement.LoadTenantConfig",
        SYSTEM_SETTINGS_TABLE_NAME: serverlessSaaSSettingsTableName,
        TENANT_DETAILS_TABLE_NAME: tenantDetailsTableName,
      },
      aliasName: "live",
      deploymentConfig:
        codedeploy.LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
      alarmDescription: "Lambda function canary errors",
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 2,
      threshold: 0,
      statistic: cloudwatch.Statistic.SUM,
      period: cdk.Duration.seconds(60),
    });
    //  #Tenant Registration
    const registerTenantFunction = createContaineredLambdaFunction(this, {
      functionName: "registerTenantFunction",
      lambdaEcrRepository: lambdaEcrRepository,
      imageTag: lambdaImageTag,
      handlerName: "tenant-registration.register_tenant",
      role: registerTenantLambdaExecutionRole,
      tracing: lambda.Tracing.ACTIVE,

      environment: {
        TENANT_USER_MAP_TABLE_NAME: tenantUserMappingTableName,
        CREATE_TENANT_ADMIN_USER_RESOURCE_PATH: "/user/tenant-admin",
        CREATE_TENANT_RESOURCE_PATH: "/tenant",
        PROVISION_TENANT_RESOURCE_PATH: "/provisioning",
        PLATINUM_TIER_API_KEY: apiKeyPlatinumTierParameter,
        PREMIUM_TIER_API_KEY: apiKeyPremiumTierParameter,
        STANDARD_TIER_API_KEY: apiKeyStandardTierParameter,
        BASIC_TIER_API_KEY: apiKeyBasicTierParameter,
        POWERTOOLS_SERVICE_NAME: "TenantRegistration.RegisterTenant",
      },
      aliasName: "live",
      deploymentConfig:
        codedeploy.LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
      alarmDescription: "Lambda function canary errors",
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 2,
      threshold: 0,
      statistic: cloudwatch.Statistic.SUM,
      period: cdk.Duration.seconds(60),
    });

    // #Tenant Provisioning

    const provisionTenantFunction = createContaineredLambdaFunction(this, {
      functionName: "provisionTenantFunction",
      lambdaEcrRepository: lambdaEcrRepository,
      imageTag: lambdaImageTag,
      handlerName: "tenant-provisioning.provision_tenant",
      role: provisionTenantLambdaExecutionRole,
      tracing: lambda.Tracing.ACTIVE,

      environment: {
        TENANT_STACK_MAPPING_TABLE_NAME: tenantStackMappingTableName,
        TENANT_PROVISIONING_PIPELINE_NAME: tenantProvisioningPipelineName,
        POWERTOOLS_SERVICE_NAME: "TenantProvisioning.ProvisionTenantFunction",
      },
      aliasName: "live",
      deploymentConfig:
        codedeploy.LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
      alarmDescription: "Lambda function canary errors",
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 2,
      threshold: 0,
      statistic: cloudwatch.Statistic.SUM,
      period: cdk.Duration.seconds(60),
    });

    const deProvisionTenantFunction = createContaineredLambdaFunction(this, {
      functionName: "deProvisionTenantFunction",
      lambdaEcrRepository: lambdaEcrRepository,
      imageTag: lambdaImageTag,
      handlerName: "tenant-provisioning.deprovision_tenant",
      role: deProvisionTenantLambdaExecutionRole,
      tracing: lambda.Tracing.ACTIVE,

      environment: {
        TENANT_STACK_MAPPING_TABLE_NAME: tenantStackMappingTableName,

        POWERTOOLS_SERVICE_NAME: "TenantProvisioning.DeProvisionTenantFunction",
      },
      aliasName: "live",
      deploymentConfig:
        codedeploy.LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
      alarmDescription: "Lambda function canary errors",
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 2,
      threshold: 0,
      statistic: cloudwatch.Statistic.SUM,
      period: cdk.Duration.seconds(60),
    });

    const updateSettingsTableFunction = createContaineredLambdaFunction(this, {
      functionName: "updateSettingsTableFunction",
      lambdaEcrRepository: lambdaEcrRepository,
      imageTag: lambdaImageTag,
      handlerName: "update_settings_table.handler",

      role: updateSettingsTableLambdaExecutionRole,
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        POWERTOOLS_SERVICE_NAME: "UpdateSettings",
      },
      aliasName: "live",
      deploymentConfig:
        codedeploy.LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
      alarmDescription: "Lambda function canary errors",
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 2,
      threshold: 0,
      statistic: cloudwatch.Statistic.SUM,
      period: cdk.Duration.seconds(60),
    });

    const updateTenantStackMapTableFunction = createContaineredLambdaFunction(
      this,
      {
        functionName: "updateTenantStackMapTableFunction",
        lambdaEcrRepository: lambdaEcrRepository,
        imageTag: lambdaImageTag,
        handlerName: "update_tenantstackmap_table.handler",
        role: updateTenantStackMapTableLambdaExecutionRole,
        tracing: lambda.Tracing.ACTIVE,
        environment: {
          POWERTOOLS_SERVICE_NAME: "UpdateTenantStackMap",
        },
        aliasName: "live",
        deploymentConfig:
          codedeploy.LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
        alarmDescription: "Lambda function canary errors",
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        evaluationPeriods: 2,
        threshold: 0,
        statistic: cloudwatch.Statistic.SUM,
        period: cdk.Duration.seconds(60),
      }
    );

    this.registerTenantLambdaExecutionRoleArn =
      registerTenantLambdaExecutionRole.roleArn;
    this.tenantManagementLambdaExecutionRoleArn =
      tenantManagementLambdaExecutionRole.roleArn;
    this.registerTenantFunctionArn = registerTenantFunction.functionArn;
    this.provisionTenantFunctionArn = provisionTenantFunction.functionArn;
    this.deProvisionTenantFunctionArn = deProvisionTenantFunction.functionArn;
    this.activateTenantFunctionArn = activateTenantFunction.functionArn;
    this.getTenantConfigFunctionArn = loadTenantConfigFunction.functionArn;
    this.getTenantsFunctionArn = getTenantsFunction.functionArn;
    this.createTenantFunctionArn = createTenantFunction.functionArn;
    this.getTenantFunctionArn = getTenantFunction.functionArn;
    this.deactivateTenantFunctionArn = deactivateTenantFunction.functionArn;
    this.updateTenantFunctionArn = updateTenantFunction.functionArn;
    this.getUsersFunctionArn = getUsersFunction.functionArn;
    this.getUserFunctionArn = getUserFunction.functionArn;
    this.updateUserFunctionArn = updateTenantNormalUserFunction.functionArn;
    this.disableUserFunctionArn = disableTenantNormalUserFunction.functionArn;
    this.createTenantAdminUserFunctionArn =
      createTenantAdminUserFunction.functionArn;
    this.createUserFunctionArn = createTenantNormalUserFunction.functionArn;
    this.disableUsersByTenantFunctionArn =
      disableUsersByTenantFunction.functionArn;
    this.enableUsersByTenantFunctionArn =
      enableUsersByTenantFunction.functionArn;
    this.sharedServicesAuthorizerFunctionArn =
      sharedServicesAuthorizerFunction.functionArn;
    this.updateSettingsTableFunctionArn =
      updateSettingsTableFunction.functionArn;
    this.updateTenantStackMapTableFunctionArn =
      updateTenantStackMapTableFunction.functionArn;
  }
}
