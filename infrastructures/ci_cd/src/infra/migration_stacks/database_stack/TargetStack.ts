import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";

interface TargetStackProps extends cdk.StackProps {
  sourceAccount: string;
}
export class TargetStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: TargetStackProps) {
    super(scope, id, props);

    // Create Bucket that will hold exported data from Source DynamoDB
    const migrationBucket = new s3.Bucket(this, "MigrationBucket", {});

    // Allow source account to list bucket
    migrationBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        principals: [new iam.AccountPrincipal(props.sourceAccount)],
        actions: ["s3:ListBucket"],
        resources: [migrationBucket.bucketArn],
      })
    );

    // Allow source account to write to bucket
    migrationBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        principals: [new iam.AccountPrincipal(props.sourceAccount)],
        actions: ["s3:AbortMultipartUpload", "s3:PutObject", "s3:PutObjectAcl"],
        resources: [migrationBucket.arnForObjects("*")],
      })
    );

    // Role for cross-account access to new DynamoDB table
    const role = new iam.Role(this, "CrossAccountDynamoDBRole", {
      assumedBy: new iam.AccountPrincipal(props.sourceAccount),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonDynamoDBFullAccess"),
      ],
    });

    // Outputs
    new cdk.CfnOutput(this, "MigrationBucketOutput", {
      value: migrationBucket.bucketArn,
    });

    new cdk.CfnOutput(this, "CrossAccountDynamoDBRoleOutput", {
      value: role.roleArn,
    });
  }
}

// const targetAccount = '111111111111';
// const sourceAccount = '222222222222';
// const targetRole = 'ROLE_ARN_FROM_TARGET_STACK_OUTPUT';
// const tableName = 'MyTable'
// const sourceStreamArn = 'YOUR_SOURCE_TABLE_STREAM_ARN'
// new TargetStack(app, 'TargetStack', {
//     env: {
//       account: targetAccount,
//       region: process.env.CDK_DEFAULT_REGION,
//     },
//     sourceAccount,
//   });
// new SourceStack(app, 'SourceStack', {
//     env: {
//       account: sourceAccount,
//       region: process.env.CDK_DEFAULT_REGION,
//     },
//     targetRole,
//     tableName,
//     sourceStreamArn,
//   });
