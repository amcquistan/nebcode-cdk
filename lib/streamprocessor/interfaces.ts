import { KinesisStreamEvent } from "aws-lambda";

export interface CustomerRevenue {
  readonly customer: string;
  readonly product: string;
  readonly quantity: number;
  readonly revenue: number;
}

export interface CustomerAggregateRevenue {
  readonly name: string;
  readonly revenue: number;
}

export interface AggregateRevenue {
  readonly windowStart: string;
  readonly windowEnd: string;
  readonly totalRevenue: number;
  readonly customerRevenue: CustomerAggregateRevenue[];
}

export interface WindowedState {
  readonly state: AggregateRevenue;
}

export interface TumblingWindow {
  readonly start: string;
  readonly end: string;
}

export interface WindowedKinesisEvent extends KinesisStreamEvent {
  readonly window: TumblingWindow;
  readonly state?: AggregateRevenue;
  readonly shardId: string;
  readonly eventSourceArn: string;
  readonly isFinalInvokeForWindow: boolean;
  readonly isWindowTerminatedEarly: boolean;
}
