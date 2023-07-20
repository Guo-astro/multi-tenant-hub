# MultiTenantHub
[Achieving Operational Success of SaaS Solutions](https://aws.amazon.com/blogs/apn/achieving-operational-success-of-saas-solutions/)
## Cheat Commands

- `pnpx cdk init --language typescript`
- `pnpm up -r --workspace`
- ` brew install aws/tap/aws-sam-cli`
- `sam local start-lambda -t ./cdk.out/SaasProviderStack.template.json`
- `sam local invoke DynamoLambdaHandlerFB6EB814 --no-event -t ./cdk.out/SaasProviderStack.template.json`
- `pnpx aws-sdk-js-codemod -t v2-to-v3 infrastructures/saas_provider/src/services/index.ts`

```export ACCOUNT_ID=$(aws sts get-caller-identity --output text --query Account) | echo $ACCOUNT_ID
npx cdk bootstrap \
  --cloudformation-execution-policies arn\:aws\:iam::aws\:policy/AdministratorAccess \
  aws://$ACCOUNT_ID/us-east-1 \
  aws://$ACCOUNT_ID/us-east-2
```

## Migration

- Cognito: https://github.com/Collaborne/migrate-cognito-user-pool-lambda/blob/master/README.md
  https://cloudar.be/awsblog/options-for-migrating-between-amazon-cognito-user-pools/

## TroubleShooting

- CloudFormation cannot update a stack when a custom-named resource requires replacing.
  - https://repost.aws/knowledge-center/cloudformation-custom-name
- [CI/CD on AWS Workshop](https://catalog.workshops.aws/cicdonaws/en-US/lab03/5-build-push-container)
- [Pass vars between stage](https://repost.aws/questions/QUFA_N57ZSQQSKHg6sXUW-yQ/cdk-pipeline-best-way-to-share-parameters-cross-stage-same-account)
  docker run -p 9000:8080 589767107094.dkr.ecr.ap-northeast-1.amazonaws.com/cicdstack-multitenanthublambda2d3d098d-odrgmwvoxwrx:latest
- [EXPORT_NAME cannot be updated as it is in use by STACK_NAME](https://www.endoflineblog.com/cdk-tips-03-how-to-unblock-cross-stack-references)
- [SSM](https://aws.amazon.com/blogs/infrastructure-and-automation/read-parameters-across-aws-regions-with-aws-cloudformation-custom-resources/)
- [CrHelper](https://aws.amazon.com/blogs/infrastructure-and-automation/aws-cloudformation-custom-resource-creation-with-python-aws-lambda-and-crhelper/)

## States

- Stack update in progress will fail the infraDeployment mainly by previous deployment. -> retry button or wait for 20 mins

## Steps

1. Set up secret manager for PAT token (Feature: use conection)
2. Delete all webhook generated from github to prevent push trigger for tenant pipeline(if you are not using connection)
