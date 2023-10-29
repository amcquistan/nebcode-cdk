import { Stack, StackProps, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as kinesis from "aws-cdk-lib/aws-kinesis";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambda_node from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda_src from "aws-cdk-lib/aws-lambda-event-sources";
import * as logs from "aws-cdk-lib/aws-logs";

import * as path from "path";

export interface DataProcessorProps extends StackProps {
  readonly inputStream: kinesis.IStream;
}

export class DataProcessorStack extends Stack {
  readonly revenueStream: kinesis.IStream;

  constructor(scope: Construct, id: string, props: DataProcessorProps) {
    super(scope, id, props);

    this.revenueStream = new kinesis.Stream(this, "RevenueStream");

    const fn = new lambda_node.NodejsFunction(this, "StreamProcessor", {
      bundling: { minify: true, sourceMap: true, target: "es2019" },
      entry: path.resolve(__dirname, "streamprocessor", "handler.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_18_X,
      logRetention: logs.RetentionDays.THREE_DAYS,
      environment: {
        ["OUTPUT_STREAM"]: this.revenueStream.streamName
      }
    });

    this.revenueStream.grantWrite(fn);

    fn.addEventSource(new lambda_src.KinesisEventSource(props.inputStream, {
      startingPosition: lambda.StartingPosition.LATEST,
      tumblingWindow: Duration.seconds(30)
    }));
  }
}
