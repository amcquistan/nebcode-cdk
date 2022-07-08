import { Stack, StackProps, Aws } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as ecs from "aws-cdk-lib/aws-ecs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as kinesis from "aws-cdk-lib/aws-kinesis";
import * as logs from "aws-cdk-lib/aws-logs";

import * as path from "path";


export class SalesDataGenStack extends Stack {
  readonly kinesisStream: kinesis.IStream;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.kinesisStream = new kinesis.Stream(this, "SalesStream");

    const cluster = new ecs.Cluster(this, "FargateCluster");

    const taskRole = new iam.Role(this, "TaskRole", {
      roleName: "nebcode-task-role",
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com")
    });
    this.kinesisStream.grantWrite(taskRole);

    const taskDefinition = new ecs.FargateTaskDefinition(this, "TaskDef", {
      cpu: 1024,
      memoryLimitMiB: 3072,
      taskRole,
      executionRole: new iam.Role(this, "TaskExecRole",{
        roleName: "nebcode-task-exec-role",
        assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AmazonECSTaskExecutionRolePolicy")
        ]
      })
    });
    taskDefinition.addContainer("DataGenerator", {
      image: ecs.ContainerImage.fromAsset(path.join(__dirname, "datagenerator")),
      environment: {
        ["AWS_REGION"]: Aws.REGION,
        ["SALES_STREAM"]: this.kinesisStream.streamName
      },
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: "kinesis-datagen",
        logRetention: logs.RetentionDays.THREE_DAYS
      }),
      healthCheck: {
        command: ["CMD-SHELL", "pgrep -f node || exit 1"]
      }
    });

    new ecs.FargateService(this, "FargateService", {
      cluster,
      taskDefinition
    });
  }
}
