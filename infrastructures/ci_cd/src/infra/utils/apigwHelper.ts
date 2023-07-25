import * as constructs from "constructs";
import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as logs from "aws-cdk-lib/aws-logs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import {
  ResourceConfig,
  SecurityTypeOptions,
} from "@/shared/prop_extensions.types";

const createResource = (
  api: apigateway.RestApi,
  parentResource: apigateway.IResource,
  pathParts: string[],
  resourceConfig: ResourceConfig,
  securityTypeOptions: SecurityTypeOptions
) => {
  if (pathParts.length === 0) {
    for (const method of resourceConfig.methods) {
      const integration = resourceConfig.integrations[method];
      const security = resourceConfig.security[method] ?? [];
      if (security.length > 0) {
        let securityOptions: apigateway.MethodOptions = {};
        for (const type of security) {
          securityOptions = {
            ...securityOptions,
            ...securityTypeOptions[type],
          };
        }
        parentResource.addMethod(method, integration, securityOptions);
      } else {
        parentResource.addMethod(method, integration);
      }
    }
    return;
  }

  const [currentPart, ...remainingParts] = pathParts;
  let currentResource = parentResource.getResource(currentPart);
  if (!currentResource) {
    currentResource = parentResource.addResource(currentPart);
  }
  createResource(
    api,
    currentResource,
    remainingParts,
    resourceConfig,
    securityTypeOptions
  );
};

export function constructApi(
  resourceList: ResourceConfig[],
  apigw: cdk.aws_apigateway.RestApi,
  securityTypeOptions: SecurityTypeOptions
) {
  for (const resourceConfig of resourceList) {
    const pathParts = resourceConfig.path.split("/");
    createResource(
      apigw,
      apigw.root,
      pathParts,
      resourceConfig,
      securityTypeOptions
    );
  }
}
