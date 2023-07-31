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

const app = new cdk.App();
const tenantProvisoningPipelineName =
  TenantProvisioningPipelineNameDict.tenantProvisiongPipelineName;
const ecrStack = new ECRStack(app, "ecrStack", {
  env: {
    region: "ap-northeast-1",
  },
  tags: {
    environment: "development",
  },
});
const lambdaECR = ecrStack.lambdaECR;
const lambdaLayerECR = ecrStack.lambdaLayerECR;
const systemProvisioningPipeline = new SystemProvisiongPipeline(
  app,
  SystemProviderProvisioningPipelineNameDict.systemProviderProvisiongPipelineName,
  {
    env: {
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

const systemProviderInfraStack = new DeploymentStack(
  app,
  "systemProviderInfraStack",
  {
    env: {
      region: "ap-northeast-1",
    },
    tags: {
      environment: "development",
    },
    lambdaEcrRepositoryUri: lambdaECR.repositoryUri,
  }
);

const tenantProvisioningPipeline = new TenantProvisioningPipeline(
  app,
  TenantProvisioningPipelineNameDict.tenantProvisiongPipelineName,
  {
    env: {
      region: "ap-northeast-1",
    },
    tags: {
      environment: "development",
    },
    tenantProvisoningPipelineName,
  }
);

//TODO: doc it
const tenantProviderInfraStackName = app.node.tryGetContext(
  "tenantProviderInfraStackName"
) as string;

const tenantProviderInfraStack = new TenantDeploymentStack(
  app,
  "tenantProviderInfraStack",
  {
    env: {
      region: "ap-northeast-1",
    },
    stackName: tenantProviderInfraStackName,
    tags: {
      environment: "development",
    },
  }
);
cdk.Tags.of(systemProvisioningPipeline).add("environment", "dev");
cdk.Tags.of(tenantProvisioningPipeline).add("environment", "dev");

cdk.Tags.of(systemProviderInfraStack).add("environment", "dev");
cdk.Tags.of(tenantProviderInfraStack).add("environment", "dev");

// const tags = [
//   { key: "author", value: "guo" },
//   { key: "project", value: "test-project" },
// ];

// const tagger = new ResourcesTagger(tags);
// cdk.Aspects.of(rootStack).add(tagger);
// cdk.Aspects.of(infraRootStack).add(tagger);
app.synth();
