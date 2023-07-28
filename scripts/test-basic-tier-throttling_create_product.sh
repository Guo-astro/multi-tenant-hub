#!/bin/bash
# TODO: doc it. ApigwUrl should be the same as CfnOutput Key not name.
APP_APIGATEWAYURL=$(aws cloudformation describe-stacks --stack-name stack-pooled --query "Stacks[0].Outputs[?OutputKey=='ApigwUrl'].OutputValue" --output text)

create_product() {

  STATUS_CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST $APP_APIGATEWAYURL/product \
  -H 'authority: 88fc1v074i.execute-api.ap-northeast-1.amazonaws.com' \
  -H 'accept: application/json, text/plain, */*' \
  -H 'accept-language: en,ja;q=0.9' \
  -H 'authorization: Bearer eyJraWQiOiJ2dUNnM3dsWVR5cVRaOG9OeWY1Z1BzQjBpWE05dG5KWkRZTG5HWHRFWWE4PSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiIxYmYyNTRkZS1lOGE5LTQwYzktOTdiZS1lYWU5OGU1NmVlNGEiLCJjb2duaXRvOmdyb3VwcyI6WyJhMTQ2YjhiYTJiY2YxMWVlYWE4NmNiOGViYmIyNWYwNyJdLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiaXNzIjoiaHR0cHM6XC9cL2NvZ25pdG8taWRwLmFwLW5vcnRoZWFzdC0xLmFtYXpvbmF3cy5jb21cL2FwLW5vcnRoZWFzdC0xX0lEQXFVMXF5MyIsImNvZ25pdG86dXNlcm5hbWUiOiJ0ZW5hbnQtYWRtaW4tYTE0NmI4YmEyYmNmMTFlZWFhODZjYjhlYmJiMjVmMDciLCJvcmlnaW5fanRpIjoiOGQyY2M2MmMtM2Q1Mi00M2IxLWJiNmEtZGJlYzI3OTQ3N2U0IiwiY3VzdG9tOnRlbmFudElkIjoiYTE0NmI4YmEyYmNmMTFlZWFhODZjYjhlYmJiMjVmMDciLCJhdWQiOiI2MjNrMjkyczJkcWZyaTA2cDF1dXZwdDRvbSIsImV2ZW50X2lkIjoiYmVmNTI1NTktMWViOS00ZDNmLWI5NDUtMDM1ODI4MTNlMzc3IiwiY3VzdG9tOnVzZXJSb2xlIjoiVGVuYW50QWRtaW4iLCJ0b2tlbl91c2UiOiJpZCIsImF1dGhfdGltZSI6MTY5MDM4ODIyMCwiZXhwIjoxNjkwNTA5OTYxLCJpYXQiOjE2OTA1MDYzNjEsImp0aSI6ImEwZGQ3NGVmLWY4NjctNGE1OS05ZmVmLWUyM2E1MzdiYjExMiIsImVtYWlsIjoiZ3VvLnlhbnNvbmcubmd5QGdtYWlsLmNvbSJ9.a5bKMUXYuWhYrfxnC4fostnKqAX3Dx_M6PPhkWU6D_J-1ztQ6b4T3XXiC9ASvFrbTZl3YpfqGkvRE5tkcrCT7HgjifxRFxdmIWoS3TvmThcUY6Nh5aXZPrbAOcGYbEzIeHC8kdVpPjtQ7KS4nGIoACbTRdp9Q1SPO8cHcGDpA7NXEUphdlh1afOaMOSN0kedWcw3mwAZBog2CGCBz__l1KLV7rnsOQQu-Yq52ppsvjYmmd1j4BlahFyzSC5E9LLNXC1BlsnMUkVqAAZ1YGVYpHUZoKsCYnxxQ1qnk4VfFC7YPMsuex0Greex5YH28rSUf67xNp_JGBnLFmSPL-QLFA' \
  -H 'content-type: application/json' \
  -H 'origin: https://d1mri3xf3e3uqm.cloudfront.net' \
  -H 'referer: https://d1mri3xf3e3uqm.cloudfront.net/' \
  -H 'sec-ch-ua: "Not.A/Brand";v="8", "Chromium";v="114", "Google Chrome";v="114"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "macOS"' \
  -H 'sec-fetch-dest: empty' \
  -H 'sec-fetch-mode: cors' \
  -H 'sec-fetch-site: cross-site' \
  -H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36' \
  --data-raw '{"name":"HHJ","price":1200,"sku":"3","category":"category3"}' \
  --compressed)
  echo "STATUS_CODE : $STATUS_CODE";
  
}

for i in $(seq 1 1000)
do
  create_product $i &
done
wait
echo "All done"


# https://catalog.us-east-1.prod.workshops.aws/workshops/b0c6ad36-0a4b-45d8-856b-8a64f0ac76bb/en-US/lab6/74-onboard-basic-tier-



