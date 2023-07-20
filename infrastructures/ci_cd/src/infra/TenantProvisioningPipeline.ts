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
  Code,
  FunctionUrlAuthType,
  LayerVersion,
  Runtime,
} from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import path from "path";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { TenantProvisioningPipelineProps } from "shared/prop_extensions.types";
export class TenantProvisioningPipeline extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: TenantProvisioningPipelineProps
  ) {
    super(scope, id, props);

    const artifactsBucket = new Bucket(this, "artifactsBucketId", {
      encryption: BucketEncryption.S3_MANAGED,
    });
    const githubPATName = "dev/multi-tenant-saas";
    const githubAccessToken = SecretValue.secretsManager(githubPATName);
    const owner = "Guo-astro";
    const repo = "multi-tenant-hub";
    const branch = "main";

    //Since this lambda is invoking cloudformation which is inturn deploying AWS resources, we are giving overly permissive permissions to this lambda.
    //You can limit this based upon your use case and AWS Resources you need to deploy.
    const lambdaPolicy = new iam.PolicyStatement();
    lambdaPolicy.addActions("*");
    lambdaPolicy.addResources("*");
    const powertoolsLayer = LayerVersion.fromLayerVersionArn(
      this,
      "powertoolsLayerId",
      `arn:aws:lambda:${
        cdk.Stack.of(this).region
      }:094274105915:layer:AWSLambdaPowertoolsTypeScript:12`
    );

    const tenantStackProvisioninglambdaFunction = new NodejsFunction(
      this,
      "tenantStackProvisioninglambdaFunction",
      {
        bundling: {
          externalModules: ["@aws-lambda-powertools/logger", "@middy/core"],
          nodeModules: ["@middy/core"],

          sourceMap: true,
        },
        entry: path.join(__dirname, "tenant_stacks", "index.ts"),
        environment: {
          //TODO: seperate log level according to the environment variables
          LOG_LEVEL: "DEBUG",
          POWERTOOLS_LOGGER_LOG_EVENT: "true",
          POWERTOOLS_SERVICE_NAME: `tenantStackProvisioninglambdaFunction`,
          BUCKET: artifactsBucket.bucketName,
          TENANT_DETAILS_TABLE_NAME: cdk.Fn.importValue(
            "tenantDetailsTableName"
          ),
          TENANT_STACK_MAPPING_TABLE_NAME: cdk.Fn.importValue(
            "tenantStackMappingTableName"
          ),
          SYSTEM_SETTINGS_TABLE_NAME: cdk.Fn.importValue(
            "serverlessSaaSSettingsTableName"
          ),
          TENANT_DETAILS_TABLE_ARN: cdk.Fn.importValue("tenantDetailsTableArn"),
          USAGE_PLAN_BASIC_TIER_ID: cdk.Fn.importValue("usagePlanBasicTierId"),
          USAGE_PLAN_STANDARD_TIER_ID: cdk.Fn.importValue(
            "usagePlanStandardTierId"
          ),
          USAGE_PLAN_PREMIUM_TIER_ID: cdk.Fn.importValue(
            "usagePlanPremiumTierId"
          ),

          USAGE_PLAN_PLATINUM_TIER_ID: cdk.Fn.importValue(
            "usagePlanPlatinumTierId"
          ),
          authorizerFunctionArnCfnParam: cdk.Fn.importValue(
            "sharedServicesAuthorizerFunctionCfnOutput"
          ),
          //TODO : fix value name
          systemSettingsTableArnCfnParam: cdk.Fn.importValue(
            "serverlessSaaSSettingsTableArn"
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

    new cdk.CfnOutput(this, "tenantStackProvisioninglambdaFunctionUrl", {
      exportName: "tenantStackProvisioninglambdaFunctionUrl",
      value: tenantStackProvisioninglambdaFunctionUrl.url,
    });

    //////////////////////////////////////////////////////
    const sourceOutput = new codepipeline.Artifact();

    const sourceAction = new codepipeline_actions.GitHubSourceAction({
      actionName: "GitHub_Source",
      owner,
      repo,
      branch,
      oauthToken: githubAccessToken,
      output: sourceOutput,
      // trigger: codepipeline_actions.GitHubTrigger.NONE,
    });

    // Declare build output as artifacts
    const tenantStackBuildOutput = new codepipeline.Artifact();
    const tenantStackDeployOutput = new codepipeline.Artifact();
    const myRole = new iam.Role(this, "MyRole", {
      assumedBy: new iam.ServicePrincipal("codepipeline.amazonaws.com"),
    });

    // Attach the necessary policies to the role
    myRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["lambda:InvokeFunction"],
        resources: [tenantStackProvisioninglambdaFunction.functionArn],
      })
    );

    const tenantStackBuildAction = new codepipeline_actions.LambdaInvokeAction({
      actionName: "tenantStackBuildAction",
      lambda: tenantStackProvisioninglambdaFunction,
      inputs: [sourceOutput],
      outputs: [new codepipeline.Artifact("tenantStackBuildActionArtifact")],
      userParameters: {
        commit_id: sourceAction.variables.commitId,
      },
    });

    //Declare a new CodeBuild project
    const tenant_stack_buildspec_path =
      "infrastructures/ci_cd/src/infra/tenant_stacks/buildspec_tenant_infra_deployment.yml";
    const tenantStackDeployProject = new codebuild.PipelineProject(
      this,
      "tenantStackDeployProject",
      {
        cache: codebuild.Cache.local(codebuild.LocalCacheMode.DOCKER_LAYER),

        buildSpec: codebuild.BuildSpec.fromSourceFilename(
          tenant_stack_buildspec_path
        ),
        environment: {
          buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
          //TODO: doc it. Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?
          privileged: true,
        },
        environmentVariables: {
          authorizerFunctionArnCfnParam: {
            value: cdk.Fn.importValue(
              "sharedServicesAuthorizerFunctionCfnOutput"
            ),
          },
          systemProviderSettingsTableNameCfnParam: {
            value: cdk.Fn.importValue("serverlessSaaSSettingsTableName"),
          },
          tenantDetailsTableNameCfnParam: {
            value: cdk.Fn.importValue("tenantDetailsTableName"),
          },
          tenantDetailsTableArnCfnParam: {
            value: cdk.Fn.importValue("tenantDetailsTableArn"),
          },
          usagePlanBasicTierIdCfnParam: {
            value: cdk.Fn.importValue("usagePlanBasicTierId"),
          },
          systemSettingsTableArnCfnParam: {
            value: cdk.Fn.importValue("serverlessSaaSSettingsTableArn"),
          },
          usagePlanStandardTierIdCfnParam: {
            value: cdk.Fn.importValue("usagePlanStandardTierId"),
          },
          usagePlanPremiumTierIdCfnParam: {
            value: cdk.Fn.importValue("usagePlanPremiumTierId"),
          },
          usagePlanPlatinumTierIdCfnParam: {
            value: cdk.Fn.importValue("usagePlanPlatinumTierId"),
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
      actionName: "tenantStackDeployAction",
      project: tenantStackDeployProject,
      input: sourceOutput,
      outputs: [tenantStackDeployOutput],
      environmentVariables: {
        tenanIdCfnParam: {
          value: tenantStackBuildAction.variable("tenanIdCfnParam"),
        },
      },
    });
    const tenantpipeline = new codepipeline.Pipeline(this, "tenantpipeline", {
      artifactBucket: artifactsBucket,
      pipelineName: props.tenantProvisoningPipelineName,
      role: myRole,
      stages: [
        {
          stageName: "Source",
          actions: [sourceAction],
        },
        {
          stageName: "tenantStackBuildAction",
          actions: [tenantStackBuildAction],
        },
        {
          stageName: "tenantStackDeployAction",
          actions: [tenantStackDeployAction],
        },
      ],
    });
  }
}
