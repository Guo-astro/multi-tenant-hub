import { Metrics } from "@aws-lambda-powertools/metrics";

export const metrics = (namespace: string, serviceName: string) =>
  new Metrics({
    namespace: namespace,
    serviceName: serviceName,
  });
