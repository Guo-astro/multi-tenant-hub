import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { SaaSProviderAPILambdaPermissionStack } from "@/infra/service_provider_stacks/SaaSProviderAPILambdaPermissionStack";
import { SystemProviderAPIStack } from "@/infra/service_provider_stacks/SaaSProviderAPIStack";
import { SaaSProviderWebHostingStack } from "@/infra/service_provider_stacks/SaaSProviderAdminUIHostingStack";
import { SaaSProviderAuthStack } from "@/infra/service_provider_stacks/SaaSProviderAuthStack";
import { SaaSProviderDataStack } from "@/infra/service_provider_stacks/SaaSProviderDataStack";
import { SaaSProviderLambdaStack } from "@/infra/service_provider_stacks/SaaSProviderLambdaStack";
import {
  createCfnOutputIfNotExists,
  generateCfnExportName,
  generateLogicalId,
} from "../utils/Utils";
import { DeploymentStackProps } from "@/shared/prop_extensions.types";
import { SaaSProviderCustomResourceStack } from "./SaaSProviderCustomResourceStack";
import {
  SystemProviderCfnOutputs,
  SystemProviderInfraStackNameDict,
  TenantProvisioningPipelineNameDict,
  TenantSystemNameDict,
} from "../../shared/Constants";

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
    const tenantId = "system";
    const webHostingStack = new SaaSProviderWebHostingStack(
      this,
      generateLogicalId(
        SystemProviderInfraStackNameDict.webHostingStack,
        tenantId
      ),
      {
        tags: {
          environment: stageName,
        },
        tenantId,
      }
    );

    const dataStack = new SaaSProviderDataStack(
      this,
      generateLogicalId(SystemProviderInfraStackNameDict.dataStack, tenantId),

      {
        tags: {
          environment: stageName,
        },
      }
    );

    createCfnOutputIfNotExists(this, {
      id: generateLogicalId(
        SystemProviderCfnOutputs.serverlessSaaSSettingsTableArn,
        tenantId
      ),

      props: {
        value: dataStack.serverlessSaaSSettingsTableArn,
        exportName: generateCfnExportName(
          SystemProviderCfnOutputs.serverlessSaaSSettingsTableArn
        ),
      },
    });

    createCfnOutputIfNotExists(this, {
      id: generateLogicalId(
        SystemProviderCfnOutputs.serverlessSaaSSettingsTableName,
        tenantId
      ),
      props: {
        value: dataStack.serverlessSaaSSettingsTableName,
        exportName: generateCfnExportName(
          SystemProviderCfnOutputs.serverlessSaaSSettingsTableName
        ),
      },
    });

    createCfnOutputIfNotExists(this, {
      id: generateLogicalId(
        SystemProviderCfnOutputs.tenantStackMappingTableArn,
        tenantId
      ),
      props: {
        value: dataStack.tenantStackMappingTableArn,
        exportName: generateCfnExportName(
          SystemProviderCfnOutputs.tenantStackMappingTableArn
        ),
      },
    });

    createCfnOutputIfNotExists(this, {
      id: generateLogicalId(
        SystemProviderCfnOutputs.tenantStackMappingTableName,
        tenantId
      ),
      props: {
        value: dataStack.tenantStackMappingTableName,
        exportName: generateCfnExportName(
          SystemProviderCfnOutputs.tenantStackMappingTableName
        ),
      },
    });

    createCfnOutputIfNotExists(this, {
      id: generateLogicalId(
        SystemProviderCfnOutputs.tenantDetailsTableArn,
        tenantId
      ),

      props: {
        value: dataStack.tenantDetailsTableArn,
        exportName: generateCfnExportName(
          SystemProviderCfnOutputs.tenantDetailsTableArn
        ),
      },
    });

    createCfnOutputIfNotExists(this, {
      id: generateLogicalId(
        SystemProviderCfnOutputs.tenantDetailsTableName,
        tenantId
      ),
      props: {
        value: dataStack.tenantDetailsTableName,
        exportName: generateCfnExportName(
          SystemProviderCfnOutputs.tenantDetailsTableName
        ),
      },
    });

    createCfnOutputIfNotExists(this, {
      id: generateLogicalId(
        SystemProviderCfnOutputs.tenantUserMappingTableArn,
        tenantId
      ),
      props: {
        value: dataStack.tenantUserMappingTableArn,
        exportName: generateCfnExportName(
          SystemProviderCfnOutputs.tenantUserMappingTableArn
        ),
      },
    });

    createCfnOutputIfNotExists(this, {
      id: generateLogicalId(
        SystemProviderCfnOutputs.tenantUserMappingTableName,
        tenantId
      ),
      props: {
        value: dataStack.tenantUserMappingTableName,
        exportName: generateCfnExportName(
          SystemProviderCfnOutputs.tenantUserMappingTableName
        ),
      },
    });
    const authStack = new SaaSProviderAuthStack(
      this,
      generateLogicalId(SystemProviderInfraStackNameDict.authStack, tenantId),
      {
        tags: {
          environment: stageName,
        },

        adminEmail: adminEmailParameter,
        systemAdminRoleName: systemAdminRoleNameParameter,
        apiKeyOperationUsers: apiKeyOperationUsersParameter,
        adminUserPoolCallbackURL: webHostingStack.adminAppSiteUrlName,
        tenantUserPoolCallbackURL: webHostingStack.tenantAppSiteUrlName,
        tenantId,
      }
    );
    const functionStack = new SaaSProviderLambdaStack(
      this,
      generateLogicalId(
        SystemProviderInfraStackNameDict.functionStack,
        tenantId
      ),

      {
        tags: {
          environment: stageName,
        },
        lambdaImageTag: this.node.tryGetContext(
          SystemProviderInfraStackNameDict.lambdaImageTag
        ) as string,
        tenantProvisioningPipelineName: this.node.tryGetContext(
          TenantProvisioningPipelineNameDict.tenantProvisiongPipelineName
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
        tenantId,
      }
    );
    createCfnOutputIfNotExists(this, {
      id: generateLogicalId(
        SystemProviderCfnOutputs.tenantManagementAuthorizerFunctionCfnOutput,
        tenantId
      ),
      props: {
        description: "Function Arn to be used cross stack",
        value: functionStack.tenantManagementAuthorizerFunctionArn,
        exportName: generateCfnExportName(
          SystemProviderCfnOutputs.tenantManagementAuthorizerFunctionCfnOutput
        ),
      },
    });
    createCfnOutputIfNotExists(this, {
      id: generateLogicalId(
        SystemProviderCfnOutputs.tenantAppsAuthorizerFunctionCfnOutput,
        tenantId
      ),
      props: {
        description: "Function Arn to be used cross stack",
        value: functionStack.tenantAppsAuthorizerFunctionArn,
        exportName: generateCfnExportName(
          SystemProviderCfnOutputs.tenantAppsAuthorizerFunctionCfnOutput
        ),
      },
    });
    const apiStack = new SystemProviderAPIStack(
      this,
      generateLogicalId(SystemProviderInfraStackNameDict.apigwStack, tenantId),
      {
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
        tenantManagementAuthorizerFunctionArn:
          functionStack.tenantManagementAuthorizerFunctionArn,
        apiKeyOperationUsersParameter,
        apiKeyPlatinumTierParameter,
        apiKeyPremiumTierParameter,
        apiKeyStandardTierParameter,
        apiKeyBasicTierParameter,
        tenantId,
      }
    );
    createCfnOutputIfNotExists(this, {
      id: generateLogicalId(
        SystemProviderCfnOutputs.usagePlanBasicTierId,
        tenantId
      ),

      props: {
        value: apiStack.usagePlanBasicTier,
        exportName: generateCfnExportName(
          SystemProviderCfnOutputs.usagePlanBasicTierId
        ),
      },
    });
    createCfnOutputIfNotExists(this, {
      id: generateLogicalId(
        SystemProviderCfnOutputs.usagePlanStandardTierId,
        tenantId
      ),

      props: {
        value: apiStack.usagePlanStandardTier,
        exportName: generateCfnExportName(
          SystemProviderCfnOutputs.usagePlanStandardTierId
        ),
      },
    });
    createCfnOutputIfNotExists(this, {
      id: generateLogicalId(
        SystemProviderCfnOutputs.usagePlanPremiumTierId,
        tenantId
      ),

      props: {
        value: apiStack.usagePlanPremiumTier,
        exportName: generateCfnExportName(
          SystemProviderCfnOutputs.usagePlanPremiumTierId
        ),
      },
    });

    createCfnOutputIfNotExists(this, {
      id: generateLogicalId(
        SystemProviderCfnOutputs.usagePlanPlatinumTierId,
        tenantId
      ),

      props: {
        value: apiStack.usagePlanPlatinumTier,
        exportName: generateCfnExportName(
          SystemProviderCfnOutputs.usagePlanPlatinumTierId
        ),
      },
    });
    const saaSProviderAPILambdaPermissionStack =
      new SaaSProviderAPILambdaPermissionStack(
        this,
        generateLogicalId(
          SystemProviderInfraStackNameDict.apigwPermissonStack,
          tenantId
        ),
        {
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
          deactivateTenantFunctionArn:
            functionStack.deactivateTenantFunctionArn,
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
            functionStack.tenantManagementAuthorizerFunctionArn,
          apiId: apiStack.restApiId,
          tenantId,
        }
      );

    const cfnCustomResourceStack = new SaaSProviderCustomResourceStack(
      this,
      generateLogicalId(
        SystemProviderInfraStackNameDict.customResource,
        tenantId
      ),
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
        tenantId,
      }
    );
    apiStack.addDependency(functionStack);
    saaSProviderAPILambdaPermissionStack.addDependency(functionStack);
    cfnCustomResourceStack.addDependency(saaSProviderAPILambdaPermissionStack);

    createCfnOutputIfNotExists(this, {
      id: generateLogicalId(
        SystemProviderCfnOutputs.adminAppBucketName,
        tenantId
      ),
      props: {
        description:
          "The name of the S3 Bucket for uploading the Admin Management site to",
        value: webHostingStack.adminAppBucketName,
        exportName: generateCfnExportName(
          SystemProviderCfnOutputs.adminAppBucketName
        ),
      },
    });
    createCfnOutputIfNotExists(this, {
      id: generateLogicalId(
        SystemProviderCfnOutputs.tenantAppBucketName,
        tenantId
      ),
      props: {
        description:
          "The name of the S3 Bucket for uploading the Tenant App(Main App) site to",
        value: webHostingStack.tenantAppBucketName,
        exportName: generateCfnExportName(
          SystemProviderCfnOutputs.tenantAppBucketName
        ),
      },
    });

    createCfnOutputIfNotExists(this, {
      id: generateLogicalId(
        SystemProviderCfnOutputs.onBoardingAppBucketName,
        tenantId
      ),
      props: {
        description:
          "The name of the S3 Bucket for uploading the OnBoarding site to",
        value: webHostingStack.onBoardingAppBucketName,
        exportName: generateCfnExportName(
          SystemProviderCfnOutputs.onBoardingAppBucketName
        ),
      },
    });

    createCfnOutputIfNotExists(this, {
      id: generateLogicalId(SystemProviderCfnOutputs.restApiId, tenantId),
      props: {
        value: apiStack.restApiId,
        exportName: generateCfnExportName(SystemProviderCfnOutputs.restApiId),
      },
    });
    createCfnOutputIfNotExists(this, {
      id: generateLogicalId(
        SystemProviderCfnOutputs.restApiIdStageName,
        tenantId
      ),
      props: {
        value: apiStack.restApiIdStageName,
        exportName: generateCfnExportName(
          SystemProviderCfnOutputs.restApiIdStageName
        ),
      },
    });

    createCfnOutputIfNotExists(this, {
      id: generateLogicalId(
        SystemProviderCfnOutputs.cognitoOperationUsersUserPoolId,
        tenantId
      ),
      props: {
        value: authStack.cognitoOperationUsersUserPoolId,
        exportName: generateCfnExportName(
          SystemProviderCfnOutputs.cognitoOperationUsersUserPoolId
        ),
      },
    });
    createCfnOutputIfNotExists(this, {
      id: generateLogicalId(
        SystemProviderCfnOutputs.cognitoOperationUsersUserPoolClientId,
        tenantId
      ),
      props: {
        value: authStack.cognitoOperationUsersUserPoolClientId,
        exportName: generateCfnExportName(
          SystemProviderCfnOutputs.cognitoOperationUsersUserPoolClientId
        ),
      },
    });
    createCfnOutputIfNotExists(this, {
      id: generateLogicalId(SystemProviderCfnOutputs.stackRegion, tenantId),
      props: {
        value: authStack.region,
        exportName: generateCfnExportName(SystemProviderCfnOutputs.stackRegion),
      },
    });
    createCfnOutputIfNotExists(this, {
      id: generateLogicalId(
        SystemProviderCfnOutputs.adminCFDistributionId,
        tenantId
      ),
      props: {
        value: webHostingStack.adminDistributionId,
        exportName: generateCfnExportName(
          SystemProviderCfnOutputs.adminCFDistributionId
        ),
      },
    });
    createCfnOutputIfNotExists(this, {
      id: generateLogicalId(
        SystemProviderCfnOutputs.tenantAppCFDistributionId,
        tenantId
      ),
      props: {
        value: webHostingStack.tenantAppDistributionId,
        exportName: generateCfnExportName(
          SystemProviderCfnOutputs.tenantAppCFDistributionId
        ),
      },
    });
    createCfnOutputIfNotExists(this, {
      id: generateLogicalId(
        SystemProviderCfnOutputs.onBoardingAppCFDistributionId,
        tenantId
      ),
      props: {
        value: webHostingStack.onBoardingAppDistributionId,
        exportName: generateCfnExportName(
          SystemProviderCfnOutputs.onBoardingAppCFDistributionId
        ),
      },
    });
  }
}
