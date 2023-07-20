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