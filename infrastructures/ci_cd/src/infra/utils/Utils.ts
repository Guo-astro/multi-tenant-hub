import { Fn, Stack } from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";

export function getSuffixFromStack(stack: Stack) {
  const shortStackId = Fn.select(2, Fn.split("/", stack.stackId));
  const stackSuffix = Fn.select(4, Fn.split("-", shortStackId));
  return stackSuffix;
}
export function genDateSuffix() {
  const exportName = `::${Date.now()}`;
  return exportName;
}

export function createCfnOutputIfNotExists(
  stack: cdk.Stack | Construct,
  output: {
    property?: keyof typeof stack;
    id: string;
    props: cdk.CfnOutputProps;
  }
) {
  const { id, props } = output;
  const exportName = props.exportName;
  if (exportName == null) {
    throw new Error("Export name must be specified");
  }
  // Add timestamp to export name if not already present
  // if (!exportName.includes("::")) {
  //   exportName += `::${new Date().getTime()}`;
  // }
  // stack.exportValue(props.value, { name: `:${exportName}` });

  // if (isResourceAttribute) {
  // }

  // Create or update the CfnOutput
  // // const cfnOutput = new cdk.CfnOutput(stack, id, { ...props, exportName });
  // new StringParameter(stack, `${exportName}SSM`, {
  //   parameterName: exportName,
  //   description: exportName,
  //   stringValue: `${props.value}`,
  // });
  return new cdk.CfnOutput(stack, id, { ...props, exportName });
}
function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
export function generateLogicalId(
  identifier: string,
  tenantCatagory?: string,
  dedupKey?: string
): string {
  if (dedupKey == null) {
    return `${capitalizeFirstLetter(identifier)}`;
  }
  return `${capitalizeFirstLetter(identifier)}${capitalizeFirstLetter(
    dedupKey
  )}`;
}

export function generatePhysicalName(
  identifier: string,
  tenantId: string,
  dedupKey?: string
): string {
  if (dedupKey == null) {
    return `${tenantId}${capitalizeFirstLetter(identifier)}`;
  }
  return `${tenantId}${capitalizeFirstLetter(
    identifier
  )}${capitalizeFirstLetter(dedupKey)}`;
}

export function generateCfnExportName(
  identifier: string,
  tenantId?: string,
  dedupKey?: string
): string {
  return `${identifier}`;
}
