# CDK IPv6 Demo

A demonstration project showcasing AWS CDK implementation of dual-stack (IPv4/IPv6) networking infrastructure with TypeScript.

## Project Overview

This project demonstrates how to create a dual-stack VPC (Virtual Private Cloud) that supports both IPv4 and IPv6 networking using AWS CDK. It includes a custom construct for creating dual-stack VPCs and showcases the deployment of an Application Load Balancer configured for dual-stack operation.

## Architecture

The project creates the following AWS resources:

- **Dual-Stack VPC**: A VPC with both IPv4 and IPv6 CIDR blocks
- **Public Subnets**: Internet-accessible subnets with IPv6 routing via Internet Gateway
- **Private Subnets**: Private subnets with IPv6 egress-only internet access
- **Application Load Balancer**: Configured as dual-stack without public IPv4 addresses (IPv6 for internet, supports IPv4 internally)
- **Security Groups**: Allowing HTTPS traffic from both IPv4 and IPv6 sources
- **VPC Flow Logs**: Optional logging for network traffic analysis

## Key Features

### DualStackVpc Construct

The custom `DualStackVpc` construct (`lib/constructs/network/dual-stack-vpc.ts`) provides:

- Automatic IPv6 CIDR block assignment from Amazon's pool
- IPv6 subnet configuration with /64 blocks
- Egress-only Internet Gateway for private subnet IPv6 connectivity
- Customizable subnet naming with availability zone suffixes
- Optional VPC Flow Logs
- Flexible tagging support

### IPv6 Configuration

- **Public Subnets**: Full IPv6 internet connectivity via Internet Gateway
- **Private Subnets**: Outbound-only IPv6 connectivity via Egress-only Internet Gateway
- **Load Balancer**: Configured as `DUAL_STACK_WITHOUT_PUBLIC_IPV4` (IPv6 public addresses only, but supports IPv4 traffic internally)

## Project Structure

```
├── bin/
│   └── cdk-ipv6-demo.ts          # CDK app entry point
├── lib/
│   ├── cdk-ipv6-demo-stack.ts    # Main stack definition
│   └── constructs/
│       └── network/
│           └── dual-stack-vpc.ts  # Custom dual-stack VPC construct
├── test/                          # Unit tests
├── package.json                   # Project dependencies
└── README.md                      # This file
```

## Prerequisites

- Node.js (v18 or later)
- AWS CLI configured with appropriate credentials
- AWS CDK CLI installed globally (`npm install -g aws-cdk`)

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the project:**
   ```bash
   npm run build
   ```

3. **Run tests:**
   ```bash
   npm run test
   ```

4. **Deploy the stack:**
   ```bash
   npx cdk deploy
   ```

## Useful Commands

* `npm run build`   - Compile TypeScript to JavaScript
* `npm run watch`   - Watch for changes and compile automatically
* `npm run test`    - Run Jest unit tests
* `npx cdk deploy`  - Deploy this stack to your default AWS account/region
* `npx cdk diff`    - Compare deployed stack with current state
* `npx cdk synth`   - Emit the synthesized CloudFormation template
* `npx cdk destroy` - Remove the deployed stack

## Configuration Options

The `DualStackVpc` construct accepts the following configuration options:

- `vpcName`: Custom name for the VPC
- `cidr`: IPv4 CIDR block (default: 10.0.0.0/16)
- `maxAzs`: Maximum number of Availability Zones (default: 2)
- `natGateways`: Number of NAT Gateways for IPv4 egress (default: 1)
- `enableFlowLogs`: Enable VPC Flow Logs (default: false)
- `publicSubnetNamePrefix`: Prefix for public subnet names
- `privateSubnetNamePrefix`: Prefix for private subnet names
- `tags`: Key-value pairs for resource tagging

## Important Notes

- This project creates AWS resources that may incur charges
- IPv6 addresses are globally routable and publicly accessible by default
- The Application Load Balancer uses `DUAL_STACK_WITHOUT_PUBLIC_IPV4` mode (IPv6 public addresses only, not true IPv6-only)
- For true IPv6-only operation, change the ALB configuration to `elbv2.IpAddressType.IPV6`
- Ensure your AWS account has IPv6 support enabled in the target region

## Contributing

This is a demonstration project. Feel free to fork and modify for your own use cases.

## License

This project is provided as-is for educational and demonstration purposes.
