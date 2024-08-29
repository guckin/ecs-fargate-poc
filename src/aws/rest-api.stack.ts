import { Stack, StackProps } from 'aws-cdk-lib';
import * as path from 'path';
import { Construct } from 'constructs';
import { ARecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { ApiGatewayv2DomainProperties } from 'aws-cdk-lib/aws-route53-targets';
import { SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { AwsLogDriver, Cluster, ContainerImage, FargateService, FargateTaskDefinition } from 'aws-cdk-lib/aws-ecs';
import { ApplicationLoadBalancer, ApplicationProtocol } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { DomainName, EndpointType, HttpApi, HttpMethod, VpcLink } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpAlbIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';

const __dirname = new URL('.', import.meta.url).pathname;

export type RestApiStackProps = StackProps & {
  stage: string,
  cert: Certificate,
  subdomain: string,
  domainName: string,
};

export class RestApiStack extends Stack {
  constructor(scope: Construct, id: string, props: RestApiStackProps) {
    super(scope, id, props);

    const vpc = new Vpc(this, 'Vpc', {
      maxAzs: 2,
      subnetConfiguration: [{
        name: 'Public',
        subnetType: SubnetType.PUBLIC
      }]
    });

    const cluster = new Cluster(this, 'Cluster', { vpc });

    const taskDef = new FargateTaskDefinition(this, 'TaskDef');

    const container = taskDef.addContainer('MyContainer', {
      image: ContainerImage.fromAsset(path.join(__dirname, '../..')),
      memoryLimitMiB: 512,
      cpu: 256,
      logging: new AwsLogDriver({ streamPrefix: 'my-app' }),
    });

    container.addPortMappings({
      containerPort: 3000,
    });

    const fargateService = new FargateService(this, 'FargateService', {
      cluster,
      taskDefinition: taskDef,
      vpcSubnets: {
        subnetType: SubnetType.PUBLIC, // Ensure Fargate service uses public subnets
      },
      assignPublicIp: true, // Assign a public IP to the Fargate task
    });

    const loadBalancer = new ApplicationLoadBalancer(this, 'ALB', {
      vpc,
      internetFacing: false, // ALB should be internet-facing
    });

    const listener = loadBalancer.addListener('Listener', {
      port: 80,
      protocol: ApplicationProtocol.HTTP,
    });

    listener.addTargets('Target', {
      port: 80,
      targets: [fargateService],
    });

    // Create the VPC Link for HTTP API to connect to the ALB
    const vpcLink = new VpcLink(this, 'VpcLink', {
      vpcLinkName: 'VpcLinkToALB',
      vpc,
      subnets: {
        subnetType: SubnetType.PUBLIC, // Explicitly specify the use of public subnets
      },
    });

    const apiDomainName = new DomainName(this, 'ApiDomainName', {
      domainName: `${props.subdomain}.${props.stage}.${props.domainName}`,
      certificate: Certificate.fromCertificateArn(this, 'cert', props.cert.certificateArn),
      endpointType: EndpointType.EDGE
    });

    const httpApi = new HttpApi(this, `${props.stage}HttpApi`, {
      apiName: 'FargateHttpApi',
      defaultDomainMapping: {
        domainName: apiDomainName,
      }
    });

    httpApi.addRoutes({
      path: '/{proxy+}', // This creates a proxy route that matches any path
      methods: [HttpMethod.ANY], // This allows any HTTP method (GET, POST, etc.)
      integration: new HttpAlbIntegration('HttpAlbIntegration', listener, {
        vpcLink, // Link the ALB with the VPC Link
      }),
    });

    new ARecord(this, 'ApiAliasRecord', {
      recordName: `${props.subdomain}.${props.stage}.${props.domainName}`,
      zone: HostedZone.fromLookup(this, 'HostedZone', {
        domainName: props.domainName
      }),
      target: RecordTarget.fromAlias(new ApiGatewayv2DomainProperties(
        apiDomainName.regionalDomainName,
        apiDomainName.regionalHostedZoneId)
      ),
    });
  }
}
