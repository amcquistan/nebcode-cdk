#!/usr/bin/env node
import { ITable } from "aws-cdk-lib/aws-dynamodb";
import { IFunction } from "aws-cdk-lib/aws-lambda";
import { CfnApi, CfnIntegration, CfnRoute, CfnStage, CfnDeployment } from "aws-cdk-lib/aws-apigatewayv2";
import { Effect, PolicyStatement, ServicePrincipal } from "aws-cdk-lib/aws-iam";

import { Aws, CfnOutput, Stack } from 'aws-cdk-lib';

import { Construct } from 'constructs';

export interface WebsocketApiProps {
  readonly apiName: string;
  readonly apiDescription: string;
  readonly stageName: string;
  readonly connectFn: IFunction;
  readonly disconnectFn: IFunction;
  readonly connectionsTbl: ITable;
}

export class WebsocketApi extends Construct {
  readonly props: WebsocketApiProps;
  readonly api: CfnApi;
  readonly deployment: CfnDeployment;
  readonly stage: CfnStage;
  
  constructor(parent: Stack, name: string, props: WebsocketApiProps) {
    super(parent, name);
    this.props = props;

    this.api = new CfnApi(this, 'WebSocketApi', {
      name: props.apiName,
      description: props.apiDescription,
      protocolType: "WEBSOCKET",
      routeSelectionExpression: "$request.body.action"
    });
    this.deployment = new CfnDeployment(this, "WebsocketDeployment", {
      apiId: this.api.ref
    });

    this.stage = new CfnStage(this, "WebsocketStage", {
      stageName: props.stageName,
      apiId: this.api.ref,
      deploymentId: this.deployment.ref
    });

    props.connectionsTbl.grantWriteData(props.connectFn);
    props.connectionsTbl.grantWriteData(props.disconnectFn);

    this.addLambdaIntegration(props.connectFn, "$connect", "ConnectionRoute");
    this.addLambdaIntegration(props.disconnectFn, "$disconnect", "DisconnectRoute");
  }

  addLambdaIntegration(fn: IFunction, routeKey: string, operationName: string, apiKeyRequired?: boolean, authorizationType?: string) {
    const integration = new CfnIntegration(this, `${operationName}Integration`, {
      apiId: this.api.ref,
      integrationType: "AWS_PROXY",
      integrationUri: `arn:aws:apigateway:${Aws.REGION}:lambda:path/2015-03-31/functions/${fn.functionArn}/invocations`
    });

    fn.grantInvoke(new ServicePrincipal('apigateway.amazonaws.com', {
      conditions: {
        "ArnLike": {
          "aws:SourceArn": `arn:aws:execute-api:${Aws.REGION}:${Aws.ACCOUNT_ID}:${this.api.ref}/*`
        }
      }
    }));

    fn.role?.grantAssumeRole(new ServicePrincipal("apigateway.amazonaws.com"))

    const route = new CfnRoute(this, `${operationName}Route`, {
      apiId: this.api.ref,
      routeKey: routeKey,
      apiKeyRequired: apiKeyRequired,
      authorizationType: authorizationType || "NONE",
      operationName: operationName,
      target: `integrations/${integration.ref}`
    });
    this.deployment.addDependency(route);
  }
}