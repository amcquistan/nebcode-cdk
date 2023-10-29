import { Stack, StackProps, Aws, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3_deploy from "aws-cdk-lib/aws-s3-deployment";

import * as path from "path";

export interface DashboardProps extends StackProps {
  readonly websocketApiUrl: string;
}

export class DashboardStack extends Stack  {
  constructor(scope: Construct, id: string, props: DashboardProps) {
    super(scope, id, props);

    const websiteBucket = new s3.Bucket(this, "WebsiteBucket", {
      websiteIndexDocument: "index.html",
      websiteErrorDocument: "index.html",
      publicReadAccess: true,

      // very ugly fix due to changes in S3 permissioning now required to
      // achieve the same as public read
      // see: https://github.com/aws/aws-cdk/issues/25983
      accessControl: s3.BucketAccessControl.BUCKET_OWNER_FULL_CONTROL,
      blockPublicAccess: {
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false
      }
    });

    new s3_deploy.BucketDeployment(this, "BucketDeployer", {
      sources: [s3_deploy.Source.asset(path.join(__dirname, "dashboard-app", "build"))],
      destinationBucket: websiteBucket
    });

    new CfnOutput(this, "DashboardUrl", {
      value: `${websiteBucket.bucketWebsiteUrl}?apiUrl=${props.websocketApiUrl}`
    });
  }
}
