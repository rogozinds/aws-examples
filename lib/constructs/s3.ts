// Filename: geojson-s3-stack.ts
import { RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { aws_s3 as s3 } from "aws-cdk-lib";
import { Construct } from "constructs";
export class S3Stack extends Construct {
  public readonly originalBucket: s3.Bucket;
  public readonly processedBucket: s3.Bucket;
  constructor(scope: Construct, id: string) {
    super(scope, id);
    this.originalBucket = new s3.Bucket(this, "OriginalBucket", {
      removalPolicy: RemovalPolicy.DESTROY,
    });
    this.processedBucket = new s3.Bucket(this, "ProcessedBucket", {
      removalPolicy: RemovalPolicy.DESTROY,
    });
  }
}
