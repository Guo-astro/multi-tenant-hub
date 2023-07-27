#!/bin/bash
# TODO: doc it. ApigwUrl should be the same as CfnOutput Key not name.
APP_APIGATEWAYURL=$(aws cloudformation describe-stacks --stack-name stack-pooled --query "Stacks[0].Outputs[?OutputKey=='ApigwUrl'].OutputValue" --output text)

get_product() {
   
  STATUS_CODE=$(curl -s -o /dev/null -w '%{http_code}' -X GET -H "Authorization: Bearer $1" -H "Content-Type: application/json" $APP_APIGATEWAYURL/products)
  
  echo "STATUS_CODE : $STATUS_CODE";
  
}

for i in $(seq 1 1000)
do
  get_product $1 $i &
done
wait
echo "All done"


# https://catalog.us-east-1.prod.workshops.aws/workshops/b0c6ad36-0a4b-45d8-856b-8a64f0ac76bb/en-US/lab6/74-onboard-basic-tier-



