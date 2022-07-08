import { KinesisStreamEvent } from "aws-lambda";
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const dbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const ddbDocClient = DynamoDBDocumentClient.from(dbClient);

const apiClient = new ApiGatewayManagementApiClient({
  region: process.env.AWS_REGION,
  endpoint: process.env.CONNECTION_URL,
});

export async function handler(event: KinesisStreamEvent) {
  // fetch all connections from dynamodb
  let connections;
  try {
    const response = await ddbDocClient.send(
      new ScanCommand({
        TableName: process.env.CONNECTION_TBL,
      })
    );
    connections = response.Items;
  } catch (err) {
    console.log(`Failed scanning table ${process.env.CONNECTION_TBL}`);
    console.log(err);
    throw err;
  }

  // console.log(`event = ${JSON.stringify(event)}`);
  for (let record of event.Records) {
    console.log(`record in base64 = ${JSON.stringify(record)}`);
    var data = Buffer.from(record.kinesis.data, "base64").toString("utf8");
    console.log(`record decoded = ${data}`);

    // broadcast new revenue to each connection
    for (let connection of connections!) {
      const response = await apiClient.send(
        new PostToConnectionCommand({
          Data: Buffer.from(record.kinesis.data, "base64"),
          ConnectionId: connection.connectionId,
        })
      );
      console.log(`postToConnection response ${JSON.stringify(response)}`);
    }
  }
}
