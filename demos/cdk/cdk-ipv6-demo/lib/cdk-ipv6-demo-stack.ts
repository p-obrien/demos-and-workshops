import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DualStackVpc } from './constructs/network/dual-stack-vpc';
import ec2 = require('aws-cdk-lib/aws-ec2');
import elbv2 = require('aws-cdk-lib/aws-elasticloadbalancingv2');


export class CdkIpv6DemoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const dualStackVpc = new DualStackVpc(this, 'DemoVpc', {
      vpcName: 'test-vpc',
      cidr: '10.0.0.0/16',
      maxAzs: 3,
      natGateways: 1,
      enableFlowLogs: true,
      tags: {
        Environment: 'demo',
        Project: 'ipv6-demo',
        Owner: 'infrastructure-team'
      }
    });


    const securityGroup1 = new ec2.SecurityGroup(this, 'SecurityGroup1', {
      vpc: dualStackVpc.vpc,
      securityGroupName: 'demo-alb-sg',
      description: 'Security group for ALB with HTTPS access',
    });

    securityGroup1.addIngressRule(
      ec2.Peer.anyIpv6(),
      ec2.Port.tcp(443),
      'Allow HTTPS traffic from anywhere (IPv6)'
    );

    const alb = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
      loadBalancerName: 'demo-alb',
      vpc: dualStackVpc.vpc,
      internetFacing: true,
      securityGroup: securityGroup1,
      ipAddressType: elbv2.IpAddressType.DUAL_STACK_WITHOUT_PUBLIC_IPV4
    });

    // TODO - Add Listener
  }
}
