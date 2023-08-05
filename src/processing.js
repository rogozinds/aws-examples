import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import * as mapshaper from "mapshaper";
import * as fs from "fs";

// Clients
const s3Client = new S3Client({ region: process.env.AWS_REGION });
const dynamoDbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
//CONST
const SIMPLIFY_COEF = 0.04;

const simplifyGeoJSON = async (geoJsonData, simplifyCoef) => {
  const ALG = "visvalingam";

  let command = `-i input.geojson snap -simplify ${ALG} ${simplifyCoef}
            -filter-islands min-area=1km2 
            -o output.geojson format=geojson;
            `;
  const input = {
    "input.geojson": geoJsonData,
  };
  try {
    const output = await mapshaper.default.applyCommands(command, input);
    return JSON.parse(output["output.geojson"]);
  } catch (error) {
    console.error(
      "Something went wrong when simplifying the GeoJSON data",
      error,
    );
    throw error;
  }
};

export const handler = async function (event) {
  const order = JSON.parse(event.Records[0].body);
  const filename = order.key; // filename from SQS message
  const original_bucket_name = order.bucket; // bucket name from SQS message
  let simplifyCoefficient = order.simplifyCoefficient || SIMPLIFY_COEF;

  console.log("Original Bucket name", original_bucket_name);
  console.log(
    "Processing Bucket name",
    process.env.PROCESSED_BUCKET || "processed-bucket-f32341-1",
  );
  console.log("Filename", filename);
  // Get original geojson from S3
  const getObjectCommand = new GetObjectCommand({
    Bucket: original_bucket_name,
    Key: filename,
  });
  const response = await s3Client.send(getObjectCommand);

  let data = "";
  if (response.Body) {
    for await (const chunk of response.Body) {
      data += chunk;
    }
  }

  console.log("Original GeoJSON is copied from S3 and stored in memory.");
  let processedGeoJson = null;
  console.log("Starting simplification.");
  try {
    processedGeoJson = await simplifyGeoJSON(
      data.toString(),
      simplifyCoefficient,
    );
  } catch (e) {
    console.log("Error during processing", e);
  }
  console.log(
    `Data was processed. And stored in ${process.env.BUCKET_NAME_PROCESSED}`,
  );
  // Store processed geojson in S3
  const putObjectCommand = new PutObjectCommand({
    Bucket: process.env.BUCKET_NAME_PROCESSED,
    Key: filename,
    Body: JSON.stringify(processedGeoJson),
  });
  await s3Client.send(putObjectCommand);

  console.log("Saving information about status to Dynamo DB.");
  // Update record in DynamoDB
  const updateItemCommand = new UpdateItemCommand({
    TableName: process.env.TABLE_NAME,
    Key: { filename: { S: filename } },
    UpdateExpression: "set #s = :s",
    ExpressionAttributeNames: {
      "#s": "status",
    },
    ExpressionAttributeValues: {
      ":s": { S: "processed" },
    },
  });
  await dynamoDbClient.send(updateItemCommand);

  return {
    statusCode: 200,
    body: "GeoJson processing completed and result saved.",
  };
};
