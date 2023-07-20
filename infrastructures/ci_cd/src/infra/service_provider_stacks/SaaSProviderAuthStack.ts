import {
  CfnUserPool,
  CfnUserPoolClient,
  CfnUserPoolDomain,
  CfnUserPoolGroup,
  CfnUserPoolUser,
  CfnUserPoolUserToGroupAttachment,
} from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";
import { AuthStackProps } from "shared/prop_extensions.types";
import * as cdk from "aws-cdk-lib";
import { Trail } from "aws-cdk-lib/aws-cloudtrail";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { genDateSuffix } from "../utils/Utils";

export class SaaSProviderAuthStack extends cdk.NestedStack {
  public readonly cognitoUserPoolId: string;
  public readonly cognitoUserPoolClientId: string;
  public readonly cognitoOperationUsersUserPoolId: string;
  public readonly cognitoOperationUsersUserPoolClientId: string;
  public readonly cognitoOperationUsersUserPoolProviderURL: string;
  public readonly stackRegion: string;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);

    const {
      adminEmail,
      systemAdminRoleName,
      apiKeyOperationUsers,
      adminUserPoolCallbackURL,
      tenantUserPoolCallbackURL,
      tags,
    } = props;
    new Trail(this, "MultitenantCloudTrail", {
      sendToCloudWatchLogs: true,
      cloudWatchLogsRetention: RetentionDays.ONE_DAY,
    });
    const userPoolId = `${tags.environment}PooledTenantUserPool`;
    const userPoolName = `${userPoolId}`;

    const cfnUserPoolClientName = `${userPoolId}Client`;
    const cfnUserPoolClientId = `${cfnUserPoolClientName}Id`;
    const cfnUserPoolDomaintId = `${userPoolId}Domain`;
    const cfnUserPoolDomain = `${cfnUserPoolDomaintId.toLocaleLowerCase()}`;

    const cognitoUserPool = new CfnUserPool(this, userPoolId, {
      userPoolName: userPoolName,
      autoVerifiedAttributes: ["email"],
      accountRecoverySetting: {
        recoveryMechanisms: [
          {
            name: "verified_email",
            priority: 1,
          },
        ],
      },
      adminCreateUserConfig: {
        inviteMessageTemplate: {
          emailMessage: cdk.Fn.join("", [
            "Login into tenant UI application at ",
            "https://",
            tenantUserPoolCallbackURL,
            "/",
            " with username {username} and temporary password {####}",
          ]),
          emailSubject: "Your temporary password for tenant UI application",
        },
      },
      schema: [
        {
          attributeDataType: "String",
          name: "email",
          required: true,
          mutable: true,
        },
        {
          attributeDataType: "String",
          name: "tenantId",
        },
        {
          attributeDataType: "String",
          name: "userRole",
          required: false,
          mutable: true,
        },
      ],
    });

    const cognitoUserPoolClient = new CfnUserPoolClient(
      this,
      cfnUserPoolClientId,
      {
        clientName: cfnUserPoolClientName,
        generateSecret: false,
        userPoolId: cognitoUserPool.ref,
        allowedOAuthFlowsUserPoolClient: true,
        allowedOAuthFlows: ["code", "implicit"],
        supportedIdentityProviders: ["COGNITO"],
        callbackUrLs: [
          cdk.Fn.join("", ["https://", tenantUserPoolCallbackURL, "/"]),
        ],
        logoutUrLs: [
          cdk.Fn.join("", ["https://", tenantUserPoolCallbackURL, "/"]),
        ],
        allowedOAuthScopes: ["email", "openid", "profile"],
        writeAttributes: ["email", "custom:tenantId", "custom:userRole"],
      }
    );
    new CfnUserPoolDomain(this, cfnUserPoolDomaintId, {
      domain: cdk.Fn.join("-", [cfnUserPoolDomain, cdk.Aws.ACCOUNT_ID]),
      userPoolId: cognitoUserPool.ref,
    });

    const cognitoOperationUsersUserPool = new CfnUserPool(
      this,
      "CognitoOperationUsersUserPool",
      {
        autoVerifiedAttributes: ["email"],
        accountRecoverySetting: {
          recoveryMechanisms: [
            {
              name: "verified_email",
              priority: 1,
            },
          ],
        },
        adminCreateUserConfig: {
          inviteMessageTemplate: {
            emailMessage: cdk.Fn.join("", [
              "Login into admin UI application at ",
              "https://",
              adminUserPoolCallbackURL,
              "/",
              " with username {username} and temporary password {####}",
            ]),
            emailSubject: "Your temporary password for admin UI application",
          },
        },
        schema: [
          {
            attributeDataType: "String",
            name: "email",
            required: true,
            mutable: true,
          },
          {
            attributeDataType: "String",
            name: "tenantId",
          },
          {
            attributeDataType: "String",
            name: "userRole",
            required: false,
            mutable: true,
          },
          {
            attributeDataType: "String",
            name: "apiKey",
            required: false,
            mutable: true,
          },
        ],
      }
    );

    const cognitoOperationUsersUserPoolClient = new CfnUserPoolClient(
      this,
      "CognitoOperationUsersUserPoolClient",
      {
        clientName: "ServerlessSaaSOperationUsersPoolClient",
        generateSecret: false,
        userPoolId: cognitoOperationUsersUserPool.ref,
        allowedOAuthFlowsUserPoolClient: true,
        allowedOAuthFlows: ["code", "implicit"],
        supportedIdentityProviders: ["COGNITO"],
        callbackUrLs: [
          cdk.Fn.join("", ["https://", adminUserPoolCallbackURL, "/"]),
        ],
        logoutUrLs: [
          cdk.Fn.join("", ["https://", adminUserPoolCallbackURL, "/"]),
        ],
        allowedOAuthScopes: ["email", "openid", "profile"],
        writeAttributes: [
          "email",
          "custom:tenantId",
          "custom:userRole",
          "custom:apiKey",
        ],
      }
    );
    new CfnUserPoolDomain(this, "CognitoOperationUsersUserPoolDomain", {
      domain: cdk.Fn.join("-", [
        "operationsusers-serverlesssaas",
        cdk.Aws.ACCOUNT_ID,
      ]),
      userPoolId: cognitoOperationUsersUserPool.ref,
    });

    const cognitoAdminUserGroup = new CfnUserPoolGroup(
      this,
      "CognitoAdminUserGroup",
      {
        groupName: "SystemAdmins",
        description: "Admin user group",
        precedence: 0,
        userPoolId: cognitoOperationUsersUserPool.ref,
      }
    );

    const cognitoAdminUser = new CfnUserPoolUser(this, "CognitoAdminUser", {
      username: `admin${genDateSuffix()}`,
      desiredDeliveryMediums: ["EMAIL"],
      forceAliasCreation: true,
      userAttributes: [
        {
          name: "email",
          value: adminEmail,
        },
        {
          name: "custom:tenantId",
          value: "system_admins",
        },
        {
          name: "custom:apiKey",
          value: apiKeyOperationUsers,
        },
        {
          name: "custom:userRole",
          value: systemAdminRoleName,
        },
      ],
      userPoolId: cognitoOperationUsersUserPool.ref,
    });

    new CfnUserPoolUserToGroupAttachment(this, "CognitoAddUserToGroup", {
      groupName: cognitoAdminUserGroup.ref,
      username: cognitoAdminUser.ref,
      userPoolId: cognitoOperationUsersUserPool.ref,
    });
    this.cognitoUserPoolId = cognitoUserPool.ref;
    this.cognitoUserPoolClientId = cognitoUserPoolClient.ref;
    this.cognitoOperationUsersUserPoolId = cognitoOperationUsersUserPool.ref;
    this.cognitoOperationUsersUserPoolClientId =
      cognitoOperationUsersUserPoolClient.ref;
    this.cognitoOperationUsersUserPoolProviderURL =
      cognitoOperationUsersUserPool.ref;
    this.stackRegion = this.region;
    // this.cognitoUserPoolId = createstringIfNotExists(this, {
    //   id: "cognitoUserPoolId",
    //   props: {
    //     value: cognitoUserPool.ref,
    //     exportName: "cognitoUserPoolId",
    //   },
    // });

    // this.cognitoUserPoolClientId = createstringIfNotExists(this, {
    //   id: "cognitoUserPoolClientId",
    //   props: {
    //     value: cognitoUserPoolClient.ref,
    //     exportName: "cognitoUserPoolClientId",
    //   },
    // });

    // this.cognitoOperationUsersUserPoolId = createstringIfNotExists(this, {
    //   id: "cognitoOperationUsersUserPoolId",
    //   props: {
    //     value: cognitoOperationUsersUserPool.ref,
    //     exportName: "cognitoOperationUsersUserPoolId",
    //   },
    // });

    // this.cognitoOperationUsersUserPoolClientId = createstringIfNotExists(this, {
    //   id: "cognitoOperationUsersUserPoolClientId",
    //   props: {
    //     value: cognitoOperationUsersUserPoolClient.ref,
    //     exportName: "cognitoOperationUsersUserPoolClientId",
    //   },
    // });

    // this.cognitoOperationUsersUserPoolProviderURL = createstringIfNotExists(
    //   this,
    //   {
    //     id: "cognitoOperationUsersUserPoolProviderURL",
    //     props: {
    //       value: cognitoOperationUsersUserPool.ref,
    //       exportName: "cognitoOperationUsersUserPoolProviderURL",
    //     },
    //   }
    // );

    // this.stackRegion = createstringIfNotExists(this, {
    //   id: "stackRegion",
    //   props: {
    //     value: this.region,
    //     exportName: "stackRegion",
    //   },
    // });
  }
}
