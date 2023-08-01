import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import type { Construct } from "constructs";
import { aws_cur as cur } from "aws-cdk-lib";
import type { CfnBucket } from "aws-cdk-lib/aws-s3";
import type { CostAndUsageReportStackProps } from "@/shared/prop_extensions.types";

export class CostAndUsageReportStack extends cdk.NestedStack {
  constructor(
    scope: Construct,
    id: string,
    props: CostAndUsageReportStackProps
  ) {
    super(scope, id, props);
    const reportBucket = props.reportBucket;

    reportBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        resources: [reportBucket.arnForObjects("*"), reportBucket.bucketArn],
        actions: [
          "s3:GetBucketAcl",
          "s3:GetBucketPolicy",
          "s3:PutObject",
          "s3:GetObject",
        ],
        principals: [
          new iam.ServicePrincipal("billingreports.amazonaws.com"),
          new iam.AccountPrincipal(this.account),
        ],
      })
    );

    // Enable Cost and Usage Report
    // eslint-disable-next-line no-new
    new cur.CfnReportDefinition(this, "CostAndUsageReport", {
      reportName: "CostAndUsageReport",
      timeUnit: "HOURLY", // Can be 'HOURLY' or 'DAILY'
      format: "Parquet", // Can be 'Parquet' or 'CSV'
      s3Bucket: reportBucket.bucketName,
      s3Prefix: "curoutput/",
      s3Region: cdk.Aws.REGION,
      compression: "GZIP", // Can be 'ZIP' or 'GZIP'
      refreshClosedReports: true, // Set to true to refresh closed reports
      reportVersioning: "CREATE_NEW_REPORT", // Can be 'CREATE_NEW_REPORT' or 'OVERWRITE_REPORT'
    }).addDependsOn(reportBucket.node.defaultChild as CfnBucket);
  }
}
