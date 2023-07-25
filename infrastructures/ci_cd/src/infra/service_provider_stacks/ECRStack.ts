import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { Repository } from "aws-cdk-lib/aws-ecr";
import { ECRStackProps } from "@/shared/prop_extensions.types";
export class ECRStack extends cdk.Stack {
  public readonly lambdaECR: cdk.aws_ecr.Repository;
  public readonly lambdaLayerECR: cdk.aws_ecr.Repository;
  constructor(scope: Construct, id: string, props: ECRStackProps) {
    super(scope, id, props);
    this.lambdaECR = new Repository(this, "ecr_repo");
    this.lambdaLayerECR = new Repository(this, "pylayer");
  }
}
