import { StackProps, NestedStackProps } from "aws-cdk-lib";
import { Artifact, Pipeline } from "aws-cdk-lib/aws-codepipeline";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { Repository } from "aws-cdk-lib/aws-ecr";
import { Bucket } from "aws-cdk-lib/aws-s3";

type AllowedEnvs = "development" | "staging" | "production";

export type SaaSProviderStackProps = StackProps & {
  tags: {
    environment: AllowedEnvs;
    owner: string;
    repo: string;
    branch: string;
    PATSSMKey: string;
  };
};
export type ECRStackProps = StackProps & {
  tags: {
    environment: AllowedEnvs;
  };
};

export type SaaSProviderAdminUIDeploymentStackProps = NestedStackProps & {
  tags: {
    environment: AllowedEnvs;
  };
  tenantId: "system";
};

export type AuthStackProps = StackProps & {
  tags: {
    environment: AllowedEnvs;
  };

  adminEmail: string;
  systemAdminRoleName: string;
  apiKeyOperationUsers: string;
  adminUserPoolCallbackURL: string;
  tenantUserPoolCallbackURL: string;
  tenantId: string;
};

export type LambdaStackProps = NestedStackProps & {
  tags: {
    environment: AllowedEnvs;
  };
  lambdaImageTag: string;
  tenantProvisioningPipelineName: string;
  lambdaEcrRepositoryUri: string;
  cognitoOperationUsersUserPoolId: string;
  cognitoOperationUsersUserPoolClientId: string;
  cognitoUserPoolId: string;
  cognitoUserPoolClientId: string;
  tenantDetailsTableArn: string;
  serverlessSaaSSettingsTableArn: string;
  apiKeyOperationUsersParameter: string;
  apiKeyPlatinumTierParameter: string;
  apiKeyPremiumTierParameter: string;
  apiKeyStandardTierParameter: string;
  apiKeyBasicTierParameter: string;
  tenantStackMappingTableArn: string;
  tenantUserMappingTableArn: string;
  tenantStackMappingTableName: string;
  tenantUserMappingTableName: string;
  tenantDetailsTableName: string;
  tenantDetailsTableIndexArn: string;
  tenantUserMappingTableIndexArn: string;
  serverlessSaaSSettingsTableName: string;

  tenantUserPoolCallbackURLParameter: string;
  lambdaCanaryDeploymentPreference: boolean;
  tenantId: string;
};

export type DataStackProps = NestedStackProps & {
  tags: {
    environment: AllowedEnvs;
  };
};

export type SaaSProviderAPILambdaPermissiontackProps = NestedStackProps & {
  tags: {
    environment: AllowedEnvs;
  };
  registerTenantLambdaExecutionRoleArn: string;
  tenantManagementLambdaExecutionRoleArn: string;
  registerTenantFunctionArn: string;
  provisionTenantFunctionArn: string;
  deProvisionTenantFunctionArn: string;
  activateTenantFunctionArn: string;
  getTenantsFunctionArn: string;
  createTenantFunctionArn: string;
  getTenantFunctionArn: string;
  deactivateTenantFunctionArn: string;
  updateTenantFunctionArn: string;
  getTenantConfigFunctionArn: string;
  getUsersFunctionArn: string;
  getUserFunctionArn: string;
  updateUserFunctionArn: string;
  disableUserFunctionArn: string;
  createTenantAdminUserFunctionArn: string;
  createUserFunctionArn: string;
  disableUsersByTenantFunctionArn: string;
  enableUsersByTenantFunctionArn: string;
  authorizerFunctionArn: string;
  apiId: string;
  tenantId: string;
};

export type SaaSProviderAPIStackProps = NestedStackProps & {
  tags: {
    environment: AllowedEnvs;
  };
  stageName: string;
  registerTenantLambdaExecutionRoleArn: string;
  tenantManagementLambdaExecutionRoleArn: string;
  registerTenantFunctionArn: string;
  provisionTenantFunctionArn: string;
  deProvisionTenantFunctionArn: string;
  activateTenantFunctionArn: string;
  getTenantsFunctionArn: string;
  createTenantFunctionArn: string;
  getTenantFunctionArn: string;
  deactivateTenantFunctionArn: string;
  updateTenantFunctionArn: string;
  getTenantConfigFunctionArn: string;
  getUsersFunctionArn: string;
  getUserFunctionArn: string;
  updateUserFunctionArn: string;
  disableUserFunctionArn: string;
  createTenantAdminUserFunctionArn: string;
  createUserFunctionArn: string;
  disableUsersByTenantFunctionArn: string;
  enableUsersByTenantFunctionArn: string;
  tenantManagementAuthorizerFunctionArn: string;
  apiKeyOperationUsersParameter: string;
  apiKeyPlatinumTierParameter: string;
  apiKeyPremiumTierParameter: string;
  apiKeyStandardTierParameter: string;
  apiKeyBasicTierParameter: string;
  tenantId: string;
};
export type SaaSProviderCustomResourceStackProps = NestedStackProps & {
  tags: {
    environment: AllowedEnvs;
  };
  serverlessSaaSSettingsTableArn: string;
  serverlessSaaSSettingsTableName: string;
  tenantStackMappingTableArn: string;
  tenantStackMapTableName: string;
  updateSettingsTableFunctionArn: string;
  updateTenantStackMapTableFunctionArn: string;
  cognitoUserPoolId: string;
  cognitoUserPoolClientId: string;
  tenantId: string;
};

export type LambdaImageBuilderStackStackProps = StackProps & {
  tags: {
    environment: AllowedEnvs;
  };
  repositoryUri: string;
};

export type LambdaLayerImageBuilderStackStackProps = StackProps & {
  tags: {
    environment: AllowedEnvs;
  };
};

export type DeploymentStackProps = StackProps & {
  tags: {
    environment: AllowedEnvs;
  };
  lambdaEcrRepositoryUri: string;
};

export type SSMParameterReaderProps = StackProps & {
  tags: {
    environment: AllowedEnvs;
  };
  parameterName: string;
  region: string;
};

export type AppDeployStackProps = StackProps & {
  tags: {
    environment: AllowedEnvs;
  };
  pipeline: Pipeline;
  sourceOutput: Artifact;
};

export type TenantProvisioningPipelineProps = StackProps & {
  tags: {
    environment: AllowedEnvs;
  };
  tenantProvisoningPipelineName: string;
};

export type SystemProvisiongPipelineProps = StackProps & {
  tags: {
    environment: AllowedEnvs;
  };
  tenantProvisoningPipelineName: string;
  lambdaECR: Repository;
  lambdaLayerECR: Repository;
};
////////////TenantStack///////////
export type TenantDataStackProps = StackProps & {
  tags: {
    environment: AllowedEnvs;
  };
  tenantId: string;
};

export type TenantFunctionStackProps = StackProps & {
  tags: {
    environment: AllowedEnvs;
  };
  productTable: Table;
  orderTable: Table;
  tenantId: string;
  lambdaCanaryDeploymentPreference: boolean;
  lambdaReserveConcurrency: number;
  serverlessSaaSSettingsTableArn: string;
  tenantDetailsTableArn: string;
};
export type TenantApiStackProps = NestedStackProps & {
  tags: {
    environment: AllowedEnvs;
  };
  stageName: string;
  tenantId: string;
  getOrdersFunctionArn: string;
  createOrderFunctionArn: string;
  getOrderFunctionArn: string;
  updateOrderFunctionArn: string;
  deleteOrderFunctionArn: string;
  getProductsFunctionArn: string;
  createProductFunctionArn: string;
  getProductFunctionArn: string;
  updateProductFunctionArn: string;
  deleteProductFunctionArn: string;
  authorizerFunctionArn: string;
};

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "OPTIONS";
type SecurityType = "apiKey" | "iamAuth" | "Authorizer";

export type SecurityTypeOptions = {
  [key in SecurityType]?: apigateway.MethodOptions | never;
};
export type ResourceConfig = {
  path: string;
  methods: HttpMethod[];
  integrations: { [method in HttpMethod]?: apigateway.Integration };
  security: { [method in HttpMethod]?: SecurityType[] | [] };
};

export type TenantApiLambdaPermissiontackProps = NestedStackProps & {
  tags: {
    environment: AllowedEnvs;
  };
  getOrdersFunctionArn: string;
  createOrderFunctionArn: string;
  getOrderFunctionArn: string;
  updateOrderFunctionArn: string;
  deleteOrderFunctionArn: string;
  getProductsFunctionArn: string;
  createProductFunctionArn: string;
  getProductFunctionArn: string;
  updateProductFunctionArn: string;
  deleteProductFunctionArn: string;
  authorizerFunctionArn: string;
  tenantApiId: string;
  tenantId: string;
};

export type TenantCustomResourceStackProps = NestedStackProps & {
  tags: {
    environment: AllowedEnvs;
  };
  tenantId: string;
  updateUsagePlanFunctionArn: string;
  updateTenantApiGatewayUrlFunctionArn: string;
  tenantApiGatewayId: string;
  systemProviderSettingsTableName: string;
  tenantDetailsTableName: string;
  stageName: string;
  usagePlanBasicTierId: string;
  usagePlanStandardTierId: string;
  usagePlanPremiumTierId: string;
  usagePlanPlatinumTierId: string;
};
export type TenantDeploymentStackProps = StackProps & {
  tags: {
    environment: AllowedEnvs;
  };
};

export type CostAnalyticsPipelineProps = StackProps & {
  tags: {
    environment: AllowedEnvs;
  };
};
export type SaasCostByTenantStackProps = NestedStackProps & {
  tags: {
    environment: AllowedEnvs;
  };
};

export type CostAndUsageReportStackProps = NestedStackProps & {
  tags: {
    environment: AllowedEnvs;
  };
  reportBucket: Bucket;
};

export type CostDeploymentStackProps = StackProps & {
  tags: {
    environment: AllowedEnvs;
  };
};
