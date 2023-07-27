import * as cdk from "aws-cdk-lib";
import * as cloudformation from "aws-cdk-lib/aws-cloudformation";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { TenantCustomResourceStackProps } from "@/shared/prop_extensions.types";
import { Provider } from "aws-cdk-lib/custom-resources";
import { generateLogicalId } from "../utils/Utils";
import { TenantSystemNameDict } from "@/shared/Constants";

export class TenantCustomResourceStack extends cdk.NestedStack {
  constructor(
    scope: Construct,
    id: string,
    props: TenantCustomResourceStackProps
  ) {
    super(scope, id, props);
    const stageName = props.tags.environment;
    const tenantId = props.tenantId;
    const updateUsagePlanFunction = lambda.Function.fromFunctionArn(
      this,

      generateLogicalId(TenantSystemNameDict.updateUsagePlanFunction, tenantId),

      props.updateUsagePlanFunctionArn
    );

    const associateUsagePlanWithTenantApiProvider = new Provider(
      this,
      generateLogicalId(
        TenantSystemNameDict.associateUsagePlanWithTenantApiProvider,
        tenantId
      ),
      {
        onEventHandler: updateUsagePlanFunction,
      }
    );

    new cdk.CustomResource(
      this,
      generateLogicalId(
        TenantSystemNameDict.associateUsagePlanWithTenantApiCustomResource,
        tenantId
      ),

      {
        serviceToken: associateUsagePlanWithTenantApiProvider.serviceToken,
        properties: {
          ForceRefreshTrigger: new Date().toISOString(),
          ApiGatewayId: props.tenantApiGatewayId,
          SettingsTableName: props.systemProviderSettingsTableName,
          TenantId: props.tenantId,
          Stage: props.stageName,
          UsagePlanBasicTierId: props.usagePlanBasicTierId,
          UsagePlanStandardTierId: props.usagePlanStandardTierId,
          UsagePlanPremiumTierId: props.usagePlanPremiumTierId,
          UsagePlanPlatinumTierId: props.usagePlanPlatinumTierId,
        },
      }
    );

    const updateTenantApiGatewayUrlFunction = lambda.Function.fromFunctionArn(
      this,
      generateLogicalId(
        TenantSystemNameDict.updateTenantApiGatewayUrlFunction,
        tenantId
      ),
      props.updateTenantApiGatewayUrlFunctionArn
    );

    const updateTenantApiGatewayUrlProvider = new Provider(
      this,
      generateLogicalId(
        TenantSystemNameDict.updateTenantApiGatewayUrlProvider,
        tenantId
      ),

      {
        onEventHandler: updateTenantApiGatewayUrlFunction,
      }
    );

    new cdk.CustomResource(
      this,
      generateLogicalId(
        TenantSystemNameDict.updateTenantApiGatewayUrlCustomResource,
        tenantId
      ),
      {
        serviceToken: updateTenantApiGatewayUrlProvider.serviceToken,
        properties: {
          ForceRefreshTrigger: new Date().toISOString(),
          ApiGatewayId: props.tenantApiGatewayId,
          TenantDetailsTableName: props.tenantDetailsTableName,
          SettingsTableName: props.systemProviderSettingsTableName,
          TenantId: props.tenantId,
          TenantApiGatewayUrl: `https://${props.tenantApiGatewayId}.execute-api.${cdk.Aws.REGION}.amazonaws.com/${stageName}/`,
        },
      }
    );
  }
}
