import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

import { TenantDeploymentStackProps } from "@/shared/prop_extensions.types";
import { TenantDataStack } from "./TenantDataStack";
import { TenantLambdaStack } from "./TenantLambdaStack";
import { TenantApiStack } from "./TenantApiStack";
import { TenantApigwLambdaPermissionStack } from "./TenantApigwLambdaPermissionStack";
import { TenantCustomResourceStack } from "./TenantCustomResourceStack";
import {
  createCfnOutputIfNotExists,
  generateLogicalId,
  generatePhysicalName,
} from "../utils/Utils";
import { TenantSystemNameDict } from "@/shared/Constants";
export class TenantDeploymentStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: TenantDeploymentStackProps) {
    super(scope, id, props);
    let tenanIdCfnParam = new cdk.CfnParameter(
      this,
      TenantSystemNameDict.tenanIdCfnParam,
      {
        type: "String",
        description: "This is tenantId",
      }
    );

    const systemSettingsTableArnCfnParam = new cdk.CfnParameter(
      this,
      TenantSystemNameDict.systemSettingsTableArnCfnParam,
      {
        type: "String",
        description: "The ARN of the system settings table",
      }
    );

    const authorizerFunctionArnCfnParam = new cdk.CfnParameter(
      this,
      TenantSystemNameDict.authorizerFunctionArnCfnParam,
      {
        type: "String",
        description: "The ARN of the authorizer function",
      }
    );

    const systemProviderSettingsTableNameCfnParam = new cdk.CfnParameter(
      this,
      TenantSystemNameDict.systemProviderSettingsTableNameCfnParam,
      {
        type: "String",
        description: "The name of the system provider settings table",
      }
    );

    const tenantDetailsTableNameCfnParam = new cdk.CfnParameter(
      this,
      TenantSystemNameDict.tenantDetailsTableNameCfnParam,
      {
        type: "String",
        description: "The name of the tenant details table",
      }
    );
    const tenantDetailsTableArnCfnParam = new cdk.CfnParameter(
      this,
      TenantSystemNameDict.tenantDetailsTableArnCfnParam,
      {
        type: "String",
        description: "The name of the tenant details table",
      }
    );

    const usagePlanBasicTierIdCfnParam = new cdk.CfnParameter(
      this,
      TenantSystemNameDict.usagePlanBasicTierIdCfnParam,
      {
        type: "String",
        description: "The ID of the basic tier usage plan",
      }
    );

    const usagePlanStandardTierIdCfnParam = new cdk.CfnParameter(
      this,
      TenantSystemNameDict.usagePlanStandardTierIdCfnParam,
      {
        type: "String",
        description: "The ID of the standard tier usage plan",
      }
    );

    const usagePlanPremiumTierIdCfnParam = new cdk.CfnParameter(
      this,
      TenantSystemNameDict.usagePlanPremiumTierIdCfnParam,
      {
        type: "String",
        description: "The ID of the premium tier usage plan",
      }
    );

    const usagePlanPlatinumTierIdCfnParam = new cdk.CfnParameter(
      this,
      TenantSystemNameDict.usagePlanPlatinumTierIdCfnParam,
      {
        type: "String",
        description: "The ID of the platinum tier usage plan",
      }
    );
    //TODO: doc it
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
    const tenantCatagory = tenantId;
    const tenantDataStack = new TenantDataStack(
      this,
      generateLogicalId(TenantSystemNameDict.dataStack, tenantCatagory),
      {
        tags: {
          environment: stageName,
        },
        tenantId: tenantCatagory,
      }
    );

    const tenantFunctionStack = new TenantLambdaStack(
      this,
      generateLogicalId(TenantSystemNameDict.funcStack, tenantCatagory),
      {
        tags: {
          environment: stageName,
        },
        tenantId: tenantCatagory,
        lambdaReserveConcurrency: 20,
        lambdaCanaryDeploymentPreference: true,
        orderTable: tenantDataStack.orderTable,
        productTable: tenantDataStack.productTable,
        serverlessSaaSSettingsTableArn: systemSettingsTableArn,
        tenantDetailsTableArn: tenantDetailsTableArn,
      }
    );

    const tenantApiStack = new TenantApiStack(
      this,
      generateLogicalId(TenantSystemNameDict.apigwStack, tenantCatagory),
      {
        tags: {
          environment: stageName,
        },
        stageName: stageName,
        tenantId: tenantCatagory,
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
      }
    );
    createCfnOutputIfNotExists(this, {
      id: generateLogicalId(TenantSystemNameDict.apigwUrl, tenantCatagory),
      props: {
        exportName: generatePhysicalName(
          TenantSystemNameDict.apigwUrl,
          tenantCatagory
        ),
        value: `https://${tenantApiStack.restApiId}.execute-api.${cdk.Aws.REGION}.amazonaws.com/${tenantApiStack.restApiIdStageName}/`,
      },
    });

    const tenantApigwLambdaPermissionStack =
      new TenantApigwLambdaPermissionStack(
        this,
        generateLogicalId(
          TenantSystemNameDict.apigwPermissonStack,
          tenantCatagory
        ),
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
          tenantId: tenantCatagory,
        }
      );

    const tenantCustomResourceStack = new TenantCustomResourceStack(
      this,
      generateLogicalId(TenantSystemNameDict.customResource, tenantCatagory),
      {
        tags: {
          environment: stageName,
        },
        tenantId: tenantCatagory,
        updateUsagePlanFunctionArn:
          tenantFunctionStack.updateUsagePlanFunctionArn,
        updateTenantApiGatewayUrlFunctionArn:
          tenantFunctionStack.updateTenantApiGatewayUrlFunctionArn,
        tenantApiGatewayId: tenantApiStack.restApiId,
        systemProviderSettingsTableName: systemProviderSettingsTableName,
        tenantDetailsTableName: tenantDetailsTableName,
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
    cdk.Tags.of(tenantDataStack).add("TenantId", tenantCatagory);
    cdk.Tags.of(tenantFunctionStack).add("TenantId", tenantCatagory);
    cdk.Tags.of(tenantApiStack).add("TenantId", tenantCatagory);
    cdk.Tags.of(tenantApigwLambdaPermissionStack).add(
      "TenantId",
      tenantCatagory
    );
    cdk.Tags.of(tenantCustomResourceStack).add("TenantId", tenantCatagory);
  }
}
