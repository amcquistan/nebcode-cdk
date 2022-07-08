
import { Buffer } from "buffer";

import { KinesisClient, PutRecordCommand } from "@aws-sdk/client-kinesis";

const customers = ["Hooli Corp", "Acme Corp", "Wayne Enterprises", "Mystery Inc"];
const products = [
  { name: "Chia Pet", price: 6.99 },
  { name: "Back Scratcher", price: 8.99 },
  { name: "Stress Ball", price: 2.99 }
];

function randomInt(low: number, high: number) {
  return Math.floor(Math.random() * (high - low) + low);
}

function sleep(millis: number) {
  return new Promise(resolve => setTimeout(resolve, millis));
}

async function main() {
  const client = new KinesisClient({ region: process.env.AWS_REGION });

  while (true) {
    const customer = customers[randomInt(0, customers.length)];
    const product = products[randomInt(0, products.length)];
    const quantity = randomInt(1, 101);

    const sale = JSON.stringify({
      customer,
      product: product.name,
      quantity,
      revenue: Number((quantity * product.price).toFixed(2))
    });

    await client.send(new PutRecordCommand({
      Data: Buffer.from(sale),
      PartitionKey: customer,
      StreamName: process.env.SALES_STREAM
    }));

    await sleep(1000);
    console.log(`Published ${sale}`);
  }
}

main();
