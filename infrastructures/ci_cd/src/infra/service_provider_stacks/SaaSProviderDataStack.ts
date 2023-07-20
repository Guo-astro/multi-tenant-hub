import { NestedStack } from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { DataStackProps } from "shared/prop_extensions.types";
import { Construct } from "constructs";
import { createCfnOutputIfNotExists } from "../utils/Utils";

enum TableIdPrefix {
  ServerlessSaaSSettings = "ServerlessSaaS-Settings",
  ServerlessSaaSTenantStackMapping = "ServerlessSaaS-TenantStackMapping",
  ServerlessSaaSTenantDetails = "ServerlessSaaS-TenantDetails",
  ServerlessSaaSTenantUserMapping = "ServerlessSaaS-TenantUserMapping",
}

interface TableConfig {
  tableIdPrefix: TableIdPrefix;
  partitionKey: dynamodb.Attribute;
  sortKey?: dynamodb.Attribute;
  gsiConfig?: dynamodb.GlobalSecondaryIndexProps;
}

const tableConfigs: TableConfig[] = [
  {
    tableIdPrefix: TableIdPrefix.ServerlessSaaSSettings,
    partitionKey: {
      name: "settingName",
      type: dynamodb.AttributeType.STRING,
    },
  },
  {
    tableIdPrefix: TableIdPrefix.ServerlessSaaSTenantStackMapping,
    partitionKey: {
      name: "tenantId",
      type: dynamodb.AttributeType.STRING,
    },
  },
  {
    tableIdPrefix: TableIdPrefix.ServerlessSaaSTenantDetails,
    partitionKey: {
      name: "tenantId",
      type: dynamodb.AttributeType.STRING,
    },

    gsiConfig: {
      indexName: "ServerlessSaas-TenantConfig",
      partitionKey: {
        name: "tenantName",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.INCLUDE,
      nonKeyAttributes: ["userPoolId", "appClientId", "apiGatewayUrl"],
    },
  },
  {
    tableIdPrefix: TableIdPrefix.ServerlessSaaSTenantUserMapping,
    partitionKey: {
      name: "tenantId",
      type: dynamodb.AttributeType.STRING,
    },
    sortKey: {
      name: "userName",
      type: dynamodb.AttributeType.STRING,
    },
    gsiConfig: {
      indexName: "UserName",
      partitionKey: {
        name: "userName",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "tenantId",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    },
  },
];

export class SaaSProviderDataStack extends NestedStack {
  public readonly serverlessSaaSSettingsTableArn: string;
  public readonly serverlessSaaSSettingsTableName: string;
  public readonly tenantStackMappingTableArn: string;
  public readonly tenantStackMappingTableName: string;
  public readonly tenantDetailsTableArn: string;
  public readonly tenantDetailsTableIndexArn: string;

  public readonly tenantDetailsTableName: string;
  public readonly tenantUserMappingTableArn: string;
  public readonly tenantUserMappingTableIndexArn: string;

  public readonly tenantUserMappingTableName: string;

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);

    const outputMapping: {
      [K in TableIdPrefix]: { arnOutput: string; nameOutput: string };
    } = {} as any;

    for (const config of tableConfigs) {
      const tableIdPrefix = config.tableIdPrefix;

      const table = this.createTable(config);

      outputMapping[tableIdPrefix] = {
        arnOutput: table.tableArn,
        nameOutput: table.tableName,
      };
    }

    this.serverlessSaaSSettingsTableArn =
      outputMapping[TableIdPrefix.ServerlessSaaSSettings].arnOutput;
    this.serverlessSaaSSettingsTableName =
      outputMapping[TableIdPrefix.ServerlessSaaSSettings].nameOutput;
    this.tenantStackMappingTableArn =
      outputMapping[TableIdPrefix.ServerlessSaaSTenantStackMapping].arnOutput;
    this.tenantStackMappingTableName =
      outputMapping[TableIdPrefix.ServerlessSaaSTenantStackMapping].nameOutput;
    this.tenantDetailsTableArn =
      outputMapping[TableIdPrefix.ServerlessSaaSTenantDetails].arnOutput;
    this.tenantDetailsTableName =
      outputMapping[TableIdPrefix.ServerlessSaaSTenantDetails].nameOutput;
    this.tenantUserMappingTableArn =
      outputMapping[TableIdPrefix.ServerlessSaaSTenantUserMapping].arnOutput;
    this.tenantUserMappingTableName =
      outputMapping[TableIdPrefix.ServerlessSaaSTenantUserMapping].nameOutput;
    this.tenantDetailsTableIndexArn = `${this.tenantDetailsTableArn}/index/*`;
    this.tenantUserMappingTableIndexArn = `${this.tenantUserMappingTableArn}/index/*`;
    createCfnOutputIfNotExists(this, {
      id: "serverlessSaaSSettingsTableArn",
      props: {
        value: this.serverlessSaaSSettingsTableArn,
        exportName: "serverlessSaaSSettingsTableArn",
      },
    });

    createCfnOutputIfNotExists(this, {
      id: "serverlessSaaSSettingsTableName",
      props: {
        value: this.serverlessSaaSSettingsTableName,
        exportName: "serverlessSaaSSettingsTableName",
      },
    });

    createCfnOutputIfNotExists(this, {
      id: "tenantStackMappingTableArn",
      props: {
        value: this.tenantStackMappingTableArn,
        exportName: "tenantStackMappingTableArn",
      },
    });

    createCfnOutputIfNotExists(this, {
      id: "tenantStackMappingTableName",
      props: {
        value: this.tenantStackMappingTableName,
        exportName: "tenantStackMappingTableName",
      },
    });

    createCfnOutputIfNotExists(this, {
      id: "tenantDetailsTableArn",
      props: {
        value: this.tenantDetailsTableArn,
        exportName: "tenantDetailsTableArn",
      },
    });

    createCfnOutputIfNotExists(this, {
      id: "tenantDetailsTableName",
      props: {
        value: this.tenantDetailsTableName,
        exportName: "tenantDetailsTableName",
      },
    });

    createCfnOutputIfNotExists(this, {
      id: "tenantUserMappingTableArn",
      props: {
        value: this.tenantUserMappingTableArn,
        exportName: "tenantUserMappingTableArn",
      },
    });

    createCfnOutputIfNotExists(this, {
      id: "tenantUserMappingTableName",
      props: {
        value: this.tenantUserMappingTableName,
        exportName: "tenantUserMappingTableName",
      },
    });
  }

  private createTable(tableConfig: TableConfig): dynamodb.Table {
    const { tableIdPrefix, partitionKey, sortKey, gsiConfig } = tableConfig;

    const table = new dynamodb.Table(this, `${tableIdPrefix}Table`, {
      partitionKey,
      sortKey,
      readCapacity: 5,
      writeCapacity: 5,
    });

    if (gsiConfig) {
      table.addGlobalSecondaryIndex(gsiConfig);
    }

    return table;
  }
}
