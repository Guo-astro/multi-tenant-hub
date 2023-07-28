import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import type { Construct } from "constructs";
import { aws_cur as cur } from "aws-cdk-lib";
import type { CostAndUsageReportStackProps } from "@/shared/prop_extensions.types";

export class CostAndUsageReportStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: CostAndUsageReportStackProps
  ) {
    super(scope, id, props);
    const reportBucket = props.reportBucket;
    // Create an IAM role for Cost and Usage Report
    const reportRole = new iam.Role(this, "CostAndUsageReportRole", {
      assumedBy: new iam.ServicePrincipal("cur.amazonaws.com"),
    });

    // Attach the necessary IAM policies to the role
    reportRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["s3:PutObject"],
        resources: [`${reportBucket.bucketArn}/*`],
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
    });
  }
}
