import * as cdk from "aws-cdk-lib";
import type { Construct } from "constructs";
import { CostAndUsageReportStack } from "./CostAndUsageReportStack";
import { SaasCostByTenantStack } from "./SaasCostByTenantStack";
import type { CostDeploymentStackProps } from "@/shared/prop_extensions.types";
export class CostDeploymentStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CostDeploymentStackProps) {
    super(scope, id, props);
    const saasCostByTenantStack = new SaasCostByTenantStack(
      this,
      "SaasCostByTenantStack",
      {
        tags: { environment: props.tags.environment },
      }
    );
    // eslint-disable-next-line no-new
    new CostAndUsageReportStack(this, "CostAndUsageReportStack", {
      env: { region: "us-east-1" },
      tags: { environment: props.tags.environment },
      reportBucket: saasCostByTenantStack.curBucket,
    });
  }
}
