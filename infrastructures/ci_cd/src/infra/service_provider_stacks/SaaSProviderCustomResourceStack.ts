/* eslint-disable no-new */
import * as cdk from "aws-cdk-lib";
import * as cloudformation from "aws-cdk-lib/aws-cloudformation";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { SaaSProviderCustomResourceStackProps } from "@/shared/prop_extensions.types";
import { Provider } from "aws-cdk-lib/custom-resources";
import { SystemProviderInfraStackNameDict } from "../../shared/Constants";
import { generateLogicalId } from "../utils/Utils";

export class SaaSProviderCustomResourceStack extends cdk.NestedStack {
  constructor(
    scope: Construct,
    id: string,
    props: SaaSProviderCustomResourceStackProps
  ) {
    super(scope, id, props);
    const tenantId = props.tenantId;
    const updateSettingsTableFunction = lambda.Function.fromFunctionAttributes(
      this,
      generateLogicalId(
        SystemProviderInfraStackNameDict.UpdateSettingsTableFunction,
        tenantId
      ),
      {
        functionArn: props.updateSettingsTableFunctionArn,

        sameEnvironment: true,
      }
    );

    const provider = new Provider(
      this,
      generateLogicalId(
        SystemProviderInfraStackNameDict.UpdateSettingsTableProvider,
        tenantId
      ),
      {
        onEventHandler: updateSettingsTableFunction,
      }
    );

    new cdk.CustomResource(
      this,
      generateLogicalId(
        SystemProviderInfraStackNameDict.UpdateSettingsTableCustomResource,
        tenantId
      ),
      {
        serviceToken: provider.serviceToken,
        properties: {
          ForceRefreshTrigger: new Date().toISOString(),
          SettingsTableName: props.serverlessSaaSSettingsTableName,
          cognitoUserPoolId: props.cognitoUserPoolId,
          cognitoUserPoolClientId: props.cognitoUserPoolClientId,
        },
      }
    );

    const updateTenantStackMapFunction = lambda.Function.fromFunctionAttributes(
      this,
      generateLogicalId(
        SystemProviderInfraStackNameDict.UpdateTenantStackMapFunction,
        tenantId
      ),
      {
        functionArn: props.updateTenantStackMapTableFunctionArn,

        sameEnvironment: true,
      }
    );

    const tenantProvider = new Provider(
      this,
      generateLogicalId(
        SystemProviderInfraStackNameDict.UpdateTenantStackMapProvider,
        tenantId
      ),
      {
        onEventHandler: updateTenantStackMapFunction,
      }
    );

    new cdk.CustomResource(
      this,
      generateLogicalId(
        SystemProviderInfraStackNameDict.updateTenantStackMapCustomResource,
        tenantId
      ),
      {
        serviceToken: tenantProvider.serviceToken,
        properties: {
          ForceRefreshTrigger: new Date().toISOString(),
          TenantStackMappingTableName: props.tenantStackMapTableName,
        },
      }
    );
  }
}
