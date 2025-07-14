import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CdkIpv6DemoStack } from '../lib/cdk-ipv6-demo-stack';

describe('CdkIpv6DemoStack', () => {
  let app: cdk.App;
  let stack: CdkIpv6DemoStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new CdkIpv6DemoStack(app, 'TestStack');
    template = Template.fromStack(stack);
  });

  describe('VPC Configuration', () => {
    test('creates a VPC with correct CIDR', () => {
      template.hasResourceProperties('AWS::EC2::VPC', {
        CidrBlock: '10.0.0.0/16',
        EnableDnsHostnames: true,
        EnableDnsSupport: true,
      });
    });

    test('creates IPv6 CIDR block for VPC', () => {
      template.hasResourceProperties('AWS::EC2::VPCCidrBlock', {
        AmazonProvidedIpv6CidrBlock: true,
      });
    });

    test('creates public and private subnets', () => {
      // Should have public subnets
      template.hasResourceProperties('AWS::EC2::Subnet', {
        MapPublicIpOnLaunch: true,
      });

      // Should have private subnets
      template.hasResourceProperties('AWS::EC2::Subnet', {
        MapPublicIpOnLaunch: false,
      });
    });

    test('creates subnets with IPv6 configuration', () => {
      template.hasResourceProperties('AWS::EC2::Subnet', {
        AssignIpv6AddressOnCreation: true,
      });
    });

    test('creates Internet Gateway', () => {
      template.hasResourceProperties('AWS::EC2::InternetGateway', {});
    });

    test('creates Egress-Only Internet Gateway for IPv6', () => {
      template.hasResourceProperties('AWS::EC2::EgressOnlyInternetGateway', {});
    });

    test('creates NAT Gateway', () => {
      template.hasResourceProperties('AWS::EC2::NatGateway', {});
    });
  });

  describe('Routing Configuration', () => {
    test('creates IPv6 routes for public subnets', () => {
      template.hasResourceProperties('AWS::EC2::Route', {
        DestinationIpv6CidrBlock: '::/0',
      });
    });

    test('creates IPv4 routes for public subnets', () => {
      template.hasResourceProperties('AWS::EC2::Route', {
        DestinationCidrBlock: '0.0.0.0/0',
      });
    });
  });

  describe('Security Group Configuration', () => {
    test('creates security group with correct description', () => {
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription: 'Security group for ALB with HTTPS access',
      });
    });

    test('allows HTTPS traffic on port 443 from IPv4', () => {
      const securityGroups = template.findResources('AWS::EC2::SecurityGroup');
      const sgLogicalId = Object.keys(securityGroups)[0];
      const sg = securityGroups[sgLogicalId];
      
      expect(sg.Properties.SecurityGroupIngress).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            IpProtocol: 'tcp',
            FromPort: 443,
            ToPort: 443,
            CidrIp: '0.0.0.0/0',
          })
        ])
      );
    });

    test('allows HTTPS traffic on port 443 from IPv6', () => {
      const securityGroups = template.findResources('AWS::EC2::SecurityGroup');
      const sgLogicalId = Object.keys(securityGroups)[0];
      const sg = securityGroups[sgLogicalId];
      
      expect(sg.Properties.SecurityGroupIngress).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            IpProtocol: 'tcp',
            FromPort: 443,
            ToPort: 443,
            CidrIpv6: '::/0',
          })
        ])
      );
    });
  });

  describe('Application Load Balancer Configuration', () => {
    test('creates Application Load Balancer', () => {
      template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
        Type: 'application',
        Scheme: 'internet-facing',
        IpAddressType: 'dualstack-without-public-ipv4',
      });
    });

    test('ALB is associated with the correct security group', () => {
      const albs = template.findResources('AWS::ElasticLoadBalancingV2::LoadBalancer');
      const albLogicalId = Object.keys(albs)[0];
      const alb = albs[albLogicalId];
      
      expect(alb.Properties.SecurityGroups).toEqual([
        {
          'Fn::GetAtt': [
            expect.stringMatching(/SecurityGroup1/),
            'GroupId'
          ]
        }
      ]);
    });
  });

  describe('Flow Logs Configuration', () => {
    test('creates VPC Flow Logs', () => {
      template.hasResourceProperties('AWS::EC2::FlowLog', {
        ResourceType: 'VPC',
        TrafficType: 'ALL',
      });
    });
  });

  describe('Tagging', () => {
    test('applies correct tags to resources', () => {
      const vpcs = template.findResources('AWS::EC2::VPC');
      const vpcLogicalId = Object.keys(vpcs)[0];
      const vpc = vpcs[vpcLogicalId];
      
      expect(vpc.Properties.Tags).toEqual(
        expect.arrayContaining([
          { Key: 'Environment', Value: 'demo' },
          { Key: 'Project', Value: 'ipv6-demo' },
          { Key: 'Owner', Value: 'infrastructure-team' },
        ])
      );
    });
  });

  describe('Resource Counts', () => {
    test('creates expected number of subnets', () => {
      const subnets = template.findResources('AWS::EC2::Subnet');
      // Should have 4 subnets (2 AZs × 2 subnet types)
      expect(Object.keys(subnets)).toHaveLength(4);
    });

    test('creates expected number of route tables', () => {
      const routeTables = template.findResources('AWS::EC2::RouteTable');
      // Should have 4 route tables (2 public, 2 private)
      expect(Object.keys(routeTables)).toHaveLength(4);
    });

    test('creates single NAT Gateway', () => {
      const natGateways = template.findResources('AWS::EC2::NatGateway');
      expect(Object.keys(natGateways)).toHaveLength(1);
    });

    test('creates single Application Load Balancer', () => {
      const albs = template.findResources('AWS::ElasticLoadBalancingV2::LoadBalancer');
      expect(Object.keys(albs)).toHaveLength(1);
    });

    test('creates single security group', () => {
      const securityGroups = template.findResources('AWS::EC2::SecurityGroup');
      expect(Object.keys(securityGroups)).toHaveLength(1);
    });
  });

  describe('Stack Properties', () => {
    test('stack synthesizes without errors', () => {
      expect(() => {
        app.synth();
      }).not.toThrow();
    });

    test('template is valid JSON', () => {
      const templateJson = template.toJSON();
      expect(templateJson).toBeDefined();
      expect(typeof templateJson).toBe('object');
    });
  });
});
