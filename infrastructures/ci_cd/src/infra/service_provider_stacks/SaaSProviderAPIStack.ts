import * as constructs from "constructs";
import {
  ResourceConfig,
  SecurityTypeOptions,
  SaaSProviderAPIStackProps as SystemProviderAPIStackProps,
} from "@/shared/prop_extensions.types";
import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as logs from "aws-cdk-lib/aws-logs";
import * as lambda from "aws-cdk-lib/aws-lambda";

import { ApiKeySourceType } from "aws-cdk-lib/aws-apigateway";
import { LambdaIntegrationHelper } from "../utils/lambdaHelpers";
import { generateLogicalId } from "../utils/Utils";
import { constructApi } from "../utils/apigwHelper";
import { SystemProviderInfraStackNameDict } from "../../shared/Constants";
export class SystemProviderAPIStack extends cdk.NestedStack {
  public readonly usagePlanBasicTier: string;
  public readonly usagePlanStandardTier: string;
  public readonly usagePlanPremiumTier: string;
  public readonly usagePlanPlatinumTier: string;
  public readonly restApiId: string;
  public readonly restApiIdStageName: string;
  constructor(
    scope: constructs.Construct,
    id: string,
    props: SystemProviderAPIStackProps
  ) {
    super(scope, id, props);
    const {
      stageName,
      registerTenantLambdaExecutionRoleArn,
      tenantManagementLambdaExecutionRoleArn,
      registerTenantFunctionArn,
      provisionTenantFunctionArn,
      deProvisionTenantFunctionArn,
      activateTenantFunctionArn,
      getTenantsFunctionArn,
      createTenantFunctionArn,
      getTenantFunctionArn,
      deactivateTenantFunctionArn,
      updateTenantFunctionArn,
      getTenantConfigFunctionArn,
      getUsersFunctionArn,
      getUserFunctionArn,
      updateUserFunctionArn,
      disableUserFunctionArn,
      createTenantAdminUserFunctionArn,
      createUserFunctionArn,
      disableUsersByTenantFunctionArn,
      enableUsersByTenantFunctionArn,
      sharedServicesAuthorizerFunctionArn,
      apiKeyOperationUsersParameter,
      apiKeyPlatinumTierParameter,
      apiKeyPremiumTierParameter,
      apiKeyStandardTierParameter,
      apiKeyBasicTierParameter,
      tenantId,
    } = props;
    // Usage example:
    const lambdaFunctionArns: Record<string, string> = {
      registerTenant: registerTenantFunctionArn,
      provisionTenant: provisionTenantFunctionArn,
      deProvisionTenant: deProvisionTenantFunctionArn,
      activateTenant: activateTenantFunctionArn,
      getTenants: getTenantsFunctionArn,
      createTenant: createTenantFunctionArn,
      getTenant: getTenantFunctionArn,
      deactivateTenant: deactivateTenantFunctionArn,
      updateTenant: updateTenantFunctionArn,
      getTenantConfig: getTenantConfigFunctionArn,
      getUsers: getUsersFunctionArn,
      getUser: getUserFunctionArn,
      updateUser: updateUserFunctionArn,
      disableUser: disableUserFunctionArn,
      createTenantAdminUser: createTenantAdminUserFunctionArn,
      createUser: createUserFunctionArn,
      disableUsersByTenant: disableUsersByTenantFunctionArn,
      enableUsersByTenant: enableUsersByTenantFunctionArn,
    };
    type IntegrationKey =
      | "registerTenantIntegration"
      | "tenantManagementIntegration"
      | "provisionTenantIntegration"
      | "deProvisionTenantIntegration"
      | "activateTenantIntegration"
      | "getTenantsIntegration"
      | "createTenantIntegration"
      | "getTenantIntegration"
      | "deactivateTenantIntegration"
      | "updateTenantIntegration"
      | "getTenantConfigIntegration"
      | "getUsersIntegration"
      | "getUserIntegration"
      | "updateUserIntegration"
      | "disableUserIntegration"
      | "createTenantAdminUserIntegration"
      | "createUserIntegration"
      | "disableUsersByTenantIntegration"
      | "enableUsersByTenantIntegration"
      | "authorizerFunctionIntegration";

    type FunctionKey =
      | "registerTenantFunction"
      | "tenantManagementFunction"
      | "provisionTenantFunction"
      | "deProvisionTenantFunction"
      | "activateTenantFunction"
      | "getTenantsFunction"
      | "createTenantFunction"
      | "getTenantFunction"
      | "deactivateTenantFunction"
      | "updateTenantFunction"
      | "getTenantConfigFunction"
      | "getUsersFunction"
      | "getUserFunction"
      | "updateUserFunction"
      | "disableUserFunction"
      | "createTenantAdminUserFunction"
      | "createUserFunction"
      | "disableUsersByTenantFunction"
      | "enableUsersByTenantFunction"
      | "authorizerFunction";
    const helper = new LambdaIntegrationHelper<FunctionKey, IntegrationKey>(
      this,
      lambdaFunctionArns
    );
    const systemProviderApiGatewayAccessLogs = new logs.LogGroup(
      this,
      generateLogicalId(
        SystemProviderInfraStackNameDict.systemProviderApiGatewayAccessLogs,
        tenantId
      ),
      {
        retention: logs.RetentionDays.ONE_MONTH,
      }
    );
    const systemProviderApiGatewayCloudWatchLogRole = new iam.Role(
      this,
      generateLogicalId(
        SystemProviderInfraStackNameDict.systemProviderApiGatewayCloudWatchLogRole,
        tenantId
      ),
      {
        path: "/",
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "service-role/AmazonAPIGatewayPushToCloudWatchLogs"
          ),
        ],
        assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com"),
      }
    );

    new apigateway.CfnAccount(
      this,
      generateLogicalId(
        SystemProviderInfraStackNameDict.systemProviderApiGatewayCloudWatchLogRoleArn,
        tenantId
      ),
      {
        cloudWatchRoleArn: systemProviderApiGatewayCloudWatchLogRole.roleArn,
      }
    );

    const systemProviderApiGW = new apigateway.RestApi(
      this,
      generateLogicalId(
        SystemProviderInfraStackNameDict.systemProviderApiGW,
        tenantId
      ),
      {
        cloudWatchRole: true,
        apiKeySourceType: ApiKeySourceType.AUTHORIZER,
        defaultCorsPreflightOptions: {
          allowOrigins: apigateway.Cors.ALL_ORIGINS,
          allowMethods: apigateway.Cors.ALL_METHODS, // this is also the default
        },
        deployOptions: {
          accessLogDestination: new apigateway.LogGroupLogDestination(
            systemProviderApiGatewayAccessLogs
          ),
          stageName: `${stageName}`,
          accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
            caller: true,
            httpMethod: true,
            ip: true,
            protocol: true,
            requestTime: true,
            resourcePath: true,
            responseLength: true,
            status: true,
            user: true,
          }),
          tracingEnabled: true,
          methodOptions: {
            "/*/*": {
              dataTraceEnabled: false,
              loggingLevel: apigateway.MethodLoggingLevel.INFO,
              metricsEnabled: true,
              //TODO: accepts 100 requests per minute, allowing burst up to 200 requests per minute
              throttlingRateLimit: 100,
              throttlingBurstLimit: 200,
            },
          },
        },
        policy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              principals: [new iam.AnyPrincipal()],
              actions: ["execute-api:Invoke"],
              resources: ["execute-api:/*/*/*"],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.DENY,
              principals: [new iam.AnyPrincipal()],
              actions: ["execute-api:Invoke"],
              resources: [
                `execute-api:/${stageName}/POST/tenant`,
                `execute-api:/${stageName}/POST/user/tenant-admin`,
                `execute-api:/${stageName}/POST/provisioning`,
              ],
              conditions: {
                StringNotEquals: {
                  "aws:PrincipalArn": [
                    registerTenantLambdaExecutionRoleArn,
                    tenantManagementLambdaExecutionRoleArn,
                  ],
                },
              },
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.DENY,
              principals: [new iam.AnyPrincipal()],
              actions: ["execute-api:Invoke"],
              resources: [`execute-api:/${stageName}/PUT/users/disable`],
              conditions: {
                StringNotEquals: {
                  "aws:PrincipalArn": [tenantManagementLambdaExecutionRoleArn],
                },
              },
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.DENY,
              principals: [new iam.AnyPrincipal()],
              actions: ["execute-api:Invoke"],
              resources: [`execute-api:/${stageName}/PUT/users/enable`],
              conditions: {
                StringNotEquals: {
                  "aws:PrincipalArn": [tenantManagementLambdaExecutionRoleArn],
                },
              },
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.DENY,
              principals: [new iam.AnyPrincipal()],
              actions: ["execute-api:invoke"],
              resources: [
                `execute-api:/${stageName}/PUT/provisioning/{tenantid}`,
              ],
              conditions: {
                StringNotEquals: {
                  "aws.PrincipalArn": [tenantManagementLambdaExecutionRoleArn],
                },
              },
            }),
          ],
        }),
      }
    );

    // Create API Keys
    const apiGatewayApiKeySystemAdminProd = new apigateway.ApiKey(
      this,
      generateLogicalId(
        SystemProviderInfraStackNameDict.APIGatewayApiKeySystemAdminProd,
        tenantId
      ),
      {
        //TODO: need to be fixed in real services
        stages: [systemProviderApiGW.deploymentStage],

        description: "This is the api key to be used by system admin",
        enabled: true,
        apiKeyName:
          SystemProviderInfraStackNameDict.ServerlessSaaSSysAdminApiKeyProd,
        value: apiKeyOperationUsersParameter,
      }
    );

    const apiGatewayApiKeyPlatinumTierProd = new apigateway.ApiKey(
      this,
      generateLogicalId(
        SystemProviderInfraStackNameDict.APIGatewayApiKeyPlatinumTierProd,
        tenantId
      ),

      {
        stages: [systemProviderApiGW.deploymentStage],
        description: "This is the api key to be used by platinum tier tenants",
        enabled: true,
        apiKeyName:
          SystemProviderInfraStackNameDict.ServerlessSaaSPlatinumTierApiKeyProd,
        value: apiKeyPlatinumTierParameter,
      }
    );

    const apiGatewayApiKeyPremiumTierProd = new apigateway.ApiKey(
      this,
      generateLogicalId(
        SystemProviderInfraStackNameDict.APIGatewayApiKeyPremiumTierProd,
        tenantId
      ),

      {
        stages: [systemProviderApiGW.deploymentStage],

        description: "This is the api key to be used by premium tier tenants",
        enabled: true,
        apiKeyName:
          SystemProviderInfraStackNameDict.ServerlessSaaSPremiumTierApiKeyProd,
        value: apiKeyPremiumTierParameter,
      }
    );

    const apiGatewayApiKeyStandardTierProd = new apigateway.ApiKey(
      this,
      generateLogicalId(
        SystemProviderInfraStackNameDict.APIGatewayApiKeyStandardTierProd,
        tenantId
      ),

      {
        stages: [systemProviderApiGW.deploymentStage],

        description: "This is the api key to be used by standard tier tenants",
        enabled: true,
        apiKeyName:
          SystemProviderInfraStackNameDict.ServerlessSaaSStandardTierApiKeyProd,
        value: apiKeyStandardTierParameter,
      }
    );

    const apiGatewayApiKeyBasicTierProd = new apigateway.ApiKey(
      this,
      generateLogicalId(
        SystemProviderInfraStackNameDict.APIGatewayApiKeyBasicTierProd,
        tenantId
      ),

      {
        stages: [systemProviderApiGW.deploymentStage],

        description: "This is the api key to be used by basic tier tenants",
        enabled: true,
        apiKeyName:
          SystemProviderInfraStackNameDict.ServerlessSaaSBasicTierApiKeyProd,
        value: apiKeyBasicTierParameter,
      }
    );

    // Create Usage Plans
    const usagePlanPremiumTier = new apigateway.UsagePlan(
      this,
      generateLogicalId(
        SystemProviderInfraStackNameDict.UsagePlanPremiumTier,
        tenantId
      ),

      {
        description: "Usage plan for premium tier tenants",
        quota: {
          limit: 10_000,
          period: apigateway.Period.DAY,
        },
        throttle: {
          burstLimit: 300,
          rateLimit: 300,
        },
        name: SystemProviderInfraStackNameDict.UsagePlanPremiumTier,
      }
    );
    usagePlanPremiumTier.addApiStage({
      stage: systemProviderApiGW.deploymentStage,
    });
    usagePlanPremiumTier.addApiKey(apiGatewayApiKeyPremiumTierProd);
    const usagePlanPlatinumTier = new apigateway.UsagePlan(
      this,
      generateLogicalId(
        SystemProviderInfraStackNameDict.UsagePlanPlatinumTier,
        tenantId
      ),
      {
        description: "Usage plan for platinum tier tenants",
        quota: {
          limit: 10_000,
          period: apigateway.Period.DAY,
        },
        throttle: {
          burstLimit: 300,
          rateLimit: 300,
        },
        name: SystemProviderInfraStackNameDict.UsagePlanPlatinumTier,
      }
    );
    usagePlanPlatinumTier.addApiStage({
      stage: systemProviderApiGW.deploymentStage,
    });
    usagePlanPlatinumTier.addApiKey(apiGatewayApiKeyPlatinumTierProd);

    const usagePlanStandardTier = new apigateway.UsagePlan(
      this,
      generateLogicalId(
        SystemProviderInfraStackNameDict.UsagePlanStandardTier,
        tenantId
      ),
      {
        description: "Usage plan for standard tier tenants",
        quota: {
          limit: 3000,
          period: apigateway.Period.DAY,
        },
        throttle: {
          burstLimit: 100,
          rateLimit: 75,
        },
        name: SystemProviderInfraStackNameDict.UsagePlanStandardTier,
      }
    );
    usagePlanStandardTier.addApiStage({
      stage: systemProviderApiGW.deploymentStage,
    });
    usagePlanStandardTier.addApiKey(apiGatewayApiKeyStandardTierProd);
    const usagePlanBasicTier = new apigateway.UsagePlan(
      this,
      generateLogicalId(
        SystemProviderInfraStackNameDict.UsagePlanBasicTier,
        tenantId
      ),

      {
        description: "Usage plan for basic tier tenants",
        quota: {
          limit: 1000,
          period: apigateway.Period.DAY,
        },
        throttle: {
          burstLimit: 50,
          rateLimit: 50,
        },
        name: SystemProviderInfraStackNameDict.UsagePlanBasicTier,
      }
    );
    usagePlanBasicTier.addApiStage({
      stage: systemProviderApiGW.deploymentStage,
    });
    usagePlanBasicTier.addApiKey(apiGatewayApiKeyBasicTierProd);
    const usagePlanSystemAdmin = new apigateway.UsagePlan(
      this,
      generateLogicalId(
        SystemProviderInfraStackNameDict.UsagePlanSystemAdmin,
        tenantId
      ),

      {
        description: "Usage plan for system admin",
        quota: {
          limit: 10_000,
          period: apigateway.Period.DAY,
        },
        throttle: {
          burstLimit: 5000,
          rateLimit: 500,
        },
        name: SystemProviderInfraStackNameDict.UsagePlanSystemAdmin,
      }
    );
    usagePlanSystemAdmin.addApiStage({
      stage: systemProviderApiGW.deploymentStage,
    });
    usagePlanSystemAdmin.addApiKey(apiGatewayApiKeySystemAdminProd);

    const integrationMap = helper.getIntegrationMap();

    const registerTenantIntegration =
      integrationMap["registerTenantIntegration"];

    const provisionTenantIntegration =
      integrationMap["provisionTenantIntegration"];

    const deProvisionTenantIntegration =
      integrationMap["deProvisionTenantIntegration"];
    const activateTenantIntegration =
      integrationMap["activateTenantIntegration"];

    const getTenantsIntegration = integrationMap["getTenantsIntegration"];
    const createTenantIntegration = integrationMap["createTenantIntegration"];
    const getTenantConfigIntegration =
      integrationMap["getTenantConfigIntegration"];
    const getTenantIntegration = integrationMap["getTenantIntegration"];
    const deactivateTenantIntegration =
      integrationMap["deactivateTenantIntegration"];
    const updateTenantIntegration = integrationMap["updateTenantIntegration"];
    const updateUserIntegration = integrationMap["updateUserIntegration"];
    const createUserIntegration = integrationMap["createUserIntegration"];

    const disableUserIntegration = integrationMap["disableUserIntegration"];
    const disableUsersByTenantIntegration =
      integrationMap["disableUsersByTenantIntegration"];
    const enableUsersByTenantIntegration =
      integrationMap["enableUsersByTenantIntegration"];

    const getUserIntegration = integrationMap["getUserIntegration"];
    const getUsersIntegration = integrationMap["getUsersIntegration"];

    const createTenantAdminUserIntegration =
      integrationMap["createTenantAdminUserIntegration"];

    const authorizerFunctionIntegration =
      integrationMap["authorizerFunctionIntegration"];
    const func = lambda.Function.fromFunctionArn(
      this,
      generateLogicalId(
        SystemProviderInfraStackNameDict.TokenAuthorizer,
        tenantId
      ),
      sharedServicesAuthorizerFunctionArn
    );

    const authorizer = new apigateway.TokenAuthorizer(
      this,
      generateLogicalId(SystemProviderInfraStackNameDict.Authorizer, tenantId),
      {
        handler: func,
        resultsCacheTtl: cdk.Duration.seconds(60),
      }
    );

    const securityTypeOptions: SecurityTypeOptions = {
      apiKey: { apiKeyRequired: true },
      sigv4Reference: { authorizationType: apigateway.AuthorizationType.IAM },
      Authorizer: { authorizer: authorizer },
    };

    const resourceList: ResourceConfig[] = [
      {
        path: "registration",
        methods: ["POST"],
        integrations: {
          POST: registerTenantIntegration,
        },
        security: {},
      },
      {
        path: "provisioning",
        methods: ["POST"],
        integrations: {
          POST: provisionTenantIntegration,
        },
        security: {
          POST: ["sigv4Reference"],
        },
      },
      {
        path: "provisioning/{tenantid}",
        methods: ["PUT"],
        integrations: {
          PUT: deProvisionTenantIntegration,
        },
        security: {
          PUT: ["sigv4Reference"],
        },
      },
      {
        path: "tenant/activation/{tenantid}",
        methods: ["PUT"],
        integrations: {
          PUT: activateTenantIntegration,
        },
        security: {
          PUT: ["apiKey", "Authorizer"],
        },
      },
      {
        path: "tenants",
        methods: ["GET"],
        integrations: {
          GET: getTenantsIntegration,
        },
        security: {
          GET: ["apiKey", "Authorizer"],
        },
      },
      {
        path: "tenant",
        methods: ["POST"],
        integrations: {
          POST: createTenantIntegration,
        },
        security: {
          POST: ["sigv4Reference"],
        },
      },
      {
        path: "tenant/init/{tenantname}",
        methods: ["GET"],
        integrations: {
          GET: getTenantConfigIntegration,
        },
        security: {},
      },
      {
        path: "tenant/{tenantid}",
        methods: ["GET", "DELETE", "PUT"],
        integrations: {
          GET: getTenantIntegration,
          DELETE: deactivateTenantIntegration,
          PUT: updateTenantIntegration,
        },
        security: {
          GET: ["apiKey", "Authorizer"],
          DELETE: ["apiKey", "Authorizer"],
          PUT: ["apiKey", "Authorizer"],
        },
      },
      {
        path: "user/{username}",
        methods: ["GET", "PUT", "DELETE"],
        integrations: {
          GET: getUserIntegration,
          PUT: updateUserIntegration,
          DELETE: disableUserIntegration,
        },
        security: {
          GET: ["apiKey", "Authorizer"],
          DELETE: ["apiKey", "Authorizer"],
          PUT: ["apiKey", "Authorizer"],
        },
      },
      {
        path: "user/tenant-admin",
        methods: ["POST"],
        integrations: {
          POST: createTenantAdminUserIntegration,
        },
        security: {
          POST: ["sigv4Reference"],
        },
      },
      {
        path: "user",
        methods: ["POST"],
        integrations: {
          POST: createUserIntegration,
        },
        security: {
          POST: ["apiKey", "Authorizer"],
        },
      },
      {
        path: "users",
        methods: ["GET"],
        integrations: {
          GET: getUsersIntegration,
        },
        security: {
          GET: ["apiKey", "Authorizer"],
        },
      },
      {
        path: "users/disable",
        methods: ["PUT"],
        integrations: {
          PUT: disableUsersByTenantIntegration,
        },
        security: {
          PUT: ["sigv4Reference"],
        },
      },
      {
        path: "users/enable",
        methods: ["PUT"],
        integrations: {
          PUT: enableUsersByTenantIntegration,
        },
        security: {
          PUT: ["sigv4Reference"],
        },
      },
    ];
    constructApi(resourceList, systemProviderApiGW, securityTypeOptions);

    systemProviderApiGW.root.addMethod("ANY", authorizerFunctionIntegration, {
      apiKeyRequired: true,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
      authorizer,
    });
    this.usagePlanBasicTier = usagePlanBasicTier.usagePlanId;

    this.usagePlanStandardTier = usagePlanStandardTier.usagePlanId;

    this.usagePlanPremiumTier = usagePlanPremiumTier.usagePlanId;

    this.usagePlanPlatinumTier = usagePlanPlatinumTier.usagePlanId;

    this.restApiId = systemProviderApiGW.restApiId;
    this.restApiIdStageName = stageName;
  }
}
