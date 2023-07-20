import * as cdk from "aws-cdk-lib";
import * as cloudformation from "aws-cdk-lib/aws-cloudformation";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { SaaSProviderCustomResourceStackProps } from "shared/prop_extensions.types";
import { Provider } from "aws-cdk-lib/custom-resources";

export class SaaSProviderCustomResourceStack extends cdk.NestedStack {
  constructor(
    scope: Construct,
    id: string,
    props: SaaSProviderCustomResourceStackProps
  ) {
    super(scope, id, props);

    // // Custom resources
    // const updateSettingsTableExecutionRole = new iam.Role(
    //   this,
    //   "updateSettingsTableExecutionRole",
    //   {
    //     assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    //   }
    // );

    // updateSettingsTableExecutionRole.addToPolicy(
    //   new iam.PolicyStatement({
    //     effect: iam.Effect.ALLOW,
    //     actions: ["lambda:InvokeFunction"],
    //     resources: [
    //       props.updateSettingsTableFunctionArn,
    //       props.updateTenantStackMapTableFunctionArn,
    //     ],
    //   })
    // );

    const updateSettingsTableFunction = lambda.Function.fromFunctionArn(
      this,
      "UpdateSettingsTableFunction",
      props.updateSettingsTableFunctionArn
    );

    const provider = new Provider(this, "UpdateSettingsTableProvider", {
      onEventHandler: updateSettingsTableFunction,
    });

    new cdk.CustomResource(this, "UpdateSettingsTableCustomResource", {
      serviceToken: provider.serviceToken,
      properties: {
        ForceRefreshTrigger: new Date().toISOString(),
        SettingsTableName: props.serverlessSaaSSettingsTableName,
        cognitoUserPoolId: props.cognitoUserPoolId,
        cognitoUserPoolClientId: props.cognitoUserPoolClientId,
      },
    });

    // const updateTenantStackMapCRExecutionRole = new iam.Role(
    //   this,
    //   "updateTenantStackMapCRExecutionRole",
    //   {
    //     assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    //   }
    // );

    // updateTenantStackMapCRExecutionRole.addToPolicy(
    //   new iam.PolicyStatement({
    //     effect: iam.Effect.ALLOW,
    //     actions: ["lambda:InvokeFunction"],
    //     resources: [
    //       props.updateTenantStackMapTableFunctionArn,
    //       props.updateSettingsTableFunctionArn,
    //     ],
    //   })
    // );

    const updateTenantStackMapFunction = lambda.Function.fromFunctionArn(
      this,
      "UpdateTenantStackMapFunction",
      props.updateTenantStackMapTableFunctionArn
    );

    const tenantProvider = new Provider(this, "UpdateTenantStackMapProvider", {
      onEventHandler: updateTenantStackMapFunction,
    });

    new cdk.CustomResource(this, "updateTenantStackMapCustomResource", {
      serviceToken: tenantProvider.serviceToken,
      properties: {
        ForceRefreshTrigger: new Date().toISOString(),
        TenantStackMappingTableName: props.tenantStackMapTableName,
      },
    });
  }
}
