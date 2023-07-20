ARG PYLAYER_IMAGE
FROM ${PYLAYER_IMAGE} AS custom_layer
FROM public.ecr.aws/docker/library/python:3.9-alpine AS installer


WORKDIR /pylayer
COPY --from=custom_layer /pylayer/ .
RUN ls -al


FROM public.ecr.aws/docker/library/alpine:latest as public-layer-copy
ARG AWS_DEFAULT_REGION=${AWS_DEFAULT_REGION:-"ap-northeast-1"}
ARG AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID:-""}
ARG AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY:-""}
ARG AWS_SESSION_TOKEN=${AWS_SESSION_TOKEN:-""}

ENV AWS_DEFAULT_REGION=${AWS_DEFAULT_REGION}
ENV AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
ENV AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
ENV AWS_SESSION_TOKEN=${AWS_SESSION_TOKEN}

RUN echo ${AWS_DEFAULT_REGION}
RUN echo ${AWS_ACCESS_KEY_ID}
RUN echo ${AWS_SECRET_ACCESS_KEY}

RUN apk add aws-cli curl unzip

RUN mkdir -p /opt



RUN curl $(aws lambda get-layer-version-by-arn --arn arn:aws:lambda:ap-northeast-1:580247275435:layer:LambdaInsightsExtension:14 --query 'Content.Location' --output text) --output layer.zip
RUN unzip layer.zip -d /opt
RUN rm layer.zip



FROM public.ecr.aws/lambda/python:3.9 AS runtime
WORKDIR /opt
COPY --from=public-layer-copy /opt .


WORKDIR /var/task
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV PIP_ROOT_USER_ACTION=ignore
COPY --from=installer /pylayer/ .
COPY . .
RUN ls -al

RUN pip install --upgrade pip
RUN pip install -r requirements.txt
