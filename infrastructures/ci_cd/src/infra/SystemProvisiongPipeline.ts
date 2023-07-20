import * as cdk from "aws-cdk-lib";
import { SecretValue } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as codepipeline_actions from "aws-cdk-lib/aws-codepipeline-actions";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as codepipeline from "aws-cdk-lib/aws-codepipeline";
import * as ecr from "aws-cdk-lib/aws-ecr";
import { SystemProvisiongPipelineProps } from "shared/prop_extensions.types";

export class SystemProvisiongPipeline extends cdk.Stack {
  public readonly lambdaEcrRepositoryUri: string;
  constructor(
    scope: Construct,
    id: string,
    props: SystemProvisiongPipelineProps
  ) {
    super(scope, id, props);
    const githubPATName = "dev/multi-tenant-saas";
    const githubAccessToken = SecretValue.secretsManager(githubPATName);
    const owner = "Guo-astro";
    const repo = "multi-tenant-hub";
    const branch = "main";

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
    //////////////////Build python lambda layer////////////////////
    const lambdaLayerECR = new ecr.Repository(this, "pylayer");
    const buildspec_lambda_layer_docker_path =
      "infrastructures/ci_cd/src/infra/service_provider_stacks/buildspec_lambda_layer_docker.yml";

    const lambdaLayerBuildProject = new codebuild.PipelineProject(
      this,
      "lambdaLayerBuildProject",
      {
        environmentVariables: {
          IMAGE_TAG: { value: "latest" },
          IMAGE_REPO_URI: { value: lambdaLayerECR.repositoryUri },
          AWS_DEFAULT_REGION: { value: process.env.CDK_DEFAULT_REGION },
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

    const lambdaECR = new ecr.Repository(this, "multi_tenant_hub_lambda");
    // Create the assumed role
    this.lambdaEcrRepositoryUri = lambdaECR.repositoryUri;

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
          AWS_DEFAULT_REGION: { value: process.env.CDK_DEFAULT_REGION },
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
    const buildspec_infra_deployment_path =
      "infrastructures/ci_cd/src/infra/service_provider_stacks/buildspec_infra_deployment.yml";
    const infraDeploymentProject = new codebuild.PipelineProject(
      this,
      "DeployProject",
      {
        environmentVariables: {
          tenantProvisiongPipelineName: {
            value: props.tenantProvisoningPipelineName,
          },
        },
        environment: {
          buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        },
        buildSpec: codebuild.BuildSpec.fromSourceFilename(
          buildspec_infra_deployment_path
        ),
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
          value: infraDeploymentAction.variable("adminAppBucketName"),
        },
        ADMIN_APIGATEWAYURL: {
          value: `https://${infraDeploymentAction.variable(
            "restApiId"
          )}.execute-api.${infraDeploymentAction.variable(
            "stackRegion"
          )}.amazonaws.com/prod`,
        },
        ADMIN_USERPOOLID: {
          value: infraDeploymentAction.variable(
            "cognitoOperationUsersUserPoolId"
          ),
        },
        ADMIN_APPCLIENTID: {
          value: infraDeploymentAction.variable(
            "cognitoOperationUsersUserPoolClientId"
          ),
        },
        REGION: {
          value: infraDeploymentAction.variable("stackRegion"),
        },
        ADMIN_DISTRIBUTION_ID: {
          value: infraDeploymentAction.variable("adminDistributionId"),
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
          value: infraDeploymentAction.variable("tenantAppBucketName"),
        },
        ADMIN_APIGATEWAYURL: {
          value: `https://${infraDeploymentAction.variable(
            "restApiId"
          )}.execute-api.${infraDeploymentAction.variable(
            "stackRegion"
          )}.amazonaws.com/prod`,
        },

        REGION: {
          value: infraDeploymentAction.variable("stackRegion"),
        },
        APP_DISTRIBUTION_ID: {
          value: infraDeploymentAction.variable("tenantAppDistributionId"),
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
            value: infraDeploymentAction.variable("onBoardingAppBucketName"),
          },
          ADMIN_APIGATEWAYURL: {
            value: `https://${infraDeploymentAction.variable(
              "restApiId"
            )}.execute-api.${infraDeploymentAction.variable(
              "stackRegion"
            )}.amazonaws.com/prod`,
          },

          REGION: {
            value: infraDeploymentAction.variable("stackRegion"),
          },
          ONBOARDING_DISTRIBUTION_ID: {
            value: infraDeploymentAction.variable(
              "onBoardingAppDistributionId"
            ),
          },
        },
        actionName: "DeployOnBoardingAppFrontEnd",
        project: onBoardingAppDeploymentProject,
        input: sourceOutput,
      });

    const pipeline = new codepipeline.Pipeline(this, "AwesomePipeline", {
      pipelineName: "AwesomePipeline",
      stages: [
        {
          stageName: "Source",
          actions: [sourceAction],
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
    });
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
