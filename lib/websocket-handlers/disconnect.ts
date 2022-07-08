/**
 * Terminates connection by removing Connection ID 
 * from DynamoDB Table
 */

 import { APIGatewayProxyEvent, APIGatewayProxyResultV2, Context } from "aws-lambda";

 import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
 import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";
 
 const client = new DynamoDBClient({ region: process.env.AWS_REGION });
 const ddbDocClient = DynamoDBDocumentClient.from(client);
 
 export async function handler(
   event: APIGatewayProxyEvent,
   context: Context
 ): Promise<APIGatewayProxyResultV2> {
   console.log(`event = ${JSON.stringify(event)}`);
   console.log(`context = ${JSON.stringify(context)}`);
   console.log(`process.env = ${JSON.stringify(process.env)}`);
   try {
     await ddbDocClient.send(new DeleteCommand({
       TableName: process.env.CONNECTIONS_TBL,
       Key: {
         connectionId: event.requestContext.connectionId
       }
     }));
   } catch(err) {
     console.log(err);
     throw err;
   }
 
   return {
     statusCode: 200
   };
 };
 