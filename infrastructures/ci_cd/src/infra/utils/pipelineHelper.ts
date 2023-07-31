import * as cdk from "aws-cdk-lib";
import * as codepipelineActions from "aws-cdk-lib/aws-codepipeline-actions";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import { Construct } from "constructs";
export function createPipelineUpdateAction(
  scope: Construct,
  sourceOutput: cdk.aws_codepipeline.Artifact,
  stackNameToUpdate: string,
  cdkBuildOutput: cdk.aws_codepipeline.Artifact
) {
  const pipeline_update_action_buildspec = {
    version: "0.2",
    env: {
      variables: {
        VOLTA_HOME: "/root/.volta",
      },
    },
    artifacts: {
      files: ["./infrastructures/ci_cd/cdk.out/*"],
      name: "pipeline-build-artifacts",
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
          `pnpm run cdk -- synth ${stackNameToUpdate} --method=direct --require-approval never`,
        ],
      },
    },
  };

  const pipelineUpdateAction = new codepipelineActions.CodeBuildAction({
    actionName: "pipeline-update",
    input: sourceOutput,
    outputs: [cdkBuildOutput],
    project: new codebuild.PipelineProject(scope, "CdkBuildProject", {
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        privileged: true,
      },
      buildSpec: codebuild.BuildSpec.fromObject(
        pipeline_update_action_buildspec
      ),
    }),
  });
  return pipelineUpdateAction;
}
