#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkIpv6DemoStack } from '../lib/cdk-ipv6-demo-stack';

const app = new cdk.App();

new CdkIpv6DemoStack(app, 'CdkIpv6DemoStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
