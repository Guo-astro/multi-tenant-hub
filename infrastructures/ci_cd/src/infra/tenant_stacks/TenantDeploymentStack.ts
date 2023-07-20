import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

import { TenantDeploymentStackProps } from "shared/prop_extensions.types";
import { TenantDataStack } from "./TenantDataStack";
import { TenantLambdaStack } from "./TenantLambdaStack";
import { TenantApiStack } from "./TenantApiStack";
import { TenantApigwLambdaPermissionStack } from "./TenantApigwLambdaPermissionStack";
import { TenantCustomResourceStack } from "./TenantCustomResourceStack";
export class TenantDeploymentStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: TenantDeploymentStackProps) {
    super(scope, id, props);
    //TODO :doc it. the same as lambda handler
    const tenanIdCfnParam = new cdk.CfnParameter(this, "tenanIdCfnParam", {
      type: "String",
      description: "This is tenantId",
    });
    const systemSettingsTableArnCfnParam = new cdk.CfnParameter(
      this,
      "systemSettingsTableArnCfnParam",
      {
        type: "String",
        description: "The ARN of the system settings table",
      }
    );

    const authorizerFunctionArnCfnParam = new cdk.CfnParameter(
      this,
      "authorizerFunctionArnCfnParam",
      {
        type: "String",
        description: "The ARN of the authorizer function",
      }
    );

    const systemProviderSettingsTableNameCfnParam = new cdk.CfnParameter(
      this,
      "systemProviderSettingsTableNameCfnParam",
      {
        type: "String",
        description: "The name of the system provider settings table",
      }
    );

    const tenantDetailsTableNameCfnParam = new cdk.CfnParameter(
      this,
      "tenantDetailsTableNameCfnParam",
      {
        type: "String",
        description: "The name of the tenant details table",
      }
    );
    const tenantDetailsTableArnCfnParam = new cdk.CfnParameter(
      this,
      "tenantDetailsTableArnCfnParam",
      {
        type: "String",
        description: "The name of the tenant details table",
      }
    );

    const usagePlanBasicTierIdCfnParam = new cdk.CfnParameter(
      this,
      "usagePlanBasicTierIdCfnParam",
      {
        type: "String",
        description: "The ID of the basic tier usage plan",
      }
    );

    const usagePlanStandardTierIdCfnParam = new cdk.CfnParameter(
      this,
      "usagePlanStandardTierIdCfnParam",
      {
        type: "String",
        description: "The ID of the standard tier usage plan",
      }
    );

    const usagePlanPremiumTierIdCfnParam = new cdk.CfnParameter(
      this,
      "usagePlanPremiumTierIdCfnParam",
      {
        type: "String",
        description: "The ID of the premium tier usage plan",
      }
    );

    const usagePlanPlatinumTierIdCfnParam = new cdk.CfnParameter(
      this,
      "usagePlanPlatinumTierIdCfnParam",
      {
        type: "String",
        description: "The ID of the platinum tier usage plan",
      }
    );

    const tenantId = tenanIdCfnParam.valueAsString;
    const systemSettingsTableArn = systemSettingsTableArnCfnParam.valueAsString;
    const authorizerFunctionArn = authorizerFunctionArnCfnParam.valueAsString;
    const systemProviderSettingsTableName =
      systemProviderSettingsTableNameCfnParam.valueAsString;
    const tenantDetailsTableName = tenantDetailsTableNameCfnParam.valueAsString;

    const usagePlanBasicTierId = usagePlanBasicTierIdCfnParam.valueAsString;
    const usagePlanStandardTierId =
      usagePlanStandardTierIdCfnParam.valueAsString;
    const usagePlanPremiumTierId = usagePlanPremiumTierIdCfnParam.valueAsString;
    const usagePlanPlatinumTierId =
      usagePlanPlatinumTierIdCfnParam.valueAsString;

    const tenantDetailsTableArn = tenantDetailsTableArnCfnParam.valueAsString;
    const stageName = props.tags.environment;
    const isPooledDeploy = tenantId === "pooled" ? "True" : "False";
    const tenantDataStack = new TenantDataStack(this, "tenantDataStack", {
      tags: {
        environment: stageName,
      },
      tenantId: tenantId,
    });

    const tenantFunctionStack = new TenantLambdaStack(
      this,
      "tenantFunctionStack",
      {
        tags: {
          environment: stageName,
        },
        tenantId: tenantId,
        lambdaReserveConcurrency: 20,
        lambdaCanaryDeploymentPreference: true,
        orderTable: tenantDataStack.orderTable,
        productTable: tenantDataStack.productTable,
        isPooledDeploy: isPooledDeploy,
        systemProviderSettingsTableArn: systemSettingsTableArn,
        tenantDetailsTableArn: tenantDetailsTableArn,
      }
    );

    const tenantApiStack = new TenantApiStack(this, "tenantApiStack", {
      tags: {
        environment: stageName,
      },
      stageName: stageName,
      tenantId: tenantId,
      getOrderFunctionArn: tenantFunctionStack.getOrderFunctionArn,
      createOrderFunctionArn: tenantFunctionStack.createOrderFunctionArn,
      getOrdersFunctionArn: tenantFunctionStack.getOrdersFunctionArn,
      getProductFunctionArn: tenantFunctionStack.getProductFunctionArn,
      createProductFunctionArn: tenantFunctionStack.createProductFunctionArn,
      getProductsFunctionArn: tenantFunctionStack.getProductsFunctionArn,
      updateOrderFunctionArn: tenantFunctionStack.updateOrderFunctionArn,
      deleteOrderFunctionArn: tenantFunctionStack.deleteOrderFunctionArn,
      updateProductFunctionArn: tenantFunctionStack.updateProductFunctionArn,
      deleteProductFunctionArn: tenantFunctionStack.deleteProductFunctionArn,
      authorizerFunctionArn: authorizerFunctionArn,
    });

    const tenantApigwLambdaPermissionStack =
      new TenantApigwLambdaPermissionStack(
        this,
        "tenantApigwLambdaPermissionStack",
        {
          tags: {
            environment: stageName,
          },
          getOrdersFunctionArn: tenantFunctionStack.getOrdersFunctionArn,
          createOrderFunctionArn: tenantFunctionStack.createOrderFunctionArn,
          getOrderFunctionArn: tenantFunctionStack.getOrderFunctionArn,
          updateOrderFunctionArn: tenantFunctionStack.updateOrderFunctionArn,
          deleteOrderFunctionArn: tenantFunctionStack.deleteOrderFunctionArn,
          getProductsFunctionArn: tenantFunctionStack.getProductsFunctionArn,
          createProductFunctionArn:
            tenantFunctionStack.createProductFunctionArn,
          getProductFunctionArn: tenantFunctionStack.getProductFunctionArn,
          updateProductFunctionArn:
            tenantFunctionStack.updateProductFunctionArn,
          deleteProductFunctionArn:
            tenantFunctionStack.deleteProductFunctionArn,
          authorizerFunctionArn: authorizerFunctionArn,
          tenantApiId: tenantApiStack.restApiId,
        }
      );

    const tenantCustomResourceStack = new TenantCustomResourceStack(
      this,
      "tenantCustomResourceStack",
      {
        tags: {
          environment: stageName,
        },
        tenantId: tenantId,
        updateUsagePlanFunctionArn:
          tenantFunctionStack.updateUsagePlanFunctionArn,
        updateTenantApiGatewayUrlFunctionArn:
          tenantFunctionStack.updateTenantApiGatewayUrlFunctionArn,
        tenantApiGatewayId: tenantApiStack.restApiId,
        systemProviderSettingsTableName: systemProviderSettingsTableName,
        tenantDetailsTableName: tenantDetailsTableName,
        isPooledDeploy: isPooledDeploy,
        stageName: stageName,
        usagePlanBasicTierId: usagePlanBasicTierId,
        usagePlanStandardTierId: usagePlanStandardTierId,
        usagePlanPremiumTierId: usagePlanPremiumTierId,
        usagePlanPlatinumTierId: usagePlanPlatinumTierId,
      }
    );
    tenantFunctionStack.addDependency(tenantDataStack);
    tenantApiStack.addDependency(tenantFunctionStack);
    tenantApigwLambdaPermissionStack.addDependency(tenantFunctionStack);
    tenantCustomResourceStack.addDependency(tenantApigwLambdaPermissionStack);
    cdk.Tags.of(tenantDataStack).add("TenantId", tenantId);
    cdk.Tags.of(tenantFunctionStack).add("TenantId", tenantId);
    cdk.Tags.of(tenantApiStack).add("TenantId", tenantId);
    cdk.Tags.of(tenantApigwLambdaPermissionStack).add("TenantId", tenantId);
    cdk.Tags.of(tenantCustomResourceStack).add("TenantId", tenantId);
  }
}
