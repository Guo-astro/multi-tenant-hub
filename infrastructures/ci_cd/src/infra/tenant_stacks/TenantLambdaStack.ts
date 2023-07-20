import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import { TenantFunctionStackProps } from "shared/prop_extensions.types";
import { ComparisonOperator, Statistic } from "aws-cdk-lib/aws-cloudwatch";
import { createFileBasedLambdaFunction } from "../utils/lambdaHelpers";
import { LambdaDeploymentConfig } from "aws-cdk-lib/aws-codedeploy";
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
      isPooledDeploy,
      systemProviderSettingsTableArn: serverlessSaaSSettingsTableArn,
      tenantDetailsTableArn,
    } = props;

    const baseLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      "LambdaInsightsExtensionLayer",
      `arn:aws:lambda:${cdk.Aws.REGION}:580247275435:layer:LambdaInsightsExtension:14`
    );
    const customTenantLambdaLayer = new lambda.LayerVersion(
      this,
      "customTenantLambdaLayer",
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
      "productFunctionExecutionRole",
      {
        roleName: `${tenantId}-product-function-execution-role`,
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
      "productFunctionExecutionRolePolicy",
      {
        roles: [productFunctionExecutionRole],
        //TODO: doc it. we need the name to be specified for each tanant
        policyName: `${tenantId}-product-function-execution-role-policy`,
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
      functionName: "GetProductFunction",
      handlerName: "product_service.get_product",
      runtime: lambda.Runtime.PYTHON_3_9,
      assetPath: "src/services/tenant_services/ProductService/",
      role: productFunctionExecutionRole,
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        POWERTOOLS_SERVICE_NAME: "ProductService",
        IS_POOLED_DEPLOY: isPooledDeploy,
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
    });

    // GetProductsFunction
    const getProductsFunction = createFileBasedLambdaFunction(scope, {
      functionName: "GetProductsFunction",
      handlerName: "product_service.get_products",
      runtime: lambda.Runtime.PYTHON_3_9,
      assetPath: "src/services/tenant_services/ProductService/",
      role: productFunctionExecutionRole,
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        LOG_LEVEL: "DEBUG",
        POWERTOOLS_METRICS_NAMESPACE: "TenantStack",
        POWERTOOLS_SERVICE_NAME: "ProductService",
        IS_POOLED_DEPLOY: isPooledDeploy,
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
    });

    // CreateProductFunction
    const createProductFunction = createFileBasedLambdaFunction(scope, {
      functionName: "CreateProductFunction",
      handlerName: "product_service.create_product",
      assetPath: "src/services/tenant_services/ProductService/",
      runtime: lambda.Runtime.PYTHON_3_9,
      role: productFunctionExecutionRole,
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        LOG_LEVEL: "DEBUG",
        POWERTOOLS_METRICS_NAMESPACE: "TenantStack",
        POWERTOOLS_SERVICE_NAME: "ProductService",
        IS_POOLED_DEPLOY: isPooledDeploy,
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
    });

    // UpdateProductFunction
    const updateProductFunction = createFileBasedLambdaFunction(scope, {
      functionName: "UpdateProductFunction",
      handlerName: "product_service.update_product",
      assetPath: "src/services/tenant_services/ProductService/",
      runtime: lambda.Runtime.PYTHON_3_9,
      role: productFunctionExecutionRole,
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        LOG_LEVEL: "DEBUG",
        POWERTOOLS_METRICS_NAMESPACE: "TenantStack",
        POWERTOOLS_SERVICE_NAME: "ProductService",
        IS_POOLED_DEPLOY: isPooledDeploy,
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
    });

    // DeleteProductFunction
    const deleteProductFunction = createFileBasedLambdaFunction(scope, {
      functionName: "DeleteProductFunction",
      handlerName: "product_service.delete_product",
      assetPath: "src/services/tenant_services/ProductService/",
      runtime: lambda.Runtime.PYTHON_3_9,
      role: productFunctionExecutionRole,
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        LOG_LEVEL: "DEBUG",
        POWERTOOLS_METRICS_NAMESPACE: "TenantStack",
        POWERTOOLS_SERVICE_NAME: "ProductService",
        IS_POOLED_DEPLOY: isPooledDeploy,
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
    });

    // OrderFunctionExecutionRole
    const orderFunctionExecutionRole = new iam.Role(
      scope,
      "OrderFunctionExecutionRole",
      {
        roleName: `${tenantId}-order-function-execution-role`,
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
      "orderFunctionExecutionRolePolicy",
      {
        roles: [orderFunctionExecutionRole],
        policyName: `${tenantId}-order-function-execution-role-policy`,
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
      functionName: "GetOrdersFunction",
      handlerName: "order_service.get_orders",
      assetPath: "src/services/tenant_services/OrderService/",
      runtime: lambda.Runtime.PYTHON_3_9,
      role: orderFunctionExecutionRole,
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        LOG_LEVEL: "DEBUG",
        POWERTOOLS_METRICS_NAMESPACE: "TenantStack",
        POWERTOOLS_SERVICE_NAME: "OrderService",
        IS_POOLED_DEPLOY: isPooledDeploy,
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
    });

    // GetOrderFunction
    const getOrderFunction = createFileBasedLambdaFunction(scope, {
      functionName: "GetOrderFunction",
      handlerName: "order_service.get_order",
      assetPath: "src/services/tenant_services/OrderService/",
      runtime: lambda.Runtime.PYTHON_3_9,
      role: orderFunctionExecutionRole,
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        LOG_LEVEL: "DEBUG",
        POWERTOOLS_METRICS_NAMESPACE: "TenantStack",
        POWERTOOLS_SERVICE_NAME: "OrderService",
        IS_POOLED_DEPLOY: isPooledDeploy,
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
    });

    // CreateOrderFunction
    const createOrderFunction = createFileBasedLambdaFunction(scope, {
      functionName: "CreateOrderFunction",
      handlerName: "order_service.create_order",
      assetPath: "src/services/tenant_services/OrderService/",
      runtime: lambda.Runtime.PYTHON_3_9,
      role: orderFunctionExecutionRole,
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        LOG_LEVEL: "DEBUG",
        POWERTOOLS_METRICS_NAMESPACE: "TenantStack",
        POWERTOOLS_SERVICE_NAME: "OrderService",
        IS_POOLED_DEPLOY: isPooledDeploy,
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
    });

    // UpdateOrderFunction
    const updateOrderFunction = createFileBasedLambdaFunction(scope, {
      functionName: "UpdateOrderFunction",
      handlerName: "order_service.update_order",
      assetPath: "src/services/tenant_services/OrderService/",
      runtime: lambda.Runtime.PYTHON_3_9,
      role: orderFunctionExecutionRole,
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        LOG_LEVEL: "DEBUG",
        POWERTOOLS_METRICS_NAMESPACE: "TenantStack",
        POWERTOOLS_SERVICE_NAME: "OrderService",
        IS_POOLED_DEPLOY: isPooledDeploy,
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
    });

    // DeleteOrderFunction
    const deleteOrderFunction = createFileBasedLambdaFunction(scope, {
      functionName: "DeleteOrderFunction",
      handlerName: "order_service.delete_order",
      assetPath: "src/services/tenant_services/OrderService/",
      role: orderFunctionExecutionRole,
      runtime: lambda.Runtime.PYTHON_3_9,
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        LOG_LEVEL: "DEBUG",
        POWERTOOLS_METRICS_NAMESPACE: "TenantStack",
        POWERTOOLS_SERVICE_NAME: "OrderService",
        IS_POOLED_DEPLOY: isPooledDeploy,
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
    });

    const updateUsagePlanLambdaExecutionRole = new iam.Role(
      scope,
      "UpdateUsagePlanLambdaExecutionRole",
      {
        roleName: `${tenantId}-update-usage-plan-role`,
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
      functionName: "UpdateUsagePlanFunction",
      handlerName: "update_usage_plan.handler",
      assetPath: "src/services/tenant_services/",
      runtime: lambda.Runtime.PYTHON_3_9,
      role: updateUsagePlanLambdaExecutionRole,
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        LOG_LEVEL: "DEBUG",
        POWERTOOLS_METRICS_NAMESPACE: "TenantStack",
        POWERTOOLS_SERVICE_NAME: "UpdateUsagePlanFunction",
        IS_POOLED_DEPLOY: isPooledDeploy,
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
    });

    const updateTenantApiGatewayUrlLambdaExecutionRole = new iam.Role(
      this,
      "updateTenantApiGatewayUrlLambdaExecutionRole",
      {
        roleName: `${tenantId}-apigwurl-lambda-exec-role`,
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
      new iam.Policy(this, "updateTenantApiGatewayUrlLambdaExecutionPolicy", {
        document: updateTenantApiGatewayUrlLambdaExecutionPolicy,
      })
    );
    const updateTenantApiGatewayUrlFunction = createFileBasedLambdaFunction(
      scope,
      {
        functionName: "updateTenantApiGatewayUrlFunction",
        handlerName: "update_tenant_apigatewayurl.handler",
        assetPath: "src/services/tenant_services/",
        runtime: lambda.Runtime.PYTHON_3_9,
        role: updateTenantApiGatewayUrlLambdaExecutionRole,
        tracing: lambda.Tracing.ACTIVE,
        environment: {
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
