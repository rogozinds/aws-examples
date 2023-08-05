// Filename: geojson-sqs-stack.ts
import { Stack, StackProps, Duration } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as sqs from "aws-cdk-lib/aws-sqs";

export interface GeoJsonSqsStackProps extends StackProps {
  visibilityTimeout?: number;
}

export class SqsStack extends Construct {
  public readonly queue: sqs.Queue;

  constructor(scope: Construct, id: string, props?: GeoJsonSqsStackProps) {
    super(scope, id);

    // Define the SQS queue
    this.queue = new sqs.Queue(this, "GeoJsonQueue", {
      visibilityTimeout: Duration.seconds(props?.visibilityTimeout || 300),
    });
  }
}
