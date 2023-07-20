import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

export class CdkWafv2Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Define Variable
    const Prefix = "devio";
    const Env = "develop";
    const Scope = "REGIONAL";
    const WebAclAssociationResourceArn =
      "arn:aws:elasticloadbalancing:ap-northeast-1:123456789012:loadbalancer/app/devio-stg-alb/xxxxxxxxxxxxxx";

    // Define Resource Name
    const WebAclName = Env + "-" + Prefix + "-web-acl";
    const S3ForWaflogName =
      "aws-waf-logs-" + Env + "-" + Prefix + "-" + cdk.Stack.of(this).account;
    const S3ForAthenaQuery =
      "athena-query-results-" +
      Env +
      "-" +
      Prefix +
      "-" +
      cdk.Stack.of(this).account;

    // S3 Config (Restricted Public Access)
    const public_access_block_config: cdk.aws_s3.CfnBucket.PublicAccessBlockConfigurationProperty =
      {
        blockPublicAcls: true,
        blockPublicPolicy: true,
        ignorePublicAcls: true,
        restrictPublicBuckets: true,
      };

    // S3
    const cfnS3ForWaflog = new cdk.aws_s3.CfnBucket(
      this,
      "S3BucketForWaflogConfig",
      {
        bucketName: S3ForWaflogName,
        publicAccessBlockConfiguration: public_access_block_config,
      }
    );
    const cfnS3ForAthenaQuery = new cdk.aws_s3.CfnBucket(
      this,
      "S3BucketForAthenaQueryConfig",
      {
        bucketName: S3ForAthenaQuery,
        publicAccessBlockConfiguration: public_access_block_config,
      }
    );

    // WAF
    const cfnWebACL = new cdk.aws_wafv2.CfnWebACL(this, WebAclName, {
      defaultAction: {
        allow: {},
      },
      scope: Scope,
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: WebAclName,
        sampledRequestsEnabled: true,
      },
      name: WebAclName,
      rules: [
        {
          name: "AWS-AWSManagedRulesCommonRuleSet",
          priority: 0,
          statement: {
            managedRuleGroupStatement: {
              name: "AWSManagedRulesCommonRuleSet",
              vendorName: "AWS",
              excludedRules: [
                { name: "SizeRestrictions_BODY" },
                { name: "NoUserAgent_HEADER" },
                { name: "UserAgent_BadBots_HEADER" },
                { name: "SizeRestrictions_QUERYSTRING" },
                { name: "SizeRestrictions_Cookie_HEADER" },
                { name: "SizeRestrictions_BODY" },
                { name: "SizeRestrictions_URIPATH" },
                { name: "EC2MetaDataSSRF_BODY" },
                { name: "EC2MetaDataSSRF_COOKIE" },
                { name: "EC2MetaDataSSRF_URIPATH" },
                { name: "EC2MetaDataSSRF_QUERYARGUMENTS" },
                { name: "GenericLFI_QUERYARGUMENTS" },
                { name: "GenericLFI_URIPATH" },
                { name: "GenericLFI_BODY" },
                { name: "RestrictedExtensions_URIPATH" },
                { name: "RestrictedExtensions_QUERYARGUMENTS" },
                { name: "GenericRFI_QUERYARGUMENTS" },
                { name: "GenericRFI_BODY" },
                { name: "GenericRFI_URIPATH" },
                { name: "CrossSiteScripting_COOKIE" },
                { name: "CrossSiteScripting_QUERYARGUMENTS" },
                { name: "CrossSiteScripting_BODY" },
                { name: "CrossSiteScripting_URIPATH" },
              ],
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: "AWS-AWSManagedRulesCommonRuleSet",
            sampledRequestsEnabled: true,
          },
          overrideAction: {
            none: {},
          },
        },
      ],
    });

    // Resource Associations
    const webAclAssociation = new cdk.aws_wafv2.CfnWebACLAssociation(
      this,
      "webAclAssociation",
      {
        resourceArn: WebAclAssociationResourceArn,
        webAclArn: cfnWebACL.attrArn,
      }
    );
    webAclAssociation.addDependsOn(cfnWebACL);

    // Export WAF logs to S3
    const cfnLoggingConfiguration = new cdk.aws_wafv2.CfnLoggingConfiguration(
      this,
      "CfnLoggingConfiguration",
      {
        logDestinationConfigs: [cfnS3ForWaflog.attrArn],
        resourceArn: cfnWebACL.attrArn,
      }
    );
  }
}
