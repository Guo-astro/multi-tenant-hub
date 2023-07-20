import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { SystemProvisiongPipeline } from "../src/infra/SystemProvisiongPipeline";
import { DeploymentStack } from "@/infra/service_provider_stacks/DeploymentStack";
import { TenantProvisioningPipeline } from "@/infra/TenantProvisioningPipeline";
import { TenantDeploymentStack } from "@/infra/tenant_stacks/TenantDeploymentStack";

const app = new cdk.App();
const tenantProvisoningPipelineName = `AwesomeTenantPipeline`;

const systemProvisioningPipeline = new SystemProvisiongPipeline(
  app,
  "systemProvisioningPipeline",
  {
    tags: {
      environment: "development",
    },
    tenantProvisoningPipelineName,
  }
);

const systemProviderInfraStack = new DeploymentStack(
  app,
  "systemProviderInfraStack",
  {
    tags: {
      environment: "development",
    },
    lambdaEcrRepositoryUri: systemProvisioningPipeline.lambdaEcrRepositoryUri,
  }
);

const tenantProvisioningPipeline = new TenantProvisioningPipeline(
  app,
  "tenantProvisioningPipeline",
  {
    tags: {
      environment: "development",
    },
    tenantProvisoningPipelineName,
  }
);

const tenantProviderInfraStack = new TenantDeploymentStack(
  app,
  "tenantProviderInfraStack",
  {
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
