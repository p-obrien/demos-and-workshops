import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CdkIpv6DemoStack } from '../lib/cdk-ipv6-demo-stack';

describe('Debug Template', () => {
  test('print all resources', () => {
    const app = new cdk.App();
    const stack = new CdkIpv6DemoStack(app, 'TestStack');
    const template = Template.fromStack(stack);
    
    console.log('All resources:');
    console.log(JSON.stringify(template.toJSON().Resources, null, 2));
  });
});
