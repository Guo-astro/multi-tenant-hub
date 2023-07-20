import { NestedStack } from "aws-cdk-lib";
import { Construct } from "constructs";
import { TenantApiLambdaPermissiontackProps } from "shared/prop_extensions.types";
import { CfnPermission } from "aws-cdk-lib/aws-lambda";

export class TenantApigwLambdaPermissionStack extends NestedStack {
  constructor(
    scope: Construct,
    id: string,
    props: TenantApiLambdaPermissiontackProps
  ) {
    super(scope, id, props);

    const {
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
      tenantApiId,
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

    // Must use low level api otherwise no effect. https://github.com/aws/aws-cdk/issues/7588
    for (const key in lambdaFunctionArns) {
      console.log(`tenantFunctionArn: ${key}`);
      if (key === "authorizerFunction") {
        new CfnPermission(this, `apigw-permission-${key}`, {
          action: "lambda:InvokeFunction",
          functionName: lambdaFunctionArns[key],
          principal: "apigateway.amazonaws.com",
          sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${tenantApiId}/authorizers/*`,
        });
      } else {
        new CfnPermission(this, `apigw-permission-${key}`, {
          action: "lambda:InvokeFunction",
          functionName: lambdaFunctionArns[key],
          principal: "apigateway.amazonaws.com",
          sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${tenantApiId}/*/*/*`,
        });
      }
    }
  }
}
