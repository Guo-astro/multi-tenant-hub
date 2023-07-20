FROM public.ecr.aws/docker/library/python:3.9-alpine AS installer

#Layer Code
COPY . /pylayer/
RUN pip install -r /pylayer/requirements.txt 

FROM scratch AS base


WORKDIR /pylayer
COPY --from=installer /pylayer/ .

