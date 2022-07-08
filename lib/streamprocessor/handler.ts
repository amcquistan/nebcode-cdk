import { Buffer } from "buffer";

import { KinesisClient, PutRecordCommand } from "@aws-sdk/client-kinesis";

import { WindowedState, WindowedKinesisEvent, CustomerAggregateRevenue, CustomerRevenue, AggregateRevenue } from "./interfaces";

const client = new KinesisClient({ region: process.env.AWS_REGION });


export async function handler(event: WindowedKinesisEvent): Promise<WindowedState> {
  let state: AggregateRevenue = Object.keys(event.state!).length !== 0 ? { ...event.state! } : {
    windowStart: event.window.start,
    windowEnd: event.window.end,
    totalRevenue: 0,
    customerRevenue: []
  };

  if (event.isFinalInvokeForWindow) {
    await client.send(new PutRecordCommand({
      Data: Buffer.from(JSON.stringify(state)),
      PartitionKey: state.windowEnd,
      StreamName: process.env.OUTPUT_STREAM
    }));
    return { state };
  }

  for (const record of event.Records) {
    const evtCustomer: CustomerRevenue = JSON.parse(
      Buffer.from(record.kinesis.data, 'base64').toString('utf8')
    );

    let i = state.customerRevenue.findIndex(x => x.name === evtCustomer.customer);
    let customer: CustomerAggregateRevenue;
    if (i === -1) {
      customer = { name: evtCustomer.customer, revenue: evtCustomer.revenue };
      state.customerRevenue.push(customer);
    } else {
      customer = state.customerRevenue[i];
      state.customerRevenue[i] = { ...customer, revenue: customer.revenue + evtCustomer.revenue };
    }

    state = { ...state, totalRevenue: state.totalRevenue + customer.revenue };
  }

  return { state };
}
