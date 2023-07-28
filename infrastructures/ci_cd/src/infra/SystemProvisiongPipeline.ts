import * as cdk from "aws-cdk-lib";
import { SecretValue } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as codepipeline_actions from "aws-cdk-lib/aws-codepipeline-actions";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as codepipeline from "aws-cdk-lib/aws-codepipeline";
import { SystemProvisiongPipelineProps } from "@/shared/prop_extensions.types";
import {
  SystemProviderCfnOutputs,
  SystemProviderInfraStackNameDict,
  SystemProviderProvisioningPipelineNameDict,
  TenantProvisioningPipelineNameDict,
  TenantSystemNameDict,
} from "@/shared/Constants";
import { generateLogicalId, generatePhysicalName } from "./utils/Utils";
import { createPipelineUpdateAction } from "./utils/pipelineHelper";

export class SystemProvisiongPipeline extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: SystemProvisiongPipelineProps
  ) {
    super(scope, id, props);
    const stage = props.tags.environment;
    const lambdaECR = props.lambdaECR;
    const lambdaLayerECR = props.lambdaLayerECR;
    const githubPATName = "dev/multi-tenant-saas";
    const githubAccessToken = SecretValue.secretsManager(githubPATName);
    const owner = "Guo-astro";
    const repo = "multi-tenant-hub";
    const branch = "main";
    const tenantId = "system";
    const sourceOutput = new codepipeline.Artifact();
    const lambdaLayerBuildOutput = new codepipeline.Artifact();
    const lambdaBuildOutput = new codepipeline.Artifact();

    const sourceAction = new codepipeline_actions.GitHubSourceAction({
      actionName: "GitHub_Source",
      owner,
      repo,
      branch,
      oauthToken: githubAccessToken,
      output: sourceOutput,
    });
    const cdkBuildOutput = new codepipeline.Artifact("pipeline-cdk-build");
    const pipeline_update_action = createPipelineUpdateAction(
      this,
      sourceOutput,
      SystemProviderInfraStackNameDict.systemProviderInfraStack,
      cdkBuildOutput
    );

    //////////////////Build python lambda layer////////////////////
    const buildspec_lambda_layer_docker_path =
      "infrastructures/ci_cd/src/infra/service_provider_stacks/buildspec_lambda_layer_docker.yml";

    const lambdaLayerBuildProject = new codebuild.PipelineProject(
      this,
      "lambdaLayerBuildProject",
      {
        environmentVariables: {
          IMAGE_TAG: { value: "latest" },
          IMAGE_REPO_URI: { value: lambdaLayerECR.repositoryUri },
          AWS_DEFAULT_REGION: { value: cdk.Aws.REGION },
        },
        environment: {
          buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_4,
          privileged: true,
          computeType: codebuild.ComputeType.SMALL,
        },
        buildSpec: codebuild.BuildSpec.fromSourceFilename(
          buildspec_lambda_layer_docker_path
        ),
      }
    );
    const lambdaLayerBuildRolePolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: ["*"],
      actions: [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:GetRepositoryPolicy",
        "ecr:DescribeRepositories",
        "ecr:ListImages",
        "ecr:DescribeImages",
        "ecr:BatchGetImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:PutImage",
      ],
    });
    lambdaLayerBuildProject.addToRolePolicy(lambdaLayerBuildRolePolicy);
    const lambdaLayerBuildAction = new codepipeline_actions.CodeBuildAction({
      actionName: "lamda-layer-build",
      project: lambdaLayerBuildProject,
      input: sourceOutput,
      outputs: [lambdaLayerBuildOutput],
    });

    //////////////////Build python lambda layer////////////////////
    //////////////////Build python lambda////////////////////

    const lambdaBuildProjectAssumedRole = new iam.Role(
      this,
      "lambdaBuildProjectAssumedRole",
      {
        assumedBy: new iam.ServicePrincipal("codebuild.amazonaws.com"),
      }
    );
    const lambdaBuildDockerAssumedRole = new iam.Role(
      this,
      "lambdaBuildDockerAssumedRole",
      {
        assumedBy: new iam.ArnPrincipal(lambdaBuildProjectAssumedRole.roleArn),
      }
    );
    lambdaBuildDockerAssumedRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["lambda:GetLayerVersionByArn", "lambda:GetLayerVersion"],
        resources: ["*"],
      })
    );

    lambdaBuildProjectAssumedRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:GetRepositoryPolicy",
          "ecr:DescribeRepositories",
          "ecr:ListImages",
          "ecr:DescribeImages",
          "ecr:BatchGetImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage",
        ],
        resources: ["*"],
      })
    );
    const buildspec_lambda_docker_path =
      "infrastructures/ci_cd/src/infra/service_provider_stacks/buildspec_lambda_docker.yml";
    const lambdaBuildProject = new codebuild.PipelineProject(
      this,
      "lambdaBuildProject",
      {
        environmentVariables: {
          IMAGE_TAG: { value: "latest" },
          PYLAYER_IMAGE_TAG: { value: "latest" },
          IMAGE_REPO_URI: { value: lambdaECR.repositoryUri },
          AWS_DEFAULT_REGION: { value: cdk.Aws.REGION },
          PYLAYER_IMAGE_URI: { value: lambdaLayerECR.repositoryUri },
          PUBLIC_LAYER_FETCH_ROLE_ARN: {
            value: lambdaBuildDockerAssumedRole.roleArn,
          },
        },

        environment: {
          buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_4,
          privileged: true,
          computeType: codebuild.ComputeType.MEDIUM,
        },
        buildSpec: codebuild.BuildSpec.fromSourceFilename(
          buildspec_lambda_docker_path
        ),
        role: lambdaBuildProjectAssumedRole,
      }
    );
    const lambdaBuildAction = new codepipeline_actions.CodeBuildAction({
      actionName: "lambda-build",
      project: lambdaBuildProject,
      input: sourceOutput,
      outputs: [lambdaBuildOutput],
    });
    /////////// Build python lambda ///////////

    /////////// Deployment ///////////
    const buildspec = {
      version: "0.2",
      env: {
        variables: {
          VOLTA_HOME: "/root/.volta",
        },
        "exported-variables": [
          `${SystemProviderCfnOutputs.tenantAppBucketName}`,
          `${SystemProviderCfnOutputs.onBoardingAppCFDistributionId}`,
          `${SystemProviderCfnOutputs.tenantAppCFDistributionId}`,
          `${SystemProviderCfnOutputs.adminCFDistributionId}`,
          `${SystemProviderCfnOutputs.restApiId}`,
          `${SystemProviderCfnOutputs.stackRegion}`,
          `${SystemProviderCfnOutputs.restApiIdStageName}`,
          `${SystemProviderCfnOutputs.cognitoOperationUsersUserPoolId}`,
          `${SystemProviderCfnOutputs.cognitoOperationUsersUserPoolClientId}`,
          `${SystemProviderCfnOutputs.onBoardingAppBucketName}`,
          `${SystemProviderCfnOutputs.adminAppBucketName}`,
          `${SystemProviderCfnOutputs.serverlessSaaSSettingsTableArn}`,
          `${SystemProviderCfnOutputs.serverlessSaaSSettingsTableName}`,
          `${SystemProviderCfnOutputs.tenantStackMappingTableArn}`,
          `${SystemProviderCfnOutputs.tenantStackMappingTableName}`,
          `${SystemProviderCfnOutputs.tenantDetailsTableArn}`,
          `${SystemProviderCfnOutputs.tenantDetailsTableName}`,
          `${SystemProviderCfnOutputs.tenantUserMappingTableArn}`,
          `${SystemProviderCfnOutputs.tenantUserMappingTableName}`,
        ],
      },
      phases: {
        pre_build: {
          commands: [
            "COMMIT_HASH=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c 1-7)",
            "IMAGE_TAG=${COMMIT_HASH:=latest}",
          ],
        },
        build: {
          commands: [
            "curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -",
            "apt-get update && apt-get install -y jq",
            "curl https://get.volta.sh | bash",
            'export PATH="$VOLTA_HOME/bin:$PATH"',
            `volta install node@16.16.0`,
            `volta pin node@16.16.0`,
            `which npm`,
            `npm install -g pnpm`,
            `ls -al ..`,
            `ls -al`,
            `ls -al /root`,
            `ls -al /root/.volta`,
            `ls -al /root/.volta/bin`,
            `echo $PATH`,
            `export PATH="$NPM_BIN:$PATH"`,
            `echo $PATH`,
            `cd ./infrastructures/ci_cd`,
            `pnpm i`,
            `pnpx cdk deploy ${SystemProviderInfraStackNameDict.systemProviderInfraStack} --method=direct --require-approval never --outputs-file outputs.json -c ${SystemProviderInfraStackNameDict.lambdaImageTag}=$IMAGE_TAG -c ${TenantProvisioningPipelineNameDict.tenantProvisiongPipelineName}=$${TenantProvisioningPipelineNameDict.tenantProvisiongPipelineName}`,
            `ls -al`,
            `jq '.' outputs.json`,
            `export ${
              SystemProviderCfnOutputs.onBoardingAppBucketName
            }=$(jq -r '.${
              SystemProviderInfraStackNameDict.systemProviderInfraStack
            }.${generateLogicalId(
              SystemProviderCfnOutputs.onBoardingAppBucketName,
              tenantId
            )} // empty' ./outputs.json)`,
            `export ${SystemProviderCfnOutputs.tenantAppBucketName}=$(jq -r '.${
              SystemProviderInfraStackNameDict.systemProviderInfraStack
            }.${generateLogicalId(
              SystemProviderCfnOutputs.tenantAppBucketName,
              tenantId
            )} // empty' ./outputs.json)`,
            `export ${SystemProviderCfnOutputs.adminAppBucketName}=$(jq -r '.${
              SystemProviderInfraStackNameDict.systemProviderInfraStack
            }.${generateLogicalId(
              SystemProviderCfnOutputs.adminAppBucketName,
              tenantId
            )} // empty' ./outputs.json)`,
            `export ${
              SystemProviderCfnOutputs.onBoardingAppCFDistributionId
            }=$(jq -r '.${
              SystemProviderInfraStackNameDict.systemProviderInfraStack
            }.${generateLogicalId(
              SystemProviderCfnOutputs.onBoardingAppCFDistributionId,
              tenantId
            )} // empty' ./outputs.json)`,
            `export ${
              SystemProviderCfnOutputs.adminCFDistributionId
            }=$(jq -r '.${
              SystemProviderInfraStackNameDict.systemProviderInfraStack
            }.${generateLogicalId(
              SystemProviderCfnOutputs.adminCFDistributionId,
              tenantId
            )} // empty' ./outputs.json)`,
            `export ${
              SystemProviderCfnOutputs.tenantAppCFDistributionId
            }=$(jq -r '.${
              SystemProviderInfraStackNameDict.systemProviderInfraStack
            }.${generateLogicalId(
              SystemProviderCfnOutputs.tenantAppCFDistributionId,
              tenantId
            )} // empty' ./outputs.json)`,
            `export ${SystemProviderCfnOutputs.restApiId}=$(jq -r '.${
              SystemProviderInfraStackNameDict.systemProviderInfraStack
            }.${generateLogicalId(
              SystemProviderCfnOutputs.restApiId,
              tenantId
            )} // empty' ./outputs.json)`,
            `export ${SystemProviderCfnOutputs.stackRegion}=$(jq -r '.${
              SystemProviderInfraStackNameDict.systemProviderInfraStack
            }.${generateLogicalId(
              SystemProviderCfnOutputs.stackRegion,
              tenantId
            )} // empty' ./outputs.json)`,
            `export ${SystemProviderCfnOutputs.restApiIdStageName}=$(jq -r '.${
              SystemProviderInfraStackNameDict.systemProviderInfraStack
            }.${generateLogicalId(
              SystemProviderCfnOutputs.restApiIdStageName,
              tenantId
            )} // empty' ./outputs.json)`,
            `export ${
              SystemProviderCfnOutputs.cognitoOperationUsersUserPoolId
            }=$(jq -r '.${
              SystemProviderInfraStackNameDict.systemProviderInfraStack
            }.${generateLogicalId(
              SystemProviderCfnOutputs.cognitoOperationUsersUserPoolId,
              tenantId
            )} // empty' ./outputs.json)`,
            `export ${
              SystemProviderCfnOutputs.cognitoOperationUsersUserPoolClientId
            }=$(jq -r '.${
              SystemProviderInfraStackNameDict.systemProviderInfraStack
            }.${generateLogicalId(
              SystemProviderCfnOutputs.cognitoOperationUsersUserPoolClientId,
              tenantId
            )} // empty' ./outputs.json)`,
            `export ${
              SystemProviderCfnOutputs.serverlessSaaSSettingsTableArn
            }=$(jq -r '.${
              SystemProviderInfraStackNameDict.systemProviderInfraStack
            }.${generateLogicalId(
              SystemProviderCfnOutputs.serverlessSaaSSettingsTableArn,
              tenantId
            )} // empty' ./outputs.json)`,
            `export ${
              SystemProviderCfnOutputs.serverlessSaaSSettingsTableName
            }=$(jq -r '.${
              SystemProviderInfraStackNameDict.systemProviderInfraStack
            }.${generateLogicalId(
              SystemProviderCfnOutputs.serverlessSaaSSettingsTableName,
              tenantId
            )} // empty' ./outputs.json)`,
            `export ${
              SystemProviderCfnOutputs.tenantStackMappingTableArn
            }=$(jq -r '.${
              SystemProviderInfraStackNameDict.systemProviderInfraStack
            }.${generateLogicalId(
              SystemProviderCfnOutputs.tenantStackMappingTableArn,
              tenantId
            )} // empty' ./outputs.json)`,
            `export ${
              SystemProviderCfnOutputs.tenantStackMappingTableName
            }=$(jq -r '.${
              SystemProviderInfraStackNameDict.systemProviderInfraStack
            }.${generateLogicalId(
              SystemProviderCfnOutputs.tenantStackMappingTableName,
              tenantId
            )} // empty' ./outputs.json)`,
            `export ${
              SystemProviderCfnOutputs.tenantDetailsTableArn
            }=$(jq -r '.${
              SystemProviderInfraStackNameDict.systemProviderInfraStack
            }.${generateLogicalId(
              SystemProviderCfnOutputs.tenantDetailsTableArn,
              tenantId
            )} // empty' ./outputs.json)`,
            `export ${
              SystemProviderCfnOutputs.tenantDetailsTableName
            }=$(jq -r '.${
              SystemProviderInfraStackNameDict.systemProviderInfraStack
            }.${generateLogicalId(
              SystemProviderCfnOutputs.tenantDetailsTableName,
              tenantId
            )} // empty' ./outputs.json)`,
            `export ${
              SystemProviderCfnOutputs.tenantUserMappingTableArn
            }=$(jq -r '.${
              SystemProviderInfraStackNameDict.systemProviderInfraStack
            }.${generateLogicalId(
              SystemProviderCfnOutputs.tenantUserMappingTableArn,
              tenantId
            )} // empty' ./outputs.json)`,
            `export ${
              SystemProviderCfnOutputs.tenantUserMappingTableName
            }=$(jq -r '.${
              SystemProviderInfraStackNameDict.systemProviderInfraStack
            }.${generateLogicalId(
              SystemProviderCfnOutputs.tenantUserMappingTableName,
              tenantId
            )} // empty' ./outputs.json)`,

            `echo $${SystemProviderCfnOutputs.adminAppBucketName}`,
            `echo $${SystemProviderCfnOutputs.restApiId}`,
            `echo $${SystemProviderCfnOutputs.stackRegion}`,
            `echo $${SystemProviderCfnOutputs.tenantAppBucketName}`,
            `echo $${SystemProviderCfnOutputs.onBoardingAppBucketName}`,
            `echo $${SystemProviderCfnOutputs.onBoardingAppCFDistributionId}`,
            `echo $${SystemProviderCfnOutputs.tenantAppCFDistributionId}`,
            `echo $${SystemProviderCfnOutputs.adminCFDistributionId}`,
            `echo $${SystemProviderCfnOutputs.restApiIdStageName}`,
            `echo $${SystemProviderCfnOutputs.cognitoOperationUsersUserPoolId}`,
            `echo $${SystemProviderCfnOutputs.cognitoOperationUsersUserPoolClientId}`,
            `echo $IMAGE_TAG`,
            `echo $COMMIT_HASH`,
            `echo $${SystemProviderCfnOutputs.serverlessSaaSSettingsTableArn}`,
            `echo $${SystemProviderCfnOutputs.serverlessSaaSSettingsTableName}`,
            `echo $${SystemProviderCfnOutputs.tenantStackMappingTableArn}`,
            `echo $${SystemProviderCfnOutputs.tenantStackMappingTableName}`,
            `echo $${SystemProviderCfnOutputs.tenantDetailsTableArn}`,
            `echo $${SystemProviderCfnOutputs.tenantDetailsTableName}`,
            `echo $${SystemProviderCfnOutputs.tenantUserMappingTableArn}`,
            `echo $${SystemProviderCfnOutputs.tenantUserMappingTableName}`,
            `pnpx cdk deploy ${TenantProvisioningPipelineNameDict.tenantProvisiongPipelineName} --method=direct --require-approval never --outputs-file  ${TenantProvisioningPipelineNameDict.tenantProvisiongPipelineName}.json`,
            `jq '.'  ${TenantProvisioningPipelineNameDict.tenantProvisiongPipelineName}.json`,
          ],
        },
      },
    };

    const infraDeploymentProject = new codebuild.PipelineProject(
      this,
      "DeployProject",
      {
        environmentVariables: {
          [TenantProvisioningPipelineNameDict.tenantProvisiongPipelineName]: {
            value: props.tenantProvisoningPipelineName,
          },
        },
        environment: {
          buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
          privileged: true,
          computeType: codebuild.ComputeType.MEDIUM,
        },
        buildSpec: codebuild.BuildSpec.fromObject(buildspec),
      }
    );

    const infraDeploymentAction = new codepipeline_actions.CodeBuildAction({
      actionName: "Deploy",
      project: infraDeploymentProject,
      input: sourceOutput,
      outputs: [new codepipeline.Artifact()], // optional
    });

    const infraDeploymentRolePolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: ["*"],
      actions: [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:GetRepositoryPolicy",
        "ecr:DescribeRepositories",
        "ecr:ListImages",
        "ecr:DescribeImages",
        "ecr:BatchGetImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:PutImage",
        "cloudformation:*",
        "ssm:GetParameter",
        "s3:*",
        "iam:*",
      ],
    });
    infraDeploymentProject.addToRolePolicy(infraDeploymentRolePolicy);
    /////////////////////////// Admin App Deployment ///////////////////////////
    const adminAppDeploymentProject = new codebuild.PipelineProject(
      this,
      "adminAppDeploymentProject",
      {
        buildSpec: codebuild.BuildSpec.fromObject({
          version: "0.2",
          phases: {
            install: {
              commands: [
                "curl https://get.volta.sh | bash",
                'export PATH="$HOME/.volta/bin:$PATH"',
                "volta install node@16.16.0",
                "volta pin node@16.16.0",
                "volta install pnpm --verbose",
              ],
            },
            build: {
              commands: [
                "cd ./apps/Admin",
                `echo "Configuring environment for Admin Client"`,
                `echo "export const environment = {\\n  production: true,\\n  apiUrl: '$ADMIN_APIGATEWAYURL',\\n};" >./src/environments/environment.prod.ts`,
                `cat ./src/environments/environment.prod.ts`,
                `echo  "export const environment = {\\n  production: false,\\n  apiUrl: '$ADMIN_APIGATEWAYURL',\\n};" >./src/environments/environment.ts`,
                `cat ./src/environments/environment.ts`,
                `echo "const awsmobile = {\\n    \\"aws_project_region\\": \\"$REGION\\",\\n    \\"aws_cognito_region\\": \\"$REGION\\",\\n    \\"aws_user_pools_id\\": \\"$ADMIN_USERPOOLID\\",\\n    \\"aws_user_pools_web_client_id\\": \\"$ADMIN_APPCLIENTID\\",\\n};export default awsmobile;" >./src/aws-exports.ts`,
                `cat ./src/aws-exports.ts`,
                "npm i",
                "npm run build",
                `echo "aws s3 sync --delete --cache-control no-store dist s3://$ADMIN_SITE_BUCKET"`,
                `aws s3 sync --delete --cache-control no-store dist "s3://$ADMIN_SITE_BUCKET"`,
                `aws cloudfront create-invalidation --distribution-id $ADMIN_DISTRIBUTION_ID --paths "/*"`,
              ],
            },
          },
        }),
      }
    );
    // TODO [>=1.0.0]: fix least permission at v1.
    const adminAppDeploymentProjectRolePolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: ["*"],
      actions: ["s3:*", "cloudfront:CreateInvalidation"],
    });
    adminAppDeploymentProject.addToRolePolicy(
      adminAppDeploymentProjectRolePolicy
    );
    const adminAppDeploymentAction = new codepipeline_actions.CodeBuildAction({
      environmentVariables: {
        ADMIN_SITE_BUCKET: {
          value: infraDeploymentAction.variable(
            SystemProviderCfnOutputs.adminAppBucketName
          ),
        },
        ADMIN_APIGATEWAYURL: {
          value: `https://${infraDeploymentAction.variable(
            SystemProviderCfnOutputs.restApiId
          )}.execute-api.${infraDeploymentAction.variable(
            SystemProviderCfnOutputs.stackRegion
          )}.amazonaws.com/${stage}`,
        },
        ADMIN_USERPOOLID: {
          value: infraDeploymentAction.variable(
            SystemProviderCfnOutputs.cognitoOperationUsersUserPoolId
          ),
        },
        ADMIN_APPCLIENTID: {
          value: infraDeploymentAction.variable(
            SystemProviderCfnOutputs.cognitoOperationUsersUserPoolClientId
          ),
        },
        REGION: {
          value: infraDeploymentAction.variable(
            SystemProviderCfnOutputs.stackRegion
          ),
        },
        ADMIN_DISTRIBUTION_ID: {
          value: infraDeploymentAction.variable(
            SystemProviderCfnOutputs.adminCFDistributionId
          ),
        },
      },
      actionName: "DeployAdminFrontEnd",
      project: adminAppDeploymentProject,
      input: sourceOutput,
    });

    ////////////////////////////////////////////////////////
    /////////////////TenantAppDeployment////////////////////
    const tenantAppDeploymentProject = new codebuild.PipelineProject(
      this,
      "tenantAppDeploymentProject",
      {
        buildSpec: codebuild.BuildSpec.fromObject({
          version: "0.2",
          phases: {
            install: {
              commands: [
                "curl https://get.volta.sh | bash",
                'export PATH="$HOME/.volta/bin:$PATH"',
                "volta install node@16.16.0",
                "volta pin node@16.16.0",
                "volta install pnpm --verbose",
              ],
            },
            build: {
              commands: [
                "cd ./apps/Application",
                `echo "Configuring environment for Tenant Application"`,
                `echo "export const environment = {\\n  production: true,\\n  regApiGatewayUrl: '$ADMIN_APIGATEWAYURL',\\n};" >./src/environments/environment.prod.ts`,
                `cat ./src/environments/environment.prod.ts`,
                `echo  "export const environment = {\\n  production: false,\\n  regApiGatewayUrl: '$ADMIN_APIGATEWAYURL',\\n};" >./src/environments/environment.ts`,
                `cat ./src/environments/environment.ts`,
                "npm i",
                "npm run build",
                `echo "aws s3 sync --delete --cache-control no-store dist s3://$APP_SITE_BUCKET"`,
                `aws s3 sync --delete --cache-control no-store dist "s3://$APP_SITE_BUCKET"`,
                `aws cloudfront create-invalidation --distribution-id $APP_DISTRIBUTION_ID --paths "/*"`,
              ],
            },
          },
        }),
      }
    );
    // TODO [>=1.0.0]: fix least permission at v1.
    const tenantAppDeploymentProjectRolePolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: ["*"],
      actions: ["s3:*", "cloudfront:CreateInvalidation"],
    });
    tenantAppDeploymentProject.addToRolePolicy(
      tenantAppDeploymentProjectRolePolicy
    );
    const tenantAppDeploymentAction = new codepipeline_actions.CodeBuildAction({
      environmentVariables: {
        APP_SITE_BUCKET: {
          value: infraDeploymentAction.variable(
            SystemProviderCfnOutputs.tenantAppBucketName
          ),
        },
        ADMIN_APIGATEWAYURL: {
          value: `https://${infraDeploymentAction.variable(
            SystemProviderCfnOutputs.restApiId
          )}.execute-api.${infraDeploymentAction.variable(
            SystemProviderCfnOutputs.stackRegion
          )}.amazonaws.com/${stage}`,
        },

        REGION: {
          value: infraDeploymentAction.variable(
            SystemProviderCfnOutputs.stackRegion
          ),
        },
        APP_DISTRIBUTION_ID: {
          value: infraDeploymentAction.variable(
            SystemProviderCfnOutputs.tenantAppCFDistributionId
          ),
        },
      },
      actionName: "DeployTenantAppFrontEnd",
      project: tenantAppDeploymentProject,
      input: sourceOutput,
    });

    ////////////////////////////////////////////////////////
    /////////////////TenantAppDeployment////////////////////
    const onBoardingAppDeploymentProject = new codebuild.PipelineProject(
      this,
      "onBoardingAppDeploymentProject",
      {
        buildSpec: codebuild.BuildSpec.fromObject({
          version: "0.2",
          // environment: {
          //   buildImage: codebuild.LinuxBuildImage.STANDARD_7_0, // Specify the desired Node.js version
          // },
          phases: {
            install: {
              commands: [
                "curl https://get.volta.sh | bash",
                'export PATH="$HOME/.volta/bin:$PATH"',
                "volta install node@16.16.0",
                "volta pin node@16.16.0",
                "volta install pnpm --verbose",
              ],
            },
            build: {
              commands: [
                "cd ./apps/Landing",
                `echo "Configuring environment for Tenant Application"`,
                `echo "export const environment = {\\n  production: true,\\n  apiGatewayUrl: '$ADMIN_APIGATEWAYURL',\\n};" >./src/environments/environment.prod.ts`,
                `cat ./src/environments/environment.prod.ts`,
                `echo  "export const environment = {\\n  production: false,\\n  apiGatewayUrl: '$ADMIN_APIGATEWAYURL',\\n};" >./src/environments/environment.ts`,
                `cat ./src/environments/environment.ts`,
                "npm i",
                "npm run build",
                `echo "aws s3 sync --delete --cache-control no-store dist s3://$ONBOARDING_SITE_BUCKET"`,
                `aws s3 sync --delete --cache-control no-store dist "s3://$ONBOARDING_SITE_BUCKET"`,
                `aws cloudfront create-invalidation --distribution-id $ONBOARDING_DISTRIBUTION_ID --paths "/*"`,
              ],
            },
          },
        }),
      }
    );
    // TODO [>=1.0.0]: fix least permission at v1.
    const onBoardingAppDeploymentProjectRolePolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: ["*"],
      actions: ["s3:*", "cloudfront:CreateInvalidation"],
    });
    onBoardingAppDeploymentProject.addToRolePolicy(
      onBoardingAppDeploymentProjectRolePolicy
    );
    const onBoardingAppDeploymentAction =
      new codepipeline_actions.CodeBuildAction({
        environmentVariables: {
          ONBOARDING_SITE_BUCKET: {
            value: infraDeploymentAction.variable(
              SystemProviderCfnOutputs.onBoardingAppBucketName
            ),
          },
          ADMIN_APIGATEWAYURL: {
            value: `https://${infraDeploymentAction.variable(
              SystemProviderCfnOutputs.restApiId
            )}.execute-api.${infraDeploymentAction.variable(
              SystemProviderCfnOutputs.stackRegion
            )}.amazonaws.com/${stage}`,
          },

          REGION: {
            value: infraDeploymentAction.variable(
              SystemProviderCfnOutputs.stackRegion
            ),
          },
          ONBOARDING_DISTRIBUTION_ID: {
            value: infraDeploymentAction.variable(
              SystemProviderCfnOutputs.onBoardingAppCFDistributionId
            ),
          },
        },
        actionName: "DeployOnBoardingAppFrontEnd",
        project: onBoardingAppDeploymentProject,
        input: sourceOutput,
      });

    const pipeline = new codepipeline.Pipeline(
      this,
      generateLogicalId(
        SystemProviderProvisioningPipelineNameDict.systemProviderProvisiongPipelineName
      ),
      {
        pipelineName:
          SystemProviderProvisioningPipelineNameDict.systemProviderProvisiongPipelineName,

        crossAccountKeys: false,
        restartExecutionOnUpdate: true,
        stages: [
          {
            stageName: "Source",
            actions: [sourceAction],
          },
          {
            stageName: "pipeline-build",
            actions: [pipeline_update_action],
          },
          {
            stageName: "pipeline-transform",
            actions: [
              new codepipeline_actions.CloudFormationCreateUpdateStackAction({
                actionName: "Pipeline_Update",
                stackName:
                  SystemProviderProvisioningPipelineNameDict.systemProviderProvisiongPipelineName,

                templatePath: cdkBuildOutput.atPath(
                  `infrastructures/ci_cd/cdk.out/systemProvisioningPipeline.template.json`
                ),
                adminPermissions: true,
              }),
            ],
          },
          {
            stageName: "lambda-layer-build",
            actions: [lambdaLayerBuildAction],
          },
          {
            stageName: "lambda-build",
            actions: [lambdaBuildAction],
          },
          {
            stageName: "infraDeployment",
            actions: [infraDeploymentAction],
          },
          {
            stageName: "adminAppDeployment",
            actions: [adminAppDeploymentAction],
          },
          {
            stageName: "tenantAppDeployment",
            actions: [tenantAppDeploymentAction],
          },
          {
            stageName: "onBoardingAppDeployment",
            actions: [onBoardingAppDeploymentAction],
          },
        ],
      }
    );
    ////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////
    /////////////////TenantInfraProvisiong//////////////////

    ////////////////////////////////////////////////////////
  }
}
