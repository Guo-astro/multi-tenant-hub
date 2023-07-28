import * as cdk from "aws-cdk-lib";
import { SecretValue } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as codepipeline_actions from "aws-cdk-lib/aws-codepipeline-actions";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as codepipeline from "aws-cdk-lib/aws-codepipeline";
import { Bucket, BucketEncryption } from "aws-cdk-lib/aws-s3";
import { CostAnalyticsPipelineProps } from "@/shared/prop_extensions.types";
import { CostAnalyticsPipelineNameDict } from "@/shared/Constants";
import { createPipelineUpdateAction } from "./utils/pipelineHelper";
export class CostAnalyticsPipeline extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CostAnalyticsPipelineProps) {
    super(scope, id, props);

    const artifactsBucket = new Bucket(
      this,
      CostAnalyticsPipelineNameDict.artifactsBucketId,
      {
        encryption: BucketEncryption.S3_MANAGED,
      }
    );
    const githubPATName = "dev/multi-tenant-saas";
    const githubAccessToken = SecretValue.secretsManager(githubPATName);
    const owner = CostAnalyticsPipelineNameDict.owner;
    const repo = CostAnalyticsPipelineNameDict.repo;
    const branch = CostAnalyticsPipelineNameDict.branch;

    //////////////////////////////////////////////////////
    const sourceOutput = new codepipeline.Artifact();

    const sourceAction = new codepipeline_actions.GitHubSourceAction({
      actionName: CostAnalyticsPipelineNameDict.GitHub_Source,
      owner,
      repo,
      branch,
      oauthToken: githubAccessToken,
      output: sourceOutput,
      // trigger: codepipeline_actions.GitHubTrigger.NONE,
    });
    const cdkBuildOutput = new codepipeline.Artifact("pipeline-cdk-build");
    const pipeline_update_action = createPipelineUpdateAction(
      this,
      sourceOutput,
      CostAnalyticsPipelineNameDict.costAnalyticsPipelineName,
      cdkBuildOutput
    );

    // Declare build output as artifacts
    const tenantStackDeployOutput = new codepipeline.Artifact();

    const buildspec = {
      version: "0.2",
      env: {
        variables: {
          VOLTA_HOME: "/root/.volta",
        },
      },
      phases: {
        pre_build: {
          commands: [
            "COMMIT_HASH=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c 1-7)",
            "IMAGE_TAG=${COMMIT_HASH:=latest}",
            // add more pre_build commands here
          ],
        },
        build: {
          path: "infrastructures/ci_cd/src/infra/tenant_stacks",
          commands: [
            "curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -",
            "apt-get update && apt-get install -y jq",
            "curl https://get.volta.sh | bash",
            'export PATH="$VOLTA_HOME/bin:$PATH"',
            "volta install node@16.16.0",
            "volta pin node@16.16.0",
            "which npm",
            "npm install -g pnpm",
            "ls -al ..",
            "ls -al",
            "ls -al /root",
            "ls -al /root/.volta",
            "ls -al /root/.volta/bin",
            "echo $PATH",
            'export PATH="$NPM_BIN:$PATH"',
            "echo $PATH",
            "cd ./infrastructures/ci_cd",
            "pnpm i",

            `pnpx cdk deploy ${CostAnalyticsPipelineNameDict.costAnalyticsPipelineName} --method=direct --require-approval never `,
          ],
        },
      },
    };
    const tenantStackDeployProject = new codebuild.PipelineProject(
      this,
      CostAnalyticsPipelineNameDict.costAnalyticsStackDeployProject,
      {
        cache: codebuild.Cache.local(codebuild.LocalCacheMode.DOCKER_LAYER),

        buildSpec: codebuild.BuildSpec.fromObject(buildspec),
        environment: {
          buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
          privileged: true,
        },
      }
    );
    const infraDeploymentRolePolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: ["*"],
      actions: ["cloudformation:*", "s3:*", "iam:*", "ssm:GetParameter"],
    });

    tenantStackDeployProject.addToRolePolicy(infraDeploymentRolePolicy);
    const costAnalyticsStackDeployAction =
      new codepipeline_actions.CodeBuildAction({
        actionName:
          CostAnalyticsPipelineNameDict.costAnalyticsStackDeployAction,
        project: tenantStackDeployProject,
        input: sourceOutput,
        outputs: [tenantStackDeployOutput],
      });
    const tenantpipeline = new codepipeline.Pipeline(
      this,
      CostAnalyticsPipelineNameDict.costAnalyticPipeline,
      {
        artifactBucket: artifactsBucket,
        crossAccountKeys: false,
        restartExecutionOnUpdate: true,
        stages: [
          {
            stageName: CostAnalyticsPipelineNameDict.Source,
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
                  CostAnalyticsPipelineNameDict.costAnalyticsPipelineName,

                templatePath: cdkBuildOutput.atPath(
                  `infrastructures/ci_cd/cdk.out/costAnalyticsPipeline.template.json`
                ),
                adminPermissions: true,
              }),
            ],
          },

          {
            stageName:
              CostAnalyticsPipelineNameDict.costAnalyticsStackDeployAction,
            actions: [costAnalyticsStackDeployAction],
          },
        ],
      }
    );
  }
}
