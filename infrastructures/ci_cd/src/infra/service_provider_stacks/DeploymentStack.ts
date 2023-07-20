import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { SaaSProviderAPILambdaPermissionStack } from "@/infra/service_provider_stacks/SaaSProviderAPILambdaPermissionStack";
import { SystemProviderAPIStack } from "@/infra/service_provider_stacks/SaaSProviderAPIStack";
import { SaaSProviderWebHostingStack } from "@/infra/service_provider_stacks/SaaSProviderAdminUIHostingStack";
import { SaaSProviderAuthStack } from "@/infra/service_provider_stacks/SaaSProviderAuthStack";
import { SaaSProviderDataStack } from "@/infra/service_provider_stacks/SaaSProviderDataStack";
import { SaaSProviderLambdaStack } from "@/infra/service_provider_stacks/SaaSProviderLambdaStack";
import { createCfnOutputIfNotExists } from "../utils/Utils";
import { DeploymentStackProps } from "shared/prop_extensions.types";
import { SaaSProviderCustomResourceStack } from "./SaaSProviderCustomResourceStack";
export class DeploymentStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: DeploymentStackProps) {
    super(scope, id, props);
    const adminEmailParameter = "guo.yansong.ngy@gmail.com";
    const systemAdminRoleNameParameter = "SystemAdmin";
    const apiKeyOperationUsersParameter =
      "9a7743fa-3ae7-11eb-adc1-0242ac120002";
    const apiKeyPlatinumTierParameter = "88b43c36-802e-11eb-af35-38f9d35b2c15";
    const apiKeyPremiumTierParameter = "6db2bdc2-6d96-11eb-a56f-38f9d33cfd0f";
    const apiKeyStandardTierParameter = "b1c735d8-6d96-11eb-a28b-38f9d33cfd0f";
    const apiKeyBasicTierParameter = "daae9784-6d96-11eb-a28b-38f9d33cfd0f";
    const stageName = props.tags.environment;

    const webHostingStack = new SaaSProviderWebHostingStack(
      this,
      "SaaSProviderWebHostingStack",
      {
        tags: {
          environment: stageName,
        },
      }
    );

    const dataStack = new SaaSProviderDataStack(this, "SaaSProviderDataStack", {
      tags: {
        environment: stageName,
      },
    });

    const authStack = new SaaSProviderAuthStack(this, "SaaSProviderAuthStack", {
      tags: {
        environment: stageName,
      },

      adminEmail: adminEmailParameter,
      systemAdminRoleName: systemAdminRoleNameParameter,
      apiKeyOperationUsers: apiKeyOperationUsersParameter,
      adminUserPoolCallbackURL: webHostingStack.adminAppSiteUrlName,
      tenantUserPoolCallbackURL: webHostingStack.tenantAppSiteUrlName,
    });
    const functionStack = new SaaSProviderLambdaStack(
      this,
      "SaaSProviderLambdaStack",
      {
        tags: {
          environment: stageName,
        },
        lambdaImageTag: this.node.tryGetContext("lambdaImageTag") as string,
        tenantProvisioningPipelineName: this.node.tryGetContext(
          "tenantProvisiongPipelineName"
        ) as string,

        lambdaEcrRepositoryUri: props.lambdaEcrRepositoryUri,
        cognitoOperationUsersUserPoolId:
          authStack.cognitoOperationUsersUserPoolId,
        cognitoOperationUsersUserPoolClientId:
          authStack.cognitoOperationUsersUserPoolClientId,
        cognitoUserPoolId: authStack.cognitoUserPoolId,
        cognitoUserPoolClientId: authStack.cognitoUserPoolClientId,
        serverlessSaaSSettingsTableArn:
          dataStack.serverlessSaaSSettingsTableArn,
        apiKeyOperationUsersParameter: apiKeyOperationUsersParameter,
        apiKeyPlatinumTierParameter: apiKeyPlatinumTierParameter,
        apiKeyPremiumTierParameter: apiKeyPremiumTierParameter,
        apiKeyStandardTierParameter: apiKeyStandardTierParameter,
        apiKeyBasicTierParameter: apiKeyBasicTierParameter,
        tenantStackMappingTableArn: dataStack.tenantStackMappingTableArn,
        tenantUserMappingTableArn: dataStack.tenantUserMappingTableArn,
        tenantStackMappingTableName: dataStack.tenantStackMappingTableName,
        tenantUserPoolCallbackURLParameter:
          webHostingStack.tenantAppSiteUrlName,
        tenantDetailsTableArn: dataStack.tenantDetailsTableArn,
        tenantDetailsTableName: dataStack.tenantDetailsTableName,
        tenantDetailsTableIndexArn: dataStack.tenantDetailsTableIndexArn,
        tenantUserMappingTableIndexArn:
          dataStack.tenantUserMappingTableIndexArn,
        tenantUserMappingTableName: dataStack.tenantUserMappingTableName,
        serverlessSaaSSettingsTableName:
          dataStack.serverlessSaaSSettingsTableName,

        lambdaCanaryDeploymentPreference: false,
      }
    );

    const apiStack = new SystemProviderAPIStack(this, "SaaSProviderAPIStack", {
      tags: {
        environment: stageName,
      },
      stageName,
      registerTenantLambdaExecutionRoleArn:
        functionStack.registerTenantLambdaExecutionRoleArn,
      tenantManagementLambdaExecutionRoleArn:
        functionStack.tenantManagementLambdaExecutionRoleArn,
      registerTenantFunctionArn: functionStack.registerTenantFunctionArn,
      provisionTenantFunctionArn: functionStack.provisionTenantFunctionArn,
      deProvisionTenantFunctionArn: functionStack.deProvisionTenantFunctionArn,
      activateTenantFunctionArn: functionStack.activateTenantFunctionArn,
      getTenantsFunctionArn: functionStack.getTenantsFunctionArn,
      createTenantFunctionArn: functionStack.createTenantFunctionArn,
      getTenantFunctionArn: functionStack.getTenantFunctionArn,
      deactivateTenantFunctionArn: functionStack.deactivateTenantFunctionArn,
      updateTenantFunctionArn: functionStack.updateTenantFunctionArn,
      getTenantConfigFunctionArn: functionStack.getTenantConfigFunctionArn,
      getUsersFunctionArn: functionStack.getUsersFunctionArn,
      getUserFunctionArn: functionStack.getUserFunctionArn,
      updateUserFunctionArn: functionStack.updateUserFunctionArn,
      disableUserFunctionArn: functionStack.disableUserFunctionArn,
      createTenantAdminUserFunctionArn:
        functionStack.createTenantAdminUserFunctionArn,
      createUserFunctionArn: functionStack.createUserFunctionArn,
      disableUsersByTenantFunctionArn:
        functionStack.disableUsersByTenantFunctionArn,
      enableUsersByTenantFunctionArn:
        functionStack.enableUsersByTenantFunctionArn,
      sharedServicesAuthorizerFunctionArn:
        functionStack.sharedServicesAuthorizerFunctionArn,
      apiKeyOperationUsersParameter,
      apiKeyPlatinumTierParameter,
      apiKeyPremiumTierParameter,
      apiKeyStandardTierParameter,
      apiKeyBasicTierParameter,
    });

    const saaSProviderAPILambdaPermissionStack =
      new SaaSProviderAPILambdaPermissionStack(this, "perm", {
        tags: {
          environment: stageName,
        },
        registerTenantLambdaExecutionRoleArn:
          functionStack.registerTenantLambdaExecutionRoleArn,
        tenantManagementLambdaExecutionRoleArn:
          functionStack.tenantManagementLambdaExecutionRoleArn,
        registerTenantFunctionArn: functionStack.registerTenantFunctionArn,
        provisionTenantFunctionArn: functionStack.provisionTenantFunctionArn,
        deProvisionTenantFunctionArn:
          functionStack.deProvisionTenantFunctionArn,
        activateTenantFunctionArn: functionStack.activateTenantFunctionArn,
        getTenantsFunctionArn: functionStack.getTenantsFunctionArn,
        createTenantFunctionArn: functionStack.createTenantFunctionArn,
        getTenantFunctionArn: functionStack.getTenantFunctionArn,
        deactivateTenantFunctionArn: functionStack.deactivateTenantFunctionArn,
        updateTenantFunctionArn: functionStack.updateTenantFunctionArn,
        getTenantConfigFunctionArn: functionStack.getTenantConfigFunctionArn,
        getUsersFunctionArn: functionStack.getUsersFunctionArn,
        getUserFunctionArn: functionStack.getUserFunctionArn,
        updateUserFunctionArn: functionStack.updateUserFunctionArn,
        disableUserFunctionArn: functionStack.disableUserFunctionArn,
        createTenantAdminUserFunctionArn:
          functionStack.createTenantAdminUserFunctionArn,
        createUserFunctionArn: functionStack.createUserFunctionArn,
        disableUsersByTenantFunctionArn:
          functionStack.disableUsersByTenantFunctionArn,
        enableUsersByTenantFunctionArn:
          functionStack.enableUsersByTenantFunctionArn,
        authorizerFunctionArn:
          functionStack.sharedServicesAuthorizerFunctionArn,
        apiId: apiStack.restApiId,
      });

    const cfnCustomResourceStack = new SaaSProviderCustomResourceStack(
      this,
      "CfnCustomResourceStack",
      {
        tags: {
          environment: stageName,
        },
        serverlessSaaSSettingsTableArn:
          dataStack.serverlessSaaSSettingsTableArn,
        serverlessSaaSSettingsTableName:
          dataStack.serverlessSaaSSettingsTableName,
        tenantStackMappingTableArn: dataStack.tenantStackMappingTableArn,
        tenantStackMapTableName: dataStack.tenantStackMappingTableName,
        updateSettingsTableFunctionArn:
          functionStack.updateSettingsTableFunctionArn,
        updateTenantStackMapTableFunctionArn:
          functionStack.updateTenantStackMapTableFunctionArn,
        cognitoUserPoolId: authStack.cognitoUserPoolId,
        cognitoUserPoolClientId: authStack.cognitoUserPoolClientId,
      }
    );
    apiStack.addDependency(functionStack);
    saaSProviderAPILambdaPermissionStack.addDependency(functionStack);
    cfnCustomResourceStack.addDependency(saaSProviderAPILambdaPermissionStack);

    createCfnOutputIfNotExists(this, {
      id: "adminAppBucketName",
      props: {
        description:
          "The name of the S3 Bucket for uploading the Admin Management site to",
        value: webHostingStack.adminAppBucketName,
        exportName: "adminAppBucketName",
      },
    });
    createCfnOutputIfNotExists(this, {
      id: "tenantAppBucketName",
      props: {
        description:
          "The name of the S3 Bucket for uploading the Tenant App(Main App) site to",
        value: webHostingStack.tenantAppBucketName,
        exportName: "tenantAppBucketName",
      },
    });

    createCfnOutputIfNotExists(this, {
      id: "onBoardingAppBucketName",
      props: {
        description:
          "The name of the S3 Bucket for uploading the OnBoarding site to",
        value: webHostingStack.onBoardingAppBucketName,
        exportName: "onBoardingAppBucketName",
      },
    });

    createCfnOutputIfNotExists(this, {
      id: "restApiId",
      props: {
        value: apiStack.restApiId,
        exportName: "restApiId",
      },
    });
    createCfnOutputIfNotExists(this, {
      id: "restApiIdStageName",
      props: {
        value: apiStack.restApiIdStageName,
        exportName: "restApiIdStageName",
      },
    });

    createCfnOutputIfNotExists(this, {
      id: "cognitoOperationUsersUserPoolId",
      props: {
        value: authStack.cognitoOperationUsersUserPoolId,
        exportName: "cognitoOperationUsersUserPoolId",
      },
    });
    createCfnOutputIfNotExists(this, {
      id: "cognitoOperationUsersUserPoolClientId",
      props: {
        value: authStack.cognitoOperationUsersUserPoolClientId,
        exportName: "cognitoOperationUsersUserPoolClientId",
      },
    });
    createCfnOutputIfNotExists(this, {
      id: "stackRegion",
      props: {
        value: authStack.region,
        exportName: "stackRegion",
      },
    });
    createCfnOutputIfNotExists(this, {
      id: "adminCFDistributionId",
      props: {
        value: webHostingStack.adminDistributionId,
        exportName: "adminCFDistributionId",
      },
    });
    createCfnOutputIfNotExists(this, {
      id: "tenantAppCFDistributionId",
      props: {
        value: webHostingStack.tenantAppDistributionId,
        exportName: "tenantAppCFDistributionId",
      },
    });
    createCfnOutputIfNotExists(this, {
      id: "onBoardingAppCFDistributionId",
      props: {
        value: webHostingStack.onBoardingAppDistributionId,
        exportName: "onBoardingAppCFDistributionId",
      },
    });
  }
}
