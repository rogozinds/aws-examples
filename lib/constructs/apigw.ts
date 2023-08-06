// Filename: geojson-s3-stack.ts
import { RemovalPolicy, Stack, StackProps, aws_logs } from "aws-cdk-lib";
import { aws_s3 as s3 } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import * as logs from "aws-cdk-lib/aws-logs";

export class APIGWStack extends Construct {
  public readonly apiEndpoint: apigw.RestApi;
  public readonly uploadResource: apigw.Resource;
  constructor(scope: Construct, id: string) {
    super(scope, id);
    const logGroup = new logs.LogGroup(this, "ApiGatewayLogs", {
      retention: logs.RetentionDays.ONE_WEEK,
    });
    this.apiEndpoint = new apigw.RestApi(this, "GeoJsonApi", {
      restApiName: "GeoJson Service",
      description: "Service to simplify GeoJson data.",
      deployOptions: {
        stageName: "prod",
        accessLogDestination: new apigw.LogGroupLogDestination(logGroup),
        accessLogFormat: apigw.AccessLogFormat.clf(), // Common Log Format
      },
      cloudWatchRole: true,
    });
    this.uploadResource = this.apiEndpoint.root.addResource("process");
  }
}
