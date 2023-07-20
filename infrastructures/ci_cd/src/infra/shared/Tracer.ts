import { Tracer } from "@aws-lambda-powertools/tracer";

export const tracer = (name: string) =>
  new Tracer({
    serviceName: name,
  });
