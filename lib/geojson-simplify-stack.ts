import * as cdk from "aws-cdk-lib";
import { aws_s3 as s3 } from "aws-cdk-lib";
import { Construct } from "constructs";
import { LambdaStack } from "./constructs/lambda";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import { SqsStack } from "./constructs/sqs";
import { S3Stack } from "./constructs/s3";
import { DynamoDbStack } from "./constructs/dynamodb";
import { APIGWStack } from "./constructs/apigw";
import { aws_dynamodb as dynamodb } from "aws-cdk-lib";
import * as logs from "aws-cdk-lib/aws-logs";
import * as iam from "aws-cdk-lib/aws-iam";
import path = require("path");

export class GeoJsonSimplifyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const sqsStack = new SqsStack(this, "SqsStack", { visibilityTimeout: 400 });
    const s3Stack = new S3Stack(this, "S3Stack");
    const apiGWStack = new APIGWStack(this, "ApiGatewayStack");
    const dynamoDBStack = new DynamoDbStack(this, "DynamoDbStack", {
      tableName: "Orders",
      partitionKey: { name: "filename", type: dynamodb.AttributeType.STRING },
    });

    const lambdaStack = new LambdaStack(this, "LambdaStack", {
      queue: sqsStack.queue,
      lambdaCodePath: path.join(__dirname, "../src"),
      processedBucketName: s3Stack.processedBucket.bucketName,
      originalBucketName: s3Stack.originalBucket.bucketName,
      tableName: dynamoDBStack.table.tableName,
    });

    const role = new iam.Role(this, "ApiGatewayCloudWatchLogsRole", {
      assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com"),
    });

    // Add policies to the Role
    role.addToPolicy(
      new iam.PolicyStatement({
        resources: ["*"],
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams",
          "logs:PutLogEvents",
          "logs:GetLogEvents",
          "logs:FilterLogEvents",
        ],
      }),
    );

    // Specify permissions
    const enqueueLambda = lambdaStack.enqueueLambda;
    const processingLambda = lambdaStack.processingLambda;
    s3Stack.originalBucket.grantWrite(enqueueLambda);
    s3Stack.originalBucket.grantRead(enqueueLambda);
    s3Stack.originalBucket.grantRead(processingLambda);
    s3Stack.processedBucket.grantWrite(processingLambda);

    sqsStack.queue.grantSendMessages(enqueueLambda);
    dynamoDBStack.table.grantReadWriteData(enqueueLambda);
    dynamoDBStack.table.grantReadWriteData(processingLambda);

    // Add methods to resources
    apiGWStack.uploadResource.addMethod(
      "POST",
      new apigw.LambdaIntegration(enqueueLambda),
    );
  }
}
