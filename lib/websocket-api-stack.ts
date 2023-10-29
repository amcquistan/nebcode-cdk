import { Stack, StackProps, Aws, CfnOutput, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { Table, AttributeType, StreamViewType } from "aws-cdk-lib/aws-dynamodb";
import { IStream } from "aws-cdk-lib/aws-kinesis";
import { NodejsFunction, NodejsFunctionProps } from "aws-cdk-lib/aws-lambda-nodejs";
import { StartingPosition, Runtime } from "aws-cdk-lib/aws-lambda";
import { KinesisEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { PolicyStatement, Effect } from "aws-cdk-lib/aws-iam";
import { RetentionDays } from "aws-cdk-lib/aws-logs";

import * as path from "path";

import { WebsocketApi } from "./websocket-api";

export interface WebsocketApiStackProps extends StackProps {
  readonly stageName: string;
  readonly revenueStream: IStream;
}

export class WebsocketApiStack extends Stack {
  readonly websocketApiUrl: string;

  constructor(scope: Construct, id: string, props: WebsocketApiStackProps) {
    super(scope, id, props);

    const connectionsTbl = new Table(this, 'ConnectionsTbl', {
      partitionKey: { name: 'connectionId', type: AttributeType.STRING },
      readCapacity: 2,
      writeCapacity: 1,
      timeToLiveAttribute: "ttl"
    });

    const commonFnProps: NodejsFunctionProps = {
      bundling: { minify: true, sourceMap: true, target: 'es2019' },
      handler: 'handler',
      runtime: Runtime.NODEJS_18_X,
      logRetention: RetentionDays.THREE_DAYS,
      timeout: Duration.seconds(30),
    };

    const connectFn = new NodejsFunction(this, 'ConnectFn', {
      ...commonFnProps,
      entry: path.resolve(__dirname, "websocket-handlers", "connect.ts"),
      environment: {
        CONNECTIONS_TBL: connectionsTbl.tableName
      },
    });

    const disconnectFn = new NodejsFunction(this, 'DisconnectFn', {
      ...commonFnProps,
      entry: path.resolve(__dirname, "websocket-handlers", "disconnect.ts"),
      environment: {
        CONNECTIONS_TBL: connectionsTbl.tableName
      }
    });

    const websocketApi = new WebsocketApi(this, "RevenueWebsocketApi", {
      apiName: "revenue-api",
      apiDescription: "Web Socket API for Revenue",
      stageName: props.stageName,
      connectFn,
      disconnectFn,
      connectionsTbl
    });

    const CONNECTION_URL = `https://${websocketApi.api.ref}.execute-api.${Aws.REGION}.amazonaws.com/${props.stageName}`;
    const broadcastRevenueFn = new NodejsFunction(this, 'broadcastRevenueFn', {
      ...commonFnProps,
      entry: path.resolve(__dirname, "websocket-handlers", "broadcast-revenue.ts"),
      environment: {
        CONNECTION_TBL: connectionsTbl.tableName,
        CONNECTION_URL: CONNECTION_URL
      }
    });

    broadcastRevenueFn.addEventSource(new KinesisEventSource(props.revenueStream, {
      startingPosition: StartingPosition.TRIM_HORIZON
    }));
    broadcastRevenueFn.addToRolePolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [ "execute-api:ManageConnections", "execute-api:Invoke" ],
      resources: [ `arn:aws:execute-api:${Aws.REGION}:${Aws.ACCOUNT_ID}:${websocketApi.api.ref}/*` ]
    }));

    connectionsTbl.grantReadData(broadcastRevenueFn);

    new CfnOutput(this, 'WebsocketConnectionUrl', { value: CONNECTION_URL });

    this.websocketApiUrl = `${websocketApi.api.attrApiEndpoint}/${props.stageName}`
    new CfnOutput(this, "websocketUrl", {
      value: this.websocketApiUrl
    });
  }
}
