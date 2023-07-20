import { Construct } from "constructs";
import { S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";
import { SaaSProviderAdminUIDeploymentStackProps } from "shared/prop_extensions.types";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cdk from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as iam from "aws-cdk-lib/aws-iam";

export class SaaSProviderWebHostingStack extends cdk.NestedStack {
  public readonly adminAppBucketName: string;
  public readonly adminAppSiteUrlName: string;
  public readonly onBoardingAppBucketName: string;
  public readonly onBoardingAppSiteUrlName: string;
  public readonly tenantAppBucketName: string;
  public readonly tenantAppSiteUrlName: string;
  public readonly adminDistributionId: string;
  public readonly tenantAppDistributionId: string;
  public readonly onBoardingAppDistributionId: string;

  constructor(
    scope: Construct,
    id: string,
    props: SaaSProviderAdminUIDeploymentStackProps
  ) {
    super(scope, id, props);

    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      "originAccessIdentity",
      {
        comment: "Origin Access Identity for both CloudFront Distributions",
      }
    );
    const { bucket: adminAppBucket, site: adminAppSite } = createAppSite(
      this,
      "adminAppBucketId",
      "adminAppCachePolicyId",
      "adminAppDistributionId",
      originAccessIdentity
    );
    const { bucket: onBoardingAppBucket, site: onBoardingAppSite } =
      createAppSite(
        this,
        "landingAppBucketId",
        "landingAppCachePolicyId",
        "landingAppDistributionId",
        originAccessIdentity
      );
    const { bucket: tenantAppBucket, site: tenantAppSite } = createAppSite(
      this,
      "tenantAppBucketId",
      "tenantAppCachePolicyId",
      "tenantAppDistributionId",
      originAccessIdentity
    );
    this.onBoardingAppBucketName = onBoardingAppBucket.bucketName;
    this.tenantAppBucketName = tenantAppBucket.bucketName;
    this.adminAppBucketName = adminAppBucket.bucketName;

    this.onBoardingAppSiteUrlName = onBoardingAppSite.domainName;
    this.tenantAppSiteUrlName = tenantAppSite.domainName;
    this.adminAppSiteUrlName = adminAppSite.domainName;

    this.onBoardingAppDistributionId = onBoardingAppSite.distributionId;
    this.tenantAppDistributionId = tenantAppSite.distributionId;
    this.adminDistributionId = adminAppSite.distributionId;
  }
}

function createAppSite(
  stack: cdk.Stack,
  bucketId: string,
  cachePolicyId: string,
  distributionId: string,
  originAccessIdentity: cloudfront.OriginAccessIdentity
): { bucket: s3.Bucket; site: cloudfront.Distribution } {
  const appBucket = new s3.Bucket(stack, `${bucketId}`, {
    encryption: s3.BucketEncryption.S3_MANAGED,
    blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    removalPolicy: cdk.RemovalPolicy.DESTROY,
  });

  appBucket.addToResourcePolicy(
    new iam.PolicyStatement({
      actions: ["s3:GetObject"],
      effect: iam.Effect.ALLOW,
      resources: [appBucket.arnForObjects("*")],
      principals: [
        new iam.CanonicalUserPrincipal(
          originAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId
        ),
      ],
    })
  );

  const cachePolicy = new cloudfront.CachePolicy(stack, `${cachePolicyId}`, {
    comment: `${cachePolicyId}`,
    defaultTtl: cdk.Duration.seconds(3600),
    maxTtl: cdk.Duration.seconds(86_400),
    minTtl: cdk.Duration.seconds(60),
    cookieBehavior: cloudfront.CacheCookieBehavior.none(),
    headerBehavior: cloudfront.CacheHeaderBehavior.allowList("X-CustomHeader"),
    queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
    enableAcceptEncodingGzip: true,
    enableAcceptEncodingBrotli: true,
  });

  const appSite = new cloudfront.Distribution(stack, `${distributionId}`, {
    defaultBehavior: {
      origin: new S3Origin(appBucket, { originAccessIdentity }),
      allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
      compress: true,
      cachePolicy,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    },
    defaultRootObject: "index.html",
    enabled: true,
    httpVersion: cloudfront.HttpVersion.HTTP2,
    priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,
    errorResponses: [
      {
        httpStatus: 403,
        responseHttpStatus: 200,
        responsePagePath: "/index.html",
      },
      {
        httpStatus: 404,
        responseHttpStatus: 200,
        responsePagePath: "/index.html",
      },
    ],
  });

  return { bucket: appBucket, site: appSite };
}
// const uiDir = join(
//   __dirname,
//   "..",
//   "..",
//   "..",
//   "..",
//   "..",
//   "apps",
//   "example_trpc_app"
// );
// if (!existsSync(uiDir)) {
//   console.warn("Ui dir not found: " + uiDir);
//   return;
// }
// const execOptions: ExecSyncOptions = { stdio: "inherit" };
//TODO: see issue :https://github.com/aws/aws-cdk/issues/20185
// const bundle = Source.asset(`${uiDir}`, {
//   // Needed to make sure we rebuild when env variables change
//   assetHashType: AssetHashType.OUTPUT,
//   bundling: {
//     command: [
//       "sh",
//       "-c",
//       'echo "Docker build not supported. Please install esbuild."',
//     ],
//     image: DockerImage.fromRegistry("alpine"),
//     local: {
//       tryBundle(outputDir: string) {
//         try {
//           execSync("esbuild --version");
//         } catch {
//           console.log("Esbuild not installed");
//           return false;
//         }
//         execSync(`cd ${uiDir} && pnpm install  && pnpm run build`, {
//           ...execOptions,
//           env: {
//             ...process.env,
//           },
//         });
//         copySync(`${uiDir}/dist`, outputDir, {
//           ...execOptions,
//           recursive: true,
//         });

//         return true;
//       },
//     },
//   },
// });
// new BucketDeployment(this, bucketDeployment, {
//   destinationBucket: deploymentBucket,
//   distributionPaths: ["/*"],
//   distribution: distribution,
//   sources: [bundle],
// });
