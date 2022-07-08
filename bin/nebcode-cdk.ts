#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SalesDataGenStack } from '../lib/sales-datagen-stack';
import { DataProcessorStack } from "../lib/data-processor-stack";
import { WebsocketApiStack } from "../lib/websocket-api-stack";
import { DashboardStack } from "../lib/dashboard-stack";

const app = new cdk.App();

const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION };

const dataGenStack = new SalesDataGenStack(app, "sales-datagen-stack", {
  env,
  stackName: "sales-datagen-stack"
});

const dataProcessorStack = new DataProcessorStack(app, "data-processor-stack", {
  env,
  stackName: "data-processor-stack",
  inputStream: dataGenStack.kinesisStream
});

const websocketApiStack = new WebsocketApiStack(app, "websocket-revenue-api", {
  env,
  stackName: "websocket-revenue-api",
  revenueStream: dataProcessorStack.revenueStream,
  stageName: "v1"
});

new DashboardStack(app, "dashboard-stack", {
  env,
  stackName: "dashboard-stack",
  websocketApiUrl: websocketApiStack.websocketApiUrl
});
