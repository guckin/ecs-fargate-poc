#!/usr/bin/env node
import {App} from 'aws-cdk-lib';

import {RestApiStack} from './rest-api.stack.js';
import {CertificateStack} from './certificate.stack.js';

const createApp = new App();
const stage = process.env.STAGE || 'dev';
const domainName = 'slippys.cool';
const subdomain = 'poc-fargate-ecs';

const certStack = new CertificateStack(createApp, `Certificate-${stage}`, {
    stage,
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: 'us-east-1'
    },
    crossRegionReferences: true,
    domainName,
    subdomain,
});

new RestApiStack(createApp, `RestAPIStack-${stage}`, {
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
    crossRegionReferences: true,
    stage,
    cert: certStack.cert,
    domainName,
    subdomain,
});
