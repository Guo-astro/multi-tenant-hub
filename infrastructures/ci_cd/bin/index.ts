import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { SystemProvisiongPipeline } from "../src/infra/SystemProvisiongPipeline";
import { DeploymentStack } from "@/infra/service_provider_stacks/DeploymentStack";
import { TenantProvisioningPipeline } from "@/infra/TenantProvisioningPipeline";
import { TenantDeploymentStack } from "@/infra/tenant_stacks/TenantDeploymentStack";
import {
  SystemProviderProvisioningPipelineNameDict,
  TenantProvisioningPipelineNameDict,
} from "@/shared/Constants";
import { ECRStack } from "@/infra/service_provider_stacks/ECRStack";
import { CostAnalyticsDeploymentStack } from "@/infra/cost_analysis_stacks/CostDeploymentStack";

const app = new cdk.App();
const tenantProvisoningPipelineName =
  TenantProvisioningPipelineNameDict.tenantProvisiongPipelineName;
const ecrStack = new ECRStack(app, "ecrStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "ap-northeast-1",
  },
  tags: {
    environment: "development",
  },
});
const lambdaECR = ecrStack.lambdaECR;
const lambdaLayerECR = ecrStack.lambdaLayerECR;

//TODO: doc it
const tenantProviderInfraStackName = app.node.tryGetContext(
  "tenantProviderInfraStackName"
) as string;

const tenantProviderInfraStack = new TenantDeploymentStack(
  app,
  "tenantProviderInfraStack",
  {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,

      region: "ap-northeast-1",
    },
    stackName: tenantProviderInfraStackName,
    tags: {
      environment: "development",
    },
  }
);

const systemProviderInfraStack = new DeploymentStack(
  app,
  "systemProviderInfraStack",
  {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,

      region: "ap-northeast-1",
    },
    tags: {
      environment: "development",
    },
    lambdaEcrRepositoryUri: lambdaECR.repositoryUri,
  }
);
const costAnalyticsDeploymentStack = new CostAnalyticsDeploymentStack(
  app,
  "costAnalyticsDeploymentStack",
  {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,

      region: "us-east-1",
    },
    stackName: tenantProviderInfraStackName,
    tags: {
      environment: "development",
    },
  }
);
const systemProvisioningPipeline = new SystemProvisiongPipeline(
  app,
  SystemProviderProvisioningPipelineNameDict.systemProviderProvisiongPipelineName,
  {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,

      region: "ap-northeast-1",
    },
    tags: {
      environment: "development",
    },
    tenantProvisoningPipelineName,
    lambdaECR,
    lambdaLayerECR,
  }
);

const tenantProvisioningPipeline = new TenantProvisioningPipeline(
  app,
  TenantProvisioningPipelineNameDict.tenantProvisiongPipelineName,
  {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,

      region: "ap-northeast-1",
    },
    tags: {
      environment: "development",
    },
    tenantProvisoningPipelineName,
  }
);

cdk.Tags.of(systemProviderInfraStack).add("environment", "dev");
cdk.Tags.of(tenantProviderInfraStack).add("environment", "dev");
cdk.Tags.of(costAnalyticsDeploymentStack).add("environment", "dev");

cdk.Tags.of(systemProvisioningPipeline).add("environment", "dev");
cdk.Tags.of(tenantProvisioningPipeline).add("environment", "dev");

// const tags = [
//   { key: "author", value: "guo" },
//   { key: "project", value: "test-project" },
// ];

// const tagger = new ResourcesTagger(tags);
// cdk.Aspects.of(rootStack).add(tagger);
// cdk.Aspects.of(infraRootStack).add(tagger);
app.synth();
