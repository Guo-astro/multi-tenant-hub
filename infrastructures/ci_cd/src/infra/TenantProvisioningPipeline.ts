import * as cdk from "aws-cdk-lib";
import { SecretValue } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as codepipeline_actions from "aws-cdk-lib/aws-codepipeline-actions";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as codepipeline from "aws-cdk-lib/aws-codepipeline";
import * as ecr from "aws-cdk-lib/aws-ecr";
import { SSMParameterReader } from "@/infra/utils/ssmParamReader";
import { Bucket, BucketEncryption } from "aws-cdk-lib/aws-s3";
import {
  FunctionUrlAuthType,
  LayerVersion,
  Runtime,
} from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import path from "path";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { TenantProvisioningPipelineProps } from "@/shared/prop_extensions.types";
import {
  SharedCfnOutputs,
  TenantProvisioningPipelineNameDict,
  SystemProviderCfnOutputs,
  TenantSystemNameDict,
} from "@/shared/Constants";
import { createPipelineUpdateAction } from "./utils/pipelineHelper";
export class TenantProvisioningPipeline extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: TenantProvisioningPipelineProps
  ) {
    super(scope, id, props);

    const artifactsBucket = new Bucket(
      this,
      TenantProvisioningPipelineNameDict.artifactsBucketId,
      {
        encryption: BucketEncryption.S3_MANAGED,
      }
    );
    const githubPATName = "dev/multi-tenant-saas";
    const githubAccessToken = SecretValue.secretsManager(githubPATName);
    const owner = TenantProvisioningPipelineNameDict.owner;
    const repo = TenantProvisioningPipelineNameDict.repo;
    const branch = TenantProvisioningPipelineNameDict.branch;

    //Since this lambda is invoking cloudformation which is inturn deploying AWS resources, we are giving overly permissive permissions to this lambda.
    //You can limit this based upon your use case and AWS Resources you need to deploy.
    const lambdaPolicy = new iam.PolicyStatement();
    lambdaPolicy.addActions("*");
    lambdaPolicy.addResources("*");
    const powertoolsLayer = LayerVersion.fromLayerVersionArn(
      this,
      TenantProvisioningPipelineNameDict.powertoolsLayerId,
      `arn:aws:lambda:${
        cdk.Stack.of(this).region
      }:094274105915:layer:AWSLambdaPowertoolsTypeScript:12`
    );

    const tenantStackProvisioninglambdaFunction = new NodejsFunction(
      this,
      TenantProvisioningPipelineNameDict.tenantStackProvisioninglambdaFunction,
      {
        bundling: {
          externalModules: ["@aws-lambda-powertools/logger", "@middy/core"],
          nodeModules: ["@middy/core"],

          sourceMap: true,
        },
        entry: path.join(__dirname, "tenant_stacks", "update_stack_handler.ts"),
        environment: {
          //TODO: seperate log level according to the environment variables
          LOG_LEVEL: "DEBUG",
          POWERTOOLS_LOGGER_LOG_EVENT: "true",
          POWERTOOLS_SERVICE_NAME:
            TenantProvisioningPipelineNameDict.tenantStackProvisioninglambdaFunction,
          BUCKET: artifactsBucket.bucketName,
          TENANT_DETAILS_TABLE_NAME: cdk.Fn.importValue(
            SystemProviderCfnOutputs.tenantDetailsTableName
          ),
          TENANT_STACK_MAPPING_TABLE_NAME: cdk.Fn.importValue(
            SystemProviderCfnOutputs.tenantStackMappingTableName
          ),
          SYSTEM_SETTINGS_TABLE_NAME: cdk.Fn.importValue(
            SystemProviderCfnOutputs.serverlessSaaSSettingsTableName
          ),
          TENANT_DETAILS_TABLE_ARN: cdk.Fn.importValue(
            SystemProviderCfnOutputs.tenantDetailsTableArn
          ),
          USAGE_PLAN_BASIC_TIER_ID: cdk.Fn.importValue(
            SystemProviderCfnOutputs.usagePlanBasicTierId
          ),
          USAGE_PLAN_STANDARD_TIER_ID: cdk.Fn.importValue(
            SystemProviderCfnOutputs.usagePlanStandardTierId
          ),
          USAGE_PLAN_PREMIUM_TIER_ID: cdk.Fn.importValue(
            SystemProviderCfnOutputs.usagePlanPremiumTierId
          ),

          USAGE_PLAN_PLATINUM_TIER_ID: cdk.Fn.importValue(
            SystemProviderCfnOutputs.usagePlanPlatinumTierId
          ),
          authorizerFunctionArnCfnParam: cdk.Fn.importValue(
            SystemProviderCfnOutputs.sharedServicesAuthorizerFunctionCfnOutput
          ),
          //TODO : fix value name
          systemSettingsTableArnCfnParam: cdk.Fn.importValue(
            SystemProviderCfnOutputs.serverlessSaaSSettingsTableArn
          ),
        },
        handler: "handler",
        layers: [powertoolsLayer],
        logRetention: RetentionDays.ONE_WEEK,
        memorySize: 512,
        runtime: Runtime.NODEJS_18_X,
        initialPolicy: [lambdaPolicy],
        timeout: cdk.Duration.seconds(900),
      }
    );

    const tenantStackProvisioninglambdaFunctionUrl =
      tenantStackProvisioninglambdaFunction.addFunctionUrl({
        authType: FunctionUrlAuthType.NONE,
        cors: {
          allowedOrigins: ["*"],
        },
      });

    new cdk.CfnOutput(
      this,
      TenantProvisioningPipelineNameDict.tenantStackProvisioninglambdaFunctionUrl,
      {
        exportName: SharedCfnOutputs.tenantStackProvisioninglambdaFunctionUrl,
        value: tenantStackProvisioninglambdaFunctionUrl.url,
      }
    );

    //////////////////////////////////////////////////////
    const sourceOutput = new codepipeline.Artifact();

    const sourceAction = new codepipeline_actions.GitHubSourceAction({
      actionName: TenantProvisioningPipelineNameDict.GitHub_Source,
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
      TenantSystemNameDict.tenantProviderInfraStackName,
      cdkBuildOutput
    );

    // Declare build output as artifacts
    const tenantStackDeployOutput = new codepipeline.Artifact();
    const myRole = new iam.Role(
      this,
      TenantProvisioningPipelineNameDict.MyRole,
      {
        assumedBy: new iam.ServicePrincipal("codepipeline.amazonaws.com"),
      }
    );

    // Attach the necessary policies to the role
    myRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["lambda:InvokeFunction"],
        resources: [tenantStackProvisioninglambdaFunction.functionArn],
      })
    );

    const tenantStackBuildAction = new codepipeline_actions.LambdaInvokeAction({
      actionName: TenantProvisioningPipelineNameDict.tenantStackBuildAction,
      lambda: tenantStackProvisioninglambdaFunction,
      inputs: [sourceOutput],
      outputs: [new codepipeline.Artifact("tenantStackBuildActionArtifact")],
      userParameters: {
        commit_id: sourceAction.variables.commitId,
      },
    });

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
            `echo $${TenantSystemNameDict.tenanIdCfnParam}`,
            `echo $${TenantSystemNameDict.authorizerFunctionArnCfnParam}`,
            `echo $${TenantSystemNameDict.systemProviderSettingsTableNameCfnParam}`,

            `echo $${TenantSystemNameDict.tenanIdCfnParam} | base64 -d | jq -r '.[]'`,
            `echo "$${TenantSystemNameDict.tenanIdCfnParam}" | base64 -d | jq -c '.[]' | while read -r line; do
              tenantId=$(echo "$line" | jq -r '.tenantId');
              echo "Deploying stack for tenant: $tenantId";
              echo $${TenantSystemNameDict.tenantDetailsTableNameCfnParam};
              echo $${TenantSystemNameDict.tenantDetailsTableArnCfnParam};
              echo $${TenantSystemNameDict.usagePlanBasicTierIdCfnParam};
              echo $${TenantSystemNameDict.systemSettingsTableArnCfnParam};
              echo $${TenantSystemNameDict.usagePlanStandardTierIdCfnParam};
              echo $${TenantSystemNameDict.usagePlanPremiumTierIdCfnParam};
              echo $${TenantSystemNameDict.usagePlanPlatinumTierIdCfnParam};
              pnpx cdk deploy ${TenantProvisioningPipelineNameDict.tenantProviderInfraStack} --method=direct --require-approval never --parameters ${TenantSystemNameDict.tenanIdCfnParam}=$tenantId --parameters ${TenantSystemNameDict.authorizerFunctionArnCfnParam}=$${TenantSystemNameDict.authorizerFunctionArnCfnParam} --parameters ${TenantSystemNameDict.systemProviderSettingsTableNameCfnParam}=$${TenantSystemNameDict.systemProviderSettingsTableNameCfnParam} --parameters ${TenantSystemNameDict.tenantDetailsTableNameCfnParam}=$${TenantSystemNameDict.tenantDetailsTableNameCfnParam} --parameters ${TenantSystemNameDict.tenantDetailsTableArnCfnParam}=$${TenantSystemNameDict.tenantDetailsTableArnCfnParam} --parameters ${TenantSystemNameDict.usagePlanBasicTierIdCfnParam}=$${TenantSystemNameDict.usagePlanBasicTierIdCfnParam} --parameters ${TenantSystemNameDict.systemSettingsTableArnCfnParam}=$${TenantSystemNameDict.systemSettingsTableArnCfnParam} --parameters ${TenantSystemNameDict.usagePlanStandardTierIdCfnParam}=$${TenantSystemNameDict.usagePlanStandardTierIdCfnParam} --parameters ${TenantSystemNameDict.usagePlanPremiumTierIdCfnParam}=$${TenantSystemNameDict.usagePlanPremiumTierIdCfnParam} --parameters ${TenantSystemNameDict.usagePlanPlatinumTierIdCfnParam}=$${TenantSystemNameDict.usagePlanPlatinumTierIdCfnParam} --context ${TenantSystemNameDict.tenantProviderInfraStackName}=stack-$tenantId ;
            done`,
          ],
        },
      },
    };
    const tenantStackDeployProject = new codebuild.PipelineProject(
      this,
      TenantProvisioningPipelineNameDict.tenantStackDeployProject,
      {
        cache: codebuild.Cache.local(codebuild.LocalCacheMode.DOCKER_LAYER),

        buildSpec: codebuild.BuildSpec.fromObject(buildspec),
        environment: {
          buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
          privileged: true,
        },
        environmentVariables: {
          authorizerFunctionArnCfnParam: {
            value: cdk.Fn.importValue(
              SystemProviderCfnOutputs.sharedServicesAuthorizerFunctionCfnOutput
            ),
          },
          systemProviderSettingsTableNameCfnParam: {
            value: cdk.Fn.importValue(
              SystemProviderCfnOutputs.serverlessSaaSSettingsTableName
            ),
          },
          tenantDetailsTableNameCfnParam: {
            value: cdk.Fn.importValue(
              SystemProviderCfnOutputs.tenantDetailsTableName
            ),
          },
          tenantDetailsTableArnCfnParam: {
            value: cdk.Fn.importValue(
              SystemProviderCfnOutputs.tenantDetailsTableArn
            ),
          },
          usagePlanBasicTierIdCfnParam: {
            value: cdk.Fn.importValue(
              SystemProviderCfnOutputs.usagePlanBasicTierId
            ),
          },
          systemSettingsTableArnCfnParam: {
            value: cdk.Fn.importValue(
              SystemProviderCfnOutputs.serverlessSaaSSettingsTableArn
            ),
          },
          usagePlanStandardTierIdCfnParam: {
            value: cdk.Fn.importValue(
              SystemProviderCfnOutputs.usagePlanStandardTierId
            ),
          },
          usagePlanPremiumTierIdCfnParam: {
            value: cdk.Fn.importValue(
              SystemProviderCfnOutputs.usagePlanPremiumTierId
            ),
          },
          usagePlanPlatinumTierIdCfnParam: {
            value: cdk.Fn.importValue(
              SystemProviderCfnOutputs.usagePlanPlatinumTierId
            ),
          },
        },
      }
    );
    const infraDeploymentRolePolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: ["*"],
      actions: ["cloudformation:*", "s3:*", "iam:*", "ssm:GetParameter"],
    });

    tenantStackDeployProject.addToRolePolicy(infraDeploymentRolePolicy);
    const tenantStackDeployAction = new codepipeline_actions.CodeBuildAction({
      actionName: TenantProvisioningPipelineNameDict.tenantStackDeployAction,
      project: tenantStackDeployProject,
      input: sourceOutput,
      outputs: [tenantStackDeployOutput],

      environmentVariables: {
        tenanIdCfnParam: {
          value: tenantStackBuildAction.variable("tenanIdCfnParam"),
        },
      },
    });
    const tenantpipeline = new codepipeline.Pipeline(
      this,
      TenantProvisioningPipelineNameDict.tenantpipeline,
      {
        artifactBucket: artifactsBucket,
        crossAccountKeys: false,
        restartExecutionOnUpdate: true,
        pipelineName: props.tenantProvisoningPipelineName,
        role: myRole,
        stages: [
          {
            stageName: TenantProvisioningPipelineNameDict.Source,
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
                  TenantProvisioningPipelineNameDict.tenantProvisiongPipelineName,

                templatePath: cdkBuildOutput.atPath(
                  `infrastructures/ci_cd/cdk.out/tenantProvisiongPipeline.template.json`
                ),
                adminPermissions: true,
              }),
            ],
          },
          {
            stageName:
              TenantProvisioningPipelineNameDict.tenantStackBuildAction,
            actions: [tenantStackBuildAction],
          },
          {
            stageName:
              TenantProvisioningPipelineNameDict.tenantStackDeployAction,
            actions: [tenantStackDeployAction],
          },
        ],
      }
    );
  }
}
