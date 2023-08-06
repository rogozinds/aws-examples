// Filename: geojson-lambda-stack.ts
import { Stack, StackProps, Duration } from "aws-cdk-lib";
import { aws_lambda_event_sources as lambdaEventSources } from "aws-cdk-lib";

import { aws_lambda as lambda } from "aws-cdk-lib";
import { aws_sqs as sqs } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3/lib";
import { Construct } from "constructs";

export interface GeoJsonLambdaStackProps extends StackProps {
  queue: sqs.Queue;
  lambdaCodePath: string;
  originalBucketName: string;
  processedBucketName: string;
  tableName: string;
}

export class LambdaStack extends Construct {
  public readonly enqueueLambda: lambda.Function;
  public readonly processingLambda: lambda.Function;
  constructor(scope: Construct, id: string, props: GeoJsonLambdaStackProps) {
    super(scope, id);
    // Define the Lambda function for enqueueing the tasks
    this.enqueueLambda = new lambda.Function(this, "EnqueueLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset(props.lambdaCodePath),
      handler: "enqueue.handler",
      environment: {
        BUCKET_NAME_ORIGINAL: props.originalBucketName,
        BUCKET_NAME_PROCESSED: props.processedBucketName,
        TABLE_NAME: props.tableName,
        QUEUE_URL: props.queue.queueUrl,
      },
    });
    // Define the Lambda function for processing the tasks
    this.processingLambda = new lambda.Function(this, "ProcessingLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset(props.lambdaCodePath),
      memorySize: 2048,
      handler: "processing.handler",
      timeout: Duration.seconds(100), // Setting the timeout to 5 minutes
      environment: {
        BUCKET_NAME_ORIGINAL: props.originalBucketName,
        BUCKET_NAME_PROCESSED: props.processedBucketName,
        TABLE_NAME: props.tableName,
        // AWS_REGION: this.region // This will be the region where you're deploying your stack
      },
      events: [
        new lambdaEventSources.SqsEventSource(props.queue, {
          batchSize: 10, // Adjust based on your needs
        }),
      ],
    });
  }
}
