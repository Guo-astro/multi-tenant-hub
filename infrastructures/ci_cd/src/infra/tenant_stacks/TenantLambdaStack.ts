import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import { TenantFunctionStackProps } from "@/shared/prop_extensions.types";
import { ComparisonOperator, Statistic } from "aws-cdk-lib/aws-cloudwatch";
import { createFileBasedLambdaFunction } from "../utils/lambdaHelpers";
import { LambdaDeploymentConfig } from "aws-cdk-lib/aws-codedeploy";
import { TenantSystemNameDict } from "@/shared/Constants";
import { generateLogicalId, generatePhysicalName } from "../utils/Utils";
//TODO: add lambdaReserveConcurrency
export class TenantLambdaStack extends cdk.NestedStack {
  public readonly productFunctionExecutionRoleArn: string;
  public readonly orderFunctionExecutionRoleArn: string;
  public readonly getOrderFunctionArn: string;
  public readonly getOrdersFunctionArn: string;
  public readonly createOrderFunctionArn: string;
  public readonly updateOrderFunctionArn: string;
  public readonly deleteOrderFunctionArn: string;
  public readonly getProductFunctionArn: string;
  public readonly getProductsFunctionArn: string;
  public readonly createProductFunctionArn: string;
  public readonly updateProductFunctionArn: string;
  public readonly deleteProductFunctionArn: string;
  public readonly updateUsagePlanFunctionArn: string;
  public readonly updateTenantApiGatewayUrlFunctionArn: string;
  constructor(scope: Construct, id: string, props: TenantFunctionStackProps) {
    super(scope, id, props);
    const {
      tenantId,
      orderTable,
      productTable,
      serverlessSaaSSettingsTableArn,
      tenantDetailsTableArn,
    } = props;

    const baseLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      generateLogicalId(
        TenantSystemNameDict.LambdaInsightsExtensionLayer,
        tenantId
      ),
      `arn:aws:lambda:${cdk.Aws.REGION}:580247275435:layer:LambdaInsightsExtension:14`
    );
    const customTenantLambdaLayer = new lambda.LayerVersion(
      this,
      generateLogicalId(TenantSystemNameDict.customTenantLambdaLayer, tenantId),
      {
        description: "Utilities for project",
        code: lambda.Code.fromAsset("src/services/tenant_services/layers/", {
          bundling: {
            image: lambda.Runtime.PYTHON_3_9.bundlingImage,
            command: [
              "bash",
              "-c",
              "pip install -r requirements.txt -t /asset-output && cp -au . /asset-output",
            ],
          },
        }),
        compatibleRuntimes: [lambda.Runtime.PYTHON_3_9],
        license: "MIT",
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      }
    );

    const productFunctionExecutionRole = new iam.Role(
      this,
      generateLogicalId(
        TenantSystemNameDict.productFunctionExecutionRole,
        tenantId
      ),

      {
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
        path: "/",
      }
    );

    // ProductFunctionExecutionRolePolicy
    const productFunctionExecutionRolePolicy = new iam.Policy(
      this,
      generateLogicalId(
        TenantSystemNameDict.productFunctionExecutionRolePolicy,
        tenantId
      ),

      {
        roles: [productFunctionExecutionRole],
        policyName: generatePhysicalName(
          TenantSystemNameDict.productFunctionExecutionRolePolicy,
          tenantId
        ),
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              "dynamodb:GetItem",
              "dynamodb:UpdateItem",
              "dynamodb:PutItem",
              "dynamodb:DeleteItem",
              "dynamodb:Query",
            ],
            resources: [props.productTable.tableArn],
            conditions: {
              StringEqualsIfExists: {
                "aws:RequestTag/TenantId": tenantId,
              },
            },
          }),
        ],
      }
    );
    productFunctionExecutionRole.attachInlinePolicy(
      productFunctionExecutionRolePolicy
    );
    // GetProductFunction
    const getProductFunction = createFileBasedLambdaFunction(scope, {
      functionName: TenantSystemNameDict.GetProductFunction,
      handlerName: "product_service.get_product",
      runtime: lambda.Runtime.PYTHON_3_9,
      assetPath: "src/services/tenant_services/ProductService/",
      role: productFunctionExecutionRole,
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        POWERTOOLS_SERVICE_NAME: "ProductService",
        TENANT_ID: tenantId,
        PRODUCT_TABLE_NAME: productTable.tableName,
        LOG_LEVEL: "DEBUG",
        POWERTOOLS_METRICS_NAMESPACE: "TenantStack",
      },
      aliasName: "live",
      deploymentConfig: LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
      alarmDescription: "Lambda function canary errors",
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 2,
      threshold: 0,
      statistic: Statistic.SUM,
      period: cdk.Duration.seconds(60),
      layers: [baseLayer, customTenantLambdaLayer],
      tenantId,
    });

    // GetProductsFunction
    const getProductsFunction = createFileBasedLambdaFunction(scope, {
      functionName: TenantSystemNameDict.GetProductsFunction,
      handlerName: "product_service.get_products",
      runtime: lambda.Runtime.PYTHON_3_9,
      assetPath: "src/services/tenant_services/ProductService/",
      role: productFunctionExecutionRole,
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        LOG_LEVEL: "DEBUG",
        POWERTOOLS_METRICS_NAMESPACE: "TenantStack",
        POWERTOOLS_SERVICE_NAME: "ProductService",
        TENANT_ID: tenantId,
        PRODUCT_TABLE_NAME: productTable.tableName,
      },
      aliasName: "live",
      deploymentConfig: LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
      alarmDescription: "Lambda function canary errors",
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 2,
      threshold: 0,
      statistic: Statistic.SUM,
      period: cdk.Duration.seconds(60),
      layers: [customTenantLambdaLayer, baseLayer],
      tenantId,
    });

    // CreateProductFunction
    const createProductFunction = createFileBasedLambdaFunction(scope, {
      functionName: TenantSystemNameDict.CreateProductFunction,
      handlerName: "product_service.create_product",
      assetPath: "src/services/tenant_services/ProductService/",
      runtime: lambda.Runtime.PYTHON_3_9,
      role: productFunctionExecutionRole,
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        LOG_LEVEL: "DEBUG",
        POWERTOOLS_METRICS_NAMESPACE: "TenantStack",
        POWERTOOLS_SERVICE_NAME: "ProductService",
        TENANT_ID: tenantId,
        PRODUCT_TABLE_NAME: productTable.tableName,
      },
      aliasName: "live",
      deploymentConfig: LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
      alarmDescription: "Lambda function canary errors",
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 2,
      threshold: 0,
      statistic: Statistic.SUM,
      period: cdk.Duration.seconds(60),
      layers: [customTenantLambdaLayer, baseLayer],
      tenantId,
    });

    // UpdateProductFunction
    const updateProductFunction = createFileBasedLambdaFunction(scope, {
      functionName: TenantSystemNameDict.UpdateProductFunction,
      handlerName: "product_service.update_product",
      assetPath: "src/services/tenant_services/ProductService/",
      runtime: lambda.Runtime.PYTHON_3_9,
      role: productFunctionExecutionRole,
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        LOG_LEVEL: "DEBUG",
        POWERTOOLS_METRICS_NAMESPACE: "TenantStack",
        POWERTOOLS_SERVICE_NAME: "ProductService",
        TENANT_ID: tenantId,
        PRODUCT_TABLE_NAME: productTable.tableName,
      },
      aliasName: "live",
      deploymentConfig: LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
      alarmDescription: "Lambda function canary errors",
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 2,
      threshold: 0,
      statistic: Statistic.SUM,
      period: cdk.Duration.seconds(60),
      layers: [customTenantLambdaLayer, baseLayer],
      tenantId,
    });

    // DeleteProductFunction
    const deleteProductFunction = createFileBasedLambdaFunction(scope, {
      functionName: TenantSystemNameDict.DeleteProductFunction,
      handlerName: "product_service.delete_product",
      assetPath: "src/services/tenant_services/ProductService/",
      runtime: lambda.Runtime.PYTHON_3_9,
      role: productFunctionExecutionRole,
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        LOG_LEVEL: "DEBUG",
        POWERTOOLS_METRICS_NAMESPACE: "TenantStack",
        POWERTOOLS_SERVICE_NAME: "ProductService",
        TENANT_ID: tenantId,
        PRODUCT_TABLE_NAME: productTable.tableName,
      },
      aliasName: "live",
      deploymentConfig: LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
      alarmDescription: "Lambda function canary errors",
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 2,
      threshold: 0,
      statistic: Statistic.SUM,
      period: cdk.Duration.seconds(60),
      layers: [customTenantLambdaLayer, baseLayer],
      tenantId,
    });

    // OrderFunctionExecutionRole
    const orderFunctionExecutionRole = new iam.Role(
      scope,
      generateLogicalId(
        TenantSystemNameDict.OrderFunctionExecutionRole,
        tenantId
      ),
      {
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

    // ProductFunctionExecutionRolePolicy
    const orderFunctionExecutionRolePolicy = new iam.Policy(
      this,
      generateLogicalId(
        TenantSystemNameDict.orderFunctionExecutionRolePolicy,
        tenantId
      ),

      {
        roles: [orderFunctionExecutionRole],

        policyName: generatePhysicalName(
          TenantSystemNameDict.orderFunctionExecutionRolePolicy,
          tenantId
        ),
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              "dynamodb:GetItem",
              "dynamodb:UpdateItem",
              "dynamodb:PutItem",
              "dynamodb:DeleteItem",
              "dynamodb:Query",
            ],
            resources: [orderTable.tableArn],
            conditions: {
              StringEqualsIfExists: {
                "aws:RequestTag/TenantId": tenantId,
              },
            },
          }),
        ],
      }
    );
    orderFunctionExecutionRole.attachInlinePolicy(
      orderFunctionExecutionRolePolicy
    );

    // GetOrdersFunction
    const getOrdersFunction = createFileBasedLambdaFunction(scope, {
      functionName: TenantSystemNameDict.GetOrdersFunction,
      handlerName: "order_service.get_orders",
      assetPath: "src/services/tenant_services/OrderService/",
      runtime: lambda.Runtime.PYTHON_3_9,
      role: orderFunctionExecutionRole,
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        LOG_LEVEL: "DEBUG",
        POWERTOOLS_METRICS_NAMESPACE: "TenantStack",
        POWERTOOLS_SERVICE_NAME: "OrderService",
        TENANT_ID: tenantId,
        ORDER_TABLE_NAME: orderTable.tableName,
      },
      aliasName: "live",
      deploymentConfig: LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
      alarmDescription: "Lambda function canary errors",
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 2,
      threshold: 0,
      statistic: Statistic.SUM,
      period: cdk.Duration.seconds(60),
      layers: [customTenantLambdaLayer, baseLayer],
      tenantId,
    });

    // GetOrderFunction
    const getOrderFunction = createFileBasedLambdaFunction(scope, {
      functionName: TenantSystemNameDict.GetOrderFunction,
      handlerName: "order_service.get_order",
      assetPath: "src/services/tenant_services/OrderService/",
      runtime: lambda.Runtime.PYTHON_3_9,
      role: orderFunctionExecutionRole,
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        LOG_LEVEL: "DEBUG",
        POWERTOOLS_METRICS_NAMESPACE: "TenantStack",
        POWERTOOLS_SERVICE_NAME: "OrderService",
        TENANT_ID: tenantId,
        ORDER_TABLE_NAME: orderTable.tableName,
      },
      aliasName: "live",
      deploymentConfig: LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
      alarmDescription: "Lambda function canary errors",
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 2,
      threshold: 0,
      statistic: Statistic.SUM,
      period: cdk.Duration.seconds(60),
      layers: [customTenantLambdaLayer, baseLayer],
      tenantId,
    });

    // CreateOrderFunction
    const createOrderFunction = createFileBasedLambdaFunction(scope, {
      functionName: TenantSystemNameDict.CreateOrderFunction,
      handlerName: "order_service.create_order",
      assetPath: "src/services/tenant_services/OrderService/",
      runtime: lambda.Runtime.PYTHON_3_9,
      role: orderFunctionExecutionRole,
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        LOG_LEVEL: "DEBUG",
        POWERTOOLS_METRICS_NAMESPACE: "TenantStack",
        POWERTOOLS_SERVICE_NAME: "OrderService",
        TENANT_ID: tenantId,
        ORDER_TABLE_NAME: orderTable.tableName,
      },
      aliasName: "live",
      deploymentConfig: LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
      alarmDescription: "Lambda function canary errors",
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 2,
      threshold: 0,
      statistic: Statistic.SUM,
      period: cdk.Duration.seconds(60),
      layers: [customTenantLambdaLayer, baseLayer],
      tenantId,
    });

    // UpdateOrderFunction
    const updateOrderFunction = createFileBasedLambdaFunction(scope, {
      functionName: TenantSystemNameDict.UpdateOrderFunction,
      handlerName: "order_service.update_order",
      assetPath: "src/services/tenant_services/OrderService/",
      runtime: lambda.Runtime.PYTHON_3_9,
      role: orderFunctionExecutionRole,
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        LOG_LEVEL: "DEBUG",
        POWERTOOLS_METRICS_NAMESPACE: "TenantStack",
        POWERTOOLS_SERVICE_NAME: "OrderService",
        TENANT_ID: tenantId,
        ORDER_TABLE_NAME: orderTable.tableName,
      },
      aliasName: "live",
      deploymentConfig: LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
      alarmDescription: "Lambda function canary errors",
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 2,
      threshold: 0,
      statistic: Statistic.SUM,
      period: cdk.Duration.seconds(60),
      layers: [customTenantLambdaLayer, baseLayer],
      tenantId,
    });

    // DeleteOrderFunction
    const deleteOrderFunction = createFileBasedLambdaFunction(scope, {
      functionName: TenantSystemNameDict.DeleteOrderFunction,
      handlerName: "order_service.delete_order",
      assetPath: "src/services/tenant_services/OrderService/",
      role: orderFunctionExecutionRole,
      runtime: lambda.Runtime.PYTHON_3_9,
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        LOG_LEVEL: "DEBUG",
        POWERTOOLS_METRICS_NAMESPACE: "TenantStack",
        POWERTOOLS_SERVICE_NAME: "OrderService",
        TENANT_ID: tenantId,
        ORDER_TABLE_NAME: orderTable.tableName,
      },
      aliasName: "live",
      deploymentConfig: LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
      alarmDescription: "Lambda function canary errors",
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 2,
      threshold: 0,
      statistic: Statistic.SUM,
      period: cdk.Duration.seconds(60),
      layers: [customTenantLambdaLayer, baseLayer],
      tenantId,
    });

    const updateUsagePlanLambdaExecutionRole = new iam.Role(
      scope,
      generateLogicalId(
        TenantSystemNameDict.UpdateUsagePlanLambdaExecutionRole,
        tenantId
      ),
      {
        path: "/",
        assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "CloudWatchLambdaInsightsExecutionRolePolicy"
          ),
        ],
      }
    );

    updateUsagePlanLambdaExecutionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["kms:Decrypt"],
        resources: [
          `arn:aws:kms:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:key/*`,
        ],
      })
    );

    updateUsagePlanLambdaExecutionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "logs:CreateLogGroup",
          "logs:PutLogEvents",
          "logs:CreateLogStream",
          "logs:DescribeLogStreams",
        ],
        resources: [
          `arn:aws:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:log-group:*`,
        ],
      })
    );

    updateUsagePlanLambdaExecutionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
        resources: ["*"],
      })
    );

    updateUsagePlanLambdaExecutionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["apigateway:PATCH"],
        resources: [`arn:aws:apigateway:${cdk.Aws.REGION}::/usageplans/*`],
      })
    );

    //TODO: use more specific constraint
    updateUsagePlanLambdaExecutionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["dynamodb:GetItem"],
        resources: [
          `arn:aws:dynamodb:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:table/*`,
        ],
      })
    );

    const updateUsagePlanFunction = createFileBasedLambdaFunction(scope, {
      functionName: TenantSystemNameDict.UpdateUsagePlanFunction,
      handlerName: "update_usage_plan.handler",
      assetPath: "src/services/tenant_services/",
      runtime: lambda.Runtime.PYTHON_3_9,
      role: updateUsagePlanLambdaExecutionRole,
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        LOG_LEVEL: "DEBUG",
        POWERTOOLS_METRICS_NAMESPACE: "TenantStack",
        POWERTOOLS_SERVICE_NAME: "UpdateUsagePlanFunction",
        TENANT_ID: tenantId,
      },
      aliasName: "live",
      deploymentConfig: LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
      alarmDescription: "Lambda function canary errors",
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 2,
      threshold: 0,
      statistic: Statistic.SUM,
      period: cdk.Duration.seconds(60),
      layers: [customTenantLambdaLayer, baseLayer],
      tenantId,
    });

    const updateTenantApiGatewayUrlLambdaExecutionRole = new iam.Role(
      this,
      generateLogicalId(
        TenantSystemNameDict.updateTenantApiGatewayUrlLambdaExecutionRole,
        tenantId
      ),
      {
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

    const updateTenantApiGatewayUrlLambdaExecutionPolicy =
      new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["dynamodb:PutItem"],
            resources: [serverlessSaaSSettingsTableArn],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["dynamodb:UpdateItem"],
            resources: [tenantDetailsTableArn],
          }),
        ],
      });
    updateTenantApiGatewayUrlLambdaExecutionRole.attachInlinePolicy(
      new iam.Policy(
        this,
        generateLogicalId(
          TenantSystemNameDict.updateTenantApiGatewayUrlLambdaExecutionPolicy,
          tenantId
        ),
        {
          document: updateTenantApiGatewayUrlLambdaExecutionPolicy,
        }
      )
    );
    const updateTenantApiGatewayUrlFunction = createFileBasedLambdaFunction(
      scope,
      {
        functionName: TenantSystemNameDict.updateTenantApiGatewayUrlFunction,
        handlerName: "update_tenant_apigatewayurl.handler",
        assetPath: "src/services/tenant_services/",
        runtime: lambda.Runtime.PYTHON_3_9,
        role: updateTenantApiGatewayUrlLambdaExecutionRole,
        tracing: lambda.Tracing.ACTIVE,
        environment: {
          //TODO: fix it
          LOG_LEVEL: "DEBUG",
          POWERTOOLS_METRICS_NAMESPACE: "TenantStack",
        },
        aliasName: "live",
        deploymentConfig: LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
        alarmDescription: "Lambda function canary errors",
        comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
        evaluationPeriods: 2,
        threshold: 0,
        statistic: Statistic.SUM,
        period: cdk.Duration.seconds(60),
        layers: [baseLayer, customTenantLambdaLayer],
        tenantId,
      }
    );

    this.productFunctionExecutionRoleArn = productFunctionExecutionRole.roleArn;
    this.orderFunctionExecutionRoleArn = orderFunctionExecutionRole.roleArn;
    this.getOrderFunctionArn = getOrderFunction.functionArn;
    this.getOrdersFunctionArn = getOrdersFunction.functionArn;
    this.createOrderFunctionArn = createOrderFunction.functionArn;
    this.updateOrderFunctionArn = updateOrderFunction.functionArn;
    this.deleteOrderFunctionArn = deleteOrderFunction.functionArn;
    this.getProductFunctionArn = getProductFunction.functionArn;
    this.getProductsFunctionArn = getProductsFunction.functionArn;
    this.createProductFunctionArn = createProductFunction.functionArn;
    this.updateProductFunctionArn = updateProductFunction.functionArn;
    this.deleteProductFunctionArn = deleteProductFunction.functionArn;
    this.updateUsagePlanFunctionArn = updateUsagePlanFunction.functionArn;
    this.updateTenantApiGatewayUrlFunctionArn =
      updateTenantApiGatewayUrlFunction.functionArn;
  }
}
