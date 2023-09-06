import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";

export class MonorepoTriggerStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a Lambda function
    const lambdaFunction = new lambda.Function(this, "MyLambdaFunction", {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset("lambda"), // Put your Lambda code in a 'lambda' directory
    });

    // Create an API Gateway
    const api = new apigateway.RestApi(this, "MyApi", {
      deployOptions: {
        stageName: "prod", // You can change this to any desired stage name
      },
    });

    // Define an API Gateway resource and HTTP method
    const resource = api.root.addResource("myresource");
    const integration = new apigateway.LambdaIntegration(lambdaFunction);
    resource.addMethod("GET", integration);
  }
}

const app = new cdk.App();
new LambdaApiStack(app, "LambdaApiStack");
