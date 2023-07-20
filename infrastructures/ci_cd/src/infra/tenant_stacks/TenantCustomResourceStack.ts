import * as cdk from "aws-cdk-lib";
import * as cloudformation from "aws-cdk-lib/aws-cloudformation";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { TenantCustomResourceStackProps } from "shared/prop_extensions.types";
import { Provider } from "aws-cdk-lib/custom-resources";

export class TenantCustomResourceStack extends cdk.NestedStack {
  constructor(
    scope: Construct,
    id: string,
    props: TenantCustomResourceStackProps
  ) {
    super(scope, id, props);
    const stageName = props.tags.environment;
    const updateUsagePlanFunction = lambda.Function.fromFunctionArn(
      this,
      "updateUsagePlanFunction",
      props.updateUsagePlanFunctionArn
    );

    const associateUsagePlanWithTenantApiProvider = new Provider(
      this,
      "associateUsagePlanWithTenantApiProvider",
      {
        onEventHandler: updateUsagePlanFunction,
      }
    );

    new cdk.CustomResource(
      this,
      "associateUsagePlanWithTenantApiCustomResource",
      {
        serviceToken: associateUsagePlanWithTenantApiProvider.serviceToken,
        properties: {
          ForceRefreshTrigger: new Date().toISOString(),
          ApiGatewayId: props.tenantApiGatewayId,
          SettingsTableName: props.systemProviderSettingsTableName,
          IsPooledDeploy: props.isPooledDeploy,
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
      "updateTenantApiGatewayUrlFunction",
      props.updateTenantApiGatewayUrlFunctionArn
    );

    const updateTenantApiGatewayUrlProvider = new Provider(
      this,
      "updateTenantApiGatewayUrlProvider",
      {
        onEventHandler: updateTenantApiGatewayUrlFunction,
      }
    );

    new cdk.CustomResource(this, "updateTenantApiGatewayUrlCustomResource", {
      serviceToken: updateTenantApiGatewayUrlProvider.serviceToken,
      properties: {
        ForceRefreshTrigger: new Date().toISOString(),
        ApiGatewayId: props.tenantApiGatewayId,
        TenantDetailsTableName: props.tenantDetailsTableName,
        SettingsTableName: props.systemProviderSettingsTableName,
        TenantId: props.tenantId,
        TenantApiGatewayUrl: `https://${props.tenantApiGatewayId}.execute-api.${cdk.Aws.REGION}.amazonaws.com/${stageName}/`,
      },
    });
  }
}
