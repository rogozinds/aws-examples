import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
} from "@aws-sdk/client-dynamodb";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

// Clients
const s3Client = new S3Client({ region: process.env.AWS_REGION });
const dynamoDbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const sqsClient = new SQSClient({ region: process.env.AWS_REGION });

export const handler = async function (event) {
  let body;
  //Check the body can be parsed
  try {
    body = JSON.parse(event.body);
  } catch (error) {
    return {
      statusCode: 400,
      body: `Bad JSON format. ${error}`,
    };
  }

  const orders = body.orders;
  const bucket_name = body.bucket_name;
  let simplifyCoefficient = body.simplifyCoefficient;

  if (
    typeof simplifyCoefficient !== "number" ||
    simplifyCoefficient < 0 ||
    simplifyCoefficient > 1
  ) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message:
          "Invalid simplifyCoefficient. It should be a number between 0 and 1.",
      }),
    };
  }

  let notProcessed = [];

  for (const order of orders) {
    const filename = order.filename;
    const force = order.force;

    console.log("Bucket name ", bucket_name, "filename - ", filename);
    // Check if the file exists in the S3 bucket
    const headObjectCommand = new HeadObjectCommand({
      Bucket: bucket_name,
      Key: filename,
    });

    try {
      await s3Client.send(headObjectCommand);
    } catch (error) {
      console.log("ERROR READING FROM S3", error);
      notProcessed.push({ filename: filename });
      continue;
    }

    // Check if the filename has been processed in DynamoDB
    const getItemCommand = new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: {
        filename: { S: filename },
      },
    });

    const fileItem = await dynamoDbClient.send(getItemCommand);

    // If the file has been processed and force is not true, skip this order
    if (fileItem.Item && fileItem.Item.status.S === "processed" && !force) {
      notProcessed.push({ filename: filename });
      continue;
    }

    // Add record to DynamoDB
    const putItemCommand = new PutItemCommand({
      TableName: process.env.TABLE_NAME,
      Item: {
        filename: { S: filename },
        status: { S: "processing" },
      },
    });
    await dynamoDbClient.send(putItemCommand);

    // Add message to SQS
    const sendMessageCommand = new SendMessageCommand({
      QueueUrl: process.env.QUEUE_URL,
      MessageBody: JSON.stringify({
        bucket: bucket_name,
        key: filename,
        simplifyCoefficient,
      }), // Send bucket name and file key instead of orderId
    });
    await sqsClient.send(sendMessageCommand);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Orders successfully queued for processing.",
      notProcessed: notProcessed,
    }),
  };
};
