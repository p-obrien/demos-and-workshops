import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface DualStackVpcProps {
  readonly vpcName?: string;
  readonly cidr?: string;
  readonly maxAzs?: number;
  readonly natGateways?: number;
  readonly enableFlowLogs?: boolean;
  readonly publicSubnetNamePrefix?: string;
  readonly privateSubnetNamePrefix?: string;
  readonly tags?: { [key: string]: string };
}

export class DualStackVpc extends Construct {
  public readonly vpc: ec2.Vpc;
  public readonly publicSubnets: ec2.ISubnet[];
  public readonly privateSubnets: ec2.ISubnet[];

  constructor(scope: Construct, id: string, props: DualStackVpcProps = {}) {
    super(scope, id);

    this.vpc = new ec2.Vpc(this, 'Vpc', {
      vpcName: props.vpcName,
      ipAddresses: ec2.IpAddresses.cidr(props.cidr || '10.0.0.0/16'),
      maxAzs: props.maxAzs || 2,
      natGateways: props.natGateways ?? 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: props.publicSubnetNamePrefix || 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: props.privateSubnetNamePrefix || 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    this.enableIpv6();
    this.customizeSubnetNames(props);
    this.applyTags(props);

    this.publicSubnets = this.vpc.publicSubnets;
    this.privateSubnets = this.vpc.privateSubnets;

    if (props.enableFlowLogs) {
      this.enableFlowLogs();
    }
  }

  private enableIpv6(): void {

    const ipv6Block = new ec2.CfnVPCCidrBlock(this, 'Ipv6Block', {
      vpcId: this.vpc.vpcId,
      amazonProvidedIpv6CidrBlock: true,
    });


    const allSubnets = [...this.vpc.publicSubnets, ...this.vpc.privateSubnets];
    const subnetCount = allSubnets.length;

    allSubnets.forEach((subnet, index) => {
      const cfnSubnet = subnet.node.defaultChild as ec2.CfnSubnet;
      cfnSubnet.ipv6CidrBlock = cdk.Fn.select(index,
        cdk.Fn.cidr(cdk.Fn.select(0, this.vpc.vpcIpv6CidrBlocks), subnetCount, '64')
      );
      cfnSubnet.assignIpv6AddressOnCreation = true;
      cfnSubnet.addDependency(ipv6Block);
    });

    this.configureIpv6Routing();
  }

  private configureIpv6Routing(): void {

    this.vpc.publicSubnets.forEach((subnet, index) => {
      new ec2.CfnRoute(this, `PublicIpv6Route${index}`, {
        routeTableId: subnet.routeTable.routeTableId,
        destinationIpv6CidrBlock: '::/0',
        gatewayId: this.vpc.internetGatewayId,
      });
    });


    const egressOnlyIgw = new ec2.CfnEgressOnlyInternetGateway(this, 'EgressOnlyIgw', {
      vpcId: this.vpc.vpcId,
    });

    this.vpc.privateSubnets.forEach((subnet, index) => {
      new ec2.CfnRoute(this, `PrivateIpv6Route${index}`, {
        routeTableId: subnet.routeTable.routeTableId,
        destinationIpv6CidrBlock: '::/0',
        egressOnlyInternetGatewayId: egressOnlyIgw.attrId,
      });
    });
  }

  private customizeSubnetNames(props: DualStackVpcProps): void {
    const vpcName = props.vpcName || 'vpc';
    const publicPrefix = props.publicSubnetNamePrefix || 'public';
    const privatePrefix = props.privateSubnetNamePrefix || 'private';

    // Customize public subnet names with VPC name and AZ suffix
    this.vpc.publicSubnets.forEach((subnet) => {
      const cfnSubnet = subnet.node.defaultChild as ec2.CfnSubnet;
      const azSuffix = cdk.Fn.select(2, cdk.Fn.split('-', subnet.availabilityZone));
      cfnSubnet.addPropertyOverride('Tags', [
        ...cfnSubnet.tags?.renderTags() || [],
        {
          Key: 'Name',
          Value: `${vpcName}-${publicPrefix}-${azSuffix}`
        }
      ]);
    });

    // Customize private subnet names with VPC name and AZ suffix
    this.vpc.privateSubnets.forEach((subnet) => {
      const cfnSubnet = subnet.node.defaultChild as ec2.CfnSubnet;
      const azSuffix = cdk.Fn.select(2, cdk.Fn.split('-', subnet.availabilityZone));
      cfnSubnet.addPropertyOverride('Tags', [
        ...cfnSubnet.tags?.renderTags() || [],
        {
          Key: 'Name',
          Value: `${vpcName}-${privatePrefix}-${azSuffix}`
        }
      ]);
    });
  }

  private applyTags(props: DualStackVpcProps): void {
    if (!props.tags) {
      return;
    }

    // Apply tags to the entire construct scope
    Object.entries(props.tags).forEach(([key, value]) => {
      cdk.Tags.of(this).add(key, value);
    });
  }

  private enableFlowLogs(): void {
    new ec2.FlowLog(this, 'FlowLog', {
      resourceType: ec2.FlowLogResourceType.fromVpc(this.vpc),
      trafficType: ec2.FlowLogTrafficType.ALL,
    });
  }
}
