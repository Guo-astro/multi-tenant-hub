import { NestedStack } from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { TenantDataStackProps } from "@/shared/prop_extensions.types";
import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import { generateLogicalId, generatePhysicalName } from "../utils/Utils";
enum TableIdPrefix {
  Product = "Product",
  Order = "Order",
}

interface TableConfig {
  tableIdPrefix: TableIdPrefix;
  partitionKey: dynamodb.Attribute;
  sortKey?: dynamodb.Attribute;
}
export class TenantDataStack extends NestedStack {
  public readonly productTable: dynamodb.Table;
  public readonly orderTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: TenantDataStackProps) {
    super(scope, id, props);

    const tenantIdParameter = props.tenantId;

    const productTableConfig: TableConfig = {
      tableIdPrefix: TableIdPrefix.Product,
      partitionKey: {
        name: "shardId",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "productId",
        type: dynamodb.AttributeType.STRING,
      },
    };

    const orderTableConfig: TableConfig = {
      tableIdPrefix: TableIdPrefix.Order,
      partitionKey: {
        name: "shardId",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "orderId",
        type: dynamodb.AttributeType.STRING,
      },
    };

    this.productTable = this.createTable(productTableConfig, tenantIdParameter);
    this.orderTable = this.createTable(orderTableConfig, tenantIdParameter);
  }

  private createTable(
    tableConfig: TableConfig,
    tenantId: string
  ): dynamodb.Table {
    const { tableIdPrefix, partitionKey, sortKey } = tableConfig;

    const tableName = generatePhysicalName(tableIdPrefix, tenantId);

    const table = new dynamodb.Table(
      this,
      generateLogicalId(tableIdPrefix, tenantId),
      {
        tableName,
        partitionKey,
        sortKey,
        readCapacity: 5,
        writeCapacity: 5,
        removalPolicy: cdk.RemovalPolicy.DESTROY, //TODO: Choose the appropriate removal policy
      }
    );

    return table;
  }
}
