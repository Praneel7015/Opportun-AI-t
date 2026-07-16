#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { OpportunAiTStack } from "../lib/opportun-ai-t-stack";

const app = new cdk.App();

const env: cdk.Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? process.env.AWS_REGION ?? "ap-south-1",
};

new OpportunAiTStack(app, "OpportunAiTStack", {
  env,
  description: "Opportun-AI-t challenge MVP — scheduled career agent pipeline",
});

app.synth();