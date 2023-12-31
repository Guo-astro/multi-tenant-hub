# Authenticate your Docker client to the ECR registry
aws ecr get-login-password --region ap-northeast-1 | docker login --username AWS --password-stdin 589767107094.dkr.ecr.ap-northeast-1.amazonaws.com

# Pull the image from the ECR repository
docker pull 589767107094.dkr.ecr.ap-northeast-1.amazonaws.com/cicdstack-multitenanthublambda2d3d098d-odrgmwvoxwrx:latest 
docker run -p 9000:8080 589767107094.dkr.ecr.ap-northeast-1.amazonaws.com/cicdstack-multitenanthublambda2d3d098d-odrgmwvoxwrx:latest tenant-management.load_tenant_config
curl -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" -d '{}'


docker pull  589767107094.dkr.ecr.ap-northeast-1.amazonaws.com/cicdstack-multitenanthublambda2d3d098d-xkbpgd44erlf:latest 
docker run -p 9000:8080 589767107094.dkr.ecr.ap-northeast-1.amazonaws.com/cicdstack-multitenanthublambda2d3d098d-xkbpgd44erlf:latest tenant-management.get_tenants
docker history  589767107094.dkr.ecr.ap-northeast-1.amazonaws.com/cicdstack-pylayerf380e2f1-sazbbgthuf7x:latest 
docker history  589767107094.dkr.ecr.ap-northeast-1.amazonaws.com/cicdstack-multitenanthublambda2d3d098d-odrgmwvoxwrx:latest 



aws cloudformation list-exports
aws cloudformation list-imports --export-name EXPORT_NAME

curl 'https://lgimm0nahb.execute-api.ap-northeast-1.amazonaws.com/prod/tenants' \
  -X 'OPTIONS' \
  -H 'authority: lgimm0nahb.execute-api.ap-northeast-1.amazonaws.com' \
  -H 'accept: */*' \
  -H 'accept-language: en,ja;q=0.9' \
  -H 'access-control-request-headers: authorization' \
  -H 'access-control-request-method: GET' \
  -H 'origin: https://d3spcy3jop1lht.cloudfront.net' \
  -H 'referer: https://d3spcy3jop1lht.cloudfront.net/' \
  -H 'sec-fetch-dest: empty' \
  -H 'sec-fetch-mode: cors' \
  -H 'sec-fetch-site: cross-site' \
  -H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36' \
  --compressed ;


  fetch("https://r34ktvtpai.execute-api.ap-northeast-1.amazonaws.com/development/products", {
  "headers": {
    "accept": "*/*",
    "accept-language": "en,ja;q=0.9",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "cross-site"
  },
  "referrer": "https://d3dfzhe57fw4yo.cloudfront.net/",
  "referrerPolicy": "strict-origin-when-cross-origin",
  "body": null,
  "method": "OPTIONS",
  "mode": "cors",
  "credentials": "omit"
});

curl 'https://r34ktvtpai.execute-api.ap-northeast-1.amazonaws.com/development/products' \
  -H 'authority: r34ktvtpai.execute-api.ap-northeast-1.amazonaws.com' \
  -H 'accept: application/json, text/plain, */*' \
  -H 'accept-language: en,ja;q=0.9' \
  -H 'authorization:
Bearer eyJraWQiOiJIRlFrMkV4U1gxTVwvZ1pJZ1ZZMGcwdTY2T04xMGFJcmtNeEFSWmd2RmJVQT0iLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxNzU0YWE2OC1kMDQxLTcwMzQtYWE0Ny0zZTNlNWUyN2JjNjQiLCJjb2duaXRvOmdyb3VwcyI6WyJkMmJkMTY2YjJiMDgxMWVlYWNjNGJkMmU1NjQzZThjNSJdLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiaXNzIjoiaHR0cHM6XC9cL2NvZ25pdG8taWRwLmFwLW5vcnRoZWFzdC0xLmFtYXpvbmF3cy5jb21cL2FwLW5vcnRoZWFzdC0xX2RWSFRpSFBldyIsImNvZ25pdG86dXNlcm5hbWUiOiJ0ZW5hbnQtYWRtaW4tZDJiZDE2NmIyYjA4MTFlZWFjYzRiZDJlNTY0M2U4YzUiLCJvcmlnaW5fanRpIjoiMGYwOTRkZjktZjY4YS00NmQ4LWJiYTctOTRhNmEwY2E2NTk1IiwiY3VzdG9tOnRlbmFudElkIjoiZDJiZDE2NmIyYjA4MTFlZWFjYzRiZDJlNTY0M2U4YzUiLCJhdWQiOiIydWlzaDczb24wcmEzbHB2OGFsZmg5dWdrbCIsImV2ZW50X2lkIjoiMjMwMTUwYzAtOGFhMy00MWZiLWI3MGItYTUxZDcxNjgyMDgyIiwiY3VzdG9tOnVzZXJSb2xlIjoiVGVuYW50QWRtaW4iLCJ0b2tlbl91c2UiOiJpZCIsImF1dGhfdGltZSI6MTY5MDMxNTk3OSwiZXhwIjoxNjkwMzI0NDI0LCJpYXQiOjE2OTAzMjA4MjQsImp0aSI6IjZhOGZhODc3LTkxMDgtNDExMS04MDE5LWZhOGRmNDQ0ZDlkZiIsImVtYWlsIjoiZ3VvLnlhbnNvbmcubmd5QGdtYWlsLmNvbSJ9.eqLIkPXRoiwwPsei0cVUHgKbWCvKZHpfiDsgnah6vExWKRvBSvpK_tdQ4NOGVsqon4fnNVHnmRCR6LQ5ft8bfXC2qVnWba4gtUNoLDP_qHsgktz-JF8Q1PVpRrdiyuOjLd8ZUwRB7VLWPDzgd0PtIjTdgbeDnKP5faeRKPX5D3SlyPtJGYPmsmbYQ-Z-OUlhTcqlb4FMoS-U1acc7acVQiSyTe01ehTp5CuFN3k1p5_NzDndHxu7BAN_uNvDXkT9nffjb32zaHf5CugAt6-6GgWznrr0dUow_MDrEAA98dcDeX4nnR4a0SAS0Sg_CcEEYOB9IVGDSJ4M8MyWFK_fiw
  ' \
  -H 'origin: https://d3dfzhe57fw4yo.cloudfront.net' \
  -H 'referer: https://d3dfzhe57fw4yo.cloudfront.net/' \
  -H 'sec-ch-ua: "Not.A/Brand";v="8", "Chromium";v="114", "Google Chrome";v="114"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "macOS"' \
  -H 'sec-fetch-dest: empty' \
  -H 'sec-fetch-mode: cors' \
  -H 'sec-fetch-site: cross-site' \
  -H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36' \
  --compressed





  curl 'https://88fc1v074i.execute-api.ap-northeast-1.amazonaws.com/development/product' \
  -H 'authority: 88fc1v074i.execute-api.ap-northeast-1.amazonaws.com' \
  -H 'accept: application/json, text/plain, */*' \
  -H 'accept-language: en,ja;q=0.9' \
  -H 'authorization: Bearer 
  eyJraWQiOiJ2dUNnM3dsWVR5cVRaOG9OeWY1Z1BzQjBpWE05dG5KWkRZTG5HWHRFWWE4PSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiIxYmYyNTRkZS1lOGE5LTQwYzktOTdiZS1lYWU5OGU1NmVlNGEiLCJjb2duaXRvOmdyb3VwcyI6WyJhMTQ2YjhiYTJiY2YxMWVlYWE4NmNiOGViYmIyNWYwNyJdLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiaXNzIjoiaHR0cHM6XC9cL2NvZ25pdG8taWRwLmFwLW5vcnRoZWFzdC0xLmFtYXpvbmF3cy5jb21cL2FwLW5vcnRoZWFzdC0xX0lEQXFVMXF5MyIsImNvZ25pdG86dXNlcm5hbWUiOiJ0ZW5hbnQtYWRtaW4tYTE0NmI4YmEyYmNmMTFlZWFhODZjYjhlYmJiMjVmMDciLCJvcmlnaW5fanRpIjoiOGQyY2M2MmMtM2Q1Mi00M2IxLWJiNmEtZGJlYzI3OTQ3N2U0IiwiY3VzdG9tOnRlbmFudElkIjoiYTE0NmI4YmEyYmNmMTFlZWFhODZjYjhlYmJiMjVmMDciLCJhdWQiOiI2MjNrMjkyczJkcWZyaTA2cDF1dXZwdDRvbSIsImV2ZW50X2lkIjoiYmVmNTI1NTktMWViOS00ZDNmLWI5NDUtMDM1ODI4MTNlMzc3IiwiY3VzdG9tOnVzZXJSb2xlIjoiVGVuYW50QWRtaW4iLCJ0b2tlbl91c2UiOiJpZCIsImF1dGhfdGltZSI6MTY5MDM4ODIyMCwiZXhwIjoxNjkwNTA5OTYxLCJpYXQiOjE2OTA1MDYzNjEsImp0aSI6ImEwZGQ3NGVmLWY4NjctNGE1OS05ZmVmLWUyM2E1MzdiYjExMiIsImVtYWlsIjoiZ3VvLnlhbnNvbmcubmd5QGdtYWlsLmNvbSJ9.a5bKMUXYuWhYrfxnC4fostnKqAX3Dx_M6PPhkWU6D_J-1ztQ6b4T3XXiC9ASvFrbTZl3YpfqGkvRE5tkcrCT7HgjifxRFxdmIWoS3TvmThcUY6Nh5aXZPrbAOcGYbEzIeHC8kdVpPjtQ7KS4nGIoACbTRdp9Q1SPO8cHcGDpA7NXEUphdlh1afOaMOSN0kedWcw3mwAZBog2CGCBz__l1KLV7rnsOQQu-Yq52ppsvjYmmd1j4BlahFyzSC5E9LLNXC1BlsnMUkVqAAZ1YGVYpHUZoKsCYnxxQ1qnk4VfFC7YPMsuex0Greex5YH28rSUf67xNp_JGBnLFmSPL-QLFA
  ' \
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
  --compressed