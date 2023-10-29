import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { SalesDataGenStack } from '../lib/sales-datagen-stack';


test('DataGenerator Service Created', () => {
  const app = new cdk.App();
    // WHEN
  const stack = new SalesDataGenStack(app, 'MyTestStack');
    // THEN
  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::ECS::Service', 1);
});
