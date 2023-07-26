import * as constructs from "constructs";
import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as logs from "aws-cdk-lib/aws-logs";
import * as lambda from "aws-cdk-lib/aws-lambda";

import {
  ApiKeySourceType,
  PassthroughBehavior,
} from "aws-cdk-lib/aws-apigateway";
import { LambdaIntegrationHelper } from "../utils/lambdaHelpers";
import {
  ResourceConfig,
  SecurityTypeOptions,
  TenantApiStackProps,
} from "@/shared/prop_extensions.types";
import { generateLogicalId, generatePhysicalName } from "../utils/Utils";
import { constructApi } from "../utils/apigwHelper";
import { TenantSystemNameDict } from "@/shared/Constants";
export class TenantApiStack extends cdk.NestedStack {
  public readonly restApiId: string;
  public readonly restApiIdStageName: string;
  constructor(
    scope: constructs.Construct,
    id: string,
    props: TenantApiStackProps
  ) {
    super(scope, id, props);
    const {
      stageName,
      tenantId,
      getOrderFunctionArn,
      createOrderFunctionArn,
      getOrdersFunctionArn,
      getProductFunctionArn,
      createProductFunctionArn,
      getProductsFunctionArn,
      updateOrderFunctionArn,
      deleteOrderFunctionArn,
      updateProductFunctionArn,
      authorizerFunctionArn,
    } = props;
    const lambdaFunctionArns: Record<string, string> = {
      getOrderFunction: getOrderFunctionArn,
      createOrderFunction: createOrderFunctionArn,
      getOrdersFunction: getOrdersFunctionArn,
      getProductFunction: getProductFunctionArn,
      createProductFunction: createProductFunctionArn,
      getProductsFunction: getProductsFunctionArn,
      updateOrderFunction: updateOrderFunctionArn,
      deleteOrderFunction: deleteOrderFunctionArn,
      updateProductFunction: updateProductFunctionArn,
      authorizerFunction: authorizerFunctionArn,
    };

    type IntegrationKey =
      | "getOrderFunctionIntegration"
      | "createOrderFunctionIntegration"
      | "getOrdersFunctionIntegration"
      | "getProductFunctionIntegration"
      | "createProductFunctionIntegration"
      | "getProductsFunctionIntegration"
      | "updateOrderFunctionIntegration"
      | "deleteOrderFunctionIntegration"
      | "deleteProductFunctionIntegration"
      | "updateProductFunctionIntegration"
      | "authorizerFunctionIntegration";

    type FunctionKey =
      | "getOrderFunction"
      | "createOrderFunction"
      | "getOrdersFunction"
      | "getProductFunction"
      | "createProductFunction"
      | "getProductsFunction"
      | "updateOrderFunction"
      | "deleteOrderFunction"
      | "deleteProductFunction"
      | "updateProductFunction"
      | "authorizerFunction";

    const helper = new LambdaIntegrationHelper<FunctionKey, IntegrationKey>(
      this,
      lambdaFunctionArns
    );
    const apiGatewayAccessLogs = new logs.LogGroup(
      this,

      generateLogicalId(TenantSystemNameDict.apiGatewayAccessLogs, tenantId),
      {
        logGroupName: generatePhysicalName(
          TenantSystemNameDict.apiGatewayAccessLogs,
          tenantId
        ),
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        retention: logs.RetentionDays.ONE_MONTH,
      }
    );

    const apigw = new apigateway.RestApi(
      this,
      generateLogicalId(TenantSystemNameDict.apigw, tenantId),
      {
        restApiName: generatePhysicalName(TenantSystemNameDict.apigw, tenantId),
        cloudWatchRole: true,
        apiKeySourceType: ApiKeySourceType.AUTHORIZER,
        defaultCorsPreflightOptions: {
          allowOrigins: apigateway.Cors.ALL_ORIGINS,
          allowMethods: apigateway.Cors.ALL_METHODS,
        },
        deployOptions: {
          stageName: stageName,
          accessLogDestination: new apigateway.LogGroupLogDestination(
            apiGatewayAccessLogs
          ),
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
      }
    );

    const integrationMap = helper.getIntegrationMap();

    const getOrderFunctionIntegration =
      integrationMap["getOrderFunctionIntegration"];

    const createOrderFunctionIntegration =
      integrationMap["createOrderFunctionIntegration"];
    const getOrdersFunctionIntegration =
      integrationMap["getOrdersFunctionIntegration"];
    const getProductFunctionIntegration =
      integrationMap["getProductFunctionIntegration"];
    const createProductFunctionIntegration =
      integrationMap["createProductFunctionIntegration"];
    const getProductsFunctionIntegration =
      integrationMap["getProductsFunctionIntegration"];
    const updateOrderFunctionIntegration =
      integrationMap["updateOrderFunctionIntegration"];
    const deleteOrderFunctionIntegration =
      integrationMap["deleteOrderFunctionIntegration"];
    const updateProductFunctionIntegration =
      integrationMap["updateProductFunctionIntegration"];
    const deleteProductFunctionIntegration =
      integrationMap["deleteProductFunctionIntegration"];

    const authorizerFunctionIntegration =
      integrationMap["authorizerFunctionIntegration"];
    const func = lambda.Function.fromFunctionArn(
      this,
      generateLogicalId(TenantSystemNameDict.authorizer, tenantId),
      authorizerFunctionArn
    );

    const authorizer = new apigateway.TokenAuthorizer(
      this,
      generateLogicalId(TenantSystemNameDict.tokenAuthorizer, tenantId),
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
        path: "order/{id}",
        methods: ["GET", "PUT", "DELETE"],
        integrations: {
          GET: getOrderFunctionIntegration,
          PUT: updateOrderFunctionIntegration,
          DELETE: deleteOrderFunctionIntegration,
        },
        security: {
          GET: ["apiKey", "Authorizer"],
          DELETE: ["apiKey", "Authorizer"],
          PUT: ["apiKey", "Authorizer"],
        },
      },
      {
        path: "orders",
        methods: ["GET"],
        integrations: {
          GET: getOrdersFunctionIntegration,
        },
        security: {
          GET: ["apiKey", "Authorizer"],
        },
      },
      {
        path: "order",
        methods: ["POST"],
        integrations: {
          POST: createOrderFunctionIntegration,
        },
        security: {
          POST: ["apiKey", "Authorizer"],
        },
      },

      {
        path: "product/{id}",
        methods: ["GET", "PUT", "DELETE"],
        integrations: {
          GET: getProductFunctionIntegration,
          PUT: updateProductFunctionIntegration,
          DELETE: deleteProductFunctionIntegration,
        },
        security: {
          GET: ["apiKey", "Authorizer"],
          DELETE: ["apiKey", "Authorizer"],
          PUT: ["apiKey", "Authorizer"],
        },
      },
      {
        path: "products",
        methods: ["GET"],
        integrations: {
          GET: getProductsFunctionIntegration,
        },
        security: {
          GET: ["apiKey", "Authorizer"],
        },
      },
      {
        path: "product",
        methods: ["POST"],
        integrations: {
          POST: createProductFunctionIntegration,
        },
        security: {
          POST: ["apiKey", "Authorizer"],
        },
      },
    ];
    constructApi(resourceList, apigw, securityTypeOptions);

    apigw.root.addMethod("ANY", authorizerFunctionIntegration, {
      apiKeyRequired: true,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
      authorizer,
    });

    this.restApiId = apigw.restApiId;
    this.restApiIdStageName = stageName;
  }
}
