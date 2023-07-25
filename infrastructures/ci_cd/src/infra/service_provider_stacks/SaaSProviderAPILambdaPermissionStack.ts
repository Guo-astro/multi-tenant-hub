import { NestedStack } from "aws-cdk-lib";
import { Construct } from "constructs";
import { SaaSProviderAPILambdaPermissiontackProps } from "@/shared/prop_extensions.types";
import { LambdaIntegrationHelper } from "../utils/lambdaHelpers";
import { CfnPermission } from "aws-cdk-lib/aws-lambda";
import { generateLogicalId } from "../utils/Utils";
import { SystemProviderInfraStackNameDict } from "../../shared/Constants";

export class SaaSProviderAPILambdaPermissionStack extends NestedStack {
  constructor(
    scope: Construct,
    id: string,
    props: SaaSProviderAPILambdaPermissiontackProps
  ) {
    super(scope, id, props);

    const {
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
      authorizerFunctionArn,
      apiId,
      tenantId,
    } = props;

    const lambdaFunctionArns: Record<string, string> = {
      registerTenantFunction: registerTenantFunctionArn,
      provisionTenantFunction: provisionTenantFunctionArn,
      deProvisionTenantFunction: deProvisionTenantFunctionArn,
      activateTenantFunction: activateTenantFunctionArn,
      getTenantsFunction: getTenantsFunctionArn,
      createTenantFunction: createTenantFunctionArn,
      getTenantFunction: getTenantFunctionArn,
      deactivateTenantFunction: deactivateTenantFunctionArn,
      updateTenantFunction: updateTenantFunctionArn,
      getTenantConfigFunction: getTenantConfigFunctionArn,
      getUsersFunction: getUsersFunctionArn,
      getUserFunction: getUserFunctionArn,
      updateUserFunction: updateUserFunctionArn,
      disableUserFunction: disableUserFunctionArn,
      createTenantAdminUserFunction: createTenantAdminUserFunctionArn,
      createUserFunction: createUserFunctionArn,
      disableUsersByTenantFunction: disableUsersByTenantFunctionArn,
      enableUsersByTenantFunction: enableUsersByTenantFunctionArn,
      authorizerFunction: authorizerFunctionArn,
    };

    // Must use low level api otherwise no effect. https://github.com/aws/aws-cdk/issues/7588
    for (const key in lambdaFunctionArns) {
      if (key === "authorizerFunction") {
        new CfnPermission(
          this,
          generateLogicalId(
            SystemProviderInfraStackNameDict.apigwPermission,
            tenantId,
            key
          ),
          {
            action: "lambda:InvokeFunction",
            functionName: lambdaFunctionArns[key],
            principal: "apigateway.amazonaws.com",
            sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${apiId}/authorizers/*`,
          }
        );
      } else {
        new CfnPermission(
          this,
          generateLogicalId(
            SystemProviderInfraStackNameDict.apigwPermission,
            tenantId,
            key
          ),

          {
            action: "lambda:InvokeFunction",
            functionName: lambdaFunctionArns[key],
            principal: "apigateway.amazonaws.com",
            sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${apiId}/*/*/*`,
          }
        );
      }
    }
  }
}
