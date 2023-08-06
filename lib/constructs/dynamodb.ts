// Filename: geojson-dynamodb-stack.ts
import { RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { aws_dynamodb as dynamodb } from "aws-cdk-lib";

export interface DynamoDbStackProps extends StackProps {
  tableName?: string;
  partitionKey?: dynamodb.Attribute;
}

export class DynamoDbStack extends Construct {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: DynamoDbStackProps) {
    super(scope, id);

    // Define the DynamoDB table
    this.table = new dynamodb.Table(this, "OrdersTableStack", {
      tableName: props?.tableName || "OrdersTable",
      partitionKey: props?.partitionKey || {
        name: "filename",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });
  }
}
