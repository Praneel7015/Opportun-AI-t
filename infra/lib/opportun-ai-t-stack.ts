import * as path from "path";
import * as cdk from "aws-cdk-lib";
import { Duration, RemovalPolicy, Stack, StackProps, CfnParameter, CfnOutput, TimeZone } from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as scheduler from "aws-cdk-lib/aws-scheduler";
import { LambdaInvoke } from "aws-cdk-lib/aws-scheduler-targets";
import { Construct } from "constructs";

/**
 * Opportun-AI-t infrastructure (Phase 1).
 *
 * SES identities are NOT created here â€” verify From/To in the SES console
 * (sandbox requires both). Pass emails via CDK parameters or context.
 */
export class OpportunAiTStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const sesFromEmail = new CfnParameter(this, "SesFromEmail", {
      type: "String",
      description:
        "Verified SES sender address (verify outside CDK; sandbox requires verified From AND To)",
      default: this.node.tryGetContext("sesFromEmail") ?? "you@example.com",
    });

    const sesToEmail = new CfnParameter(this, "SesToEmail", {
      type: "String",
      description:
        "Verified SES recipient address for the daily briefing (sandbox: must be verified)",
      default: this.node.tryGetContext("sesToEmail") ?? "you@example.com",
    });

    const scheduleTimezone =
      (this.node.tryGetContext("scheduleTimezone") as string | undefined) ??
      "Asia/Kolkata";

    const bedrockModelId =
      (this.node.tryGetContext("bedrockModelId") as string | undefined) ??
      "apac.amazon.nova-lite-v1:0";

    const analysisCap =
      (this.node.tryGetContext("analysisCap") as string | undefined) ?? "10";

    // --- DynamoDB single-table (PAY_PER_REQUEST / Free Tier friendly) ---
    // PK/SK primary; GSI1 for status+date; GSI2 for entity-type+date queries.
    const table = new dynamodb.Table(this, "OpportunTable", {
      tableName: undefined, // let CloudFormation name it
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: false },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    table.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: { name: "GSI1PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI1SK", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    table.addGlobalSecondaryIndex({
      indexName: "GSI2",
      partitionKey: { name: "GSI2PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI2SK", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // --- SQS dead-letter queue for Scheduler / Lambda failures ---
    const dlq = new sqs.Queue(this, "CareerAgentDlq", {
      retentionPeriod: Duration.days(14),
      encryption: sqs.QueueEncryption.SQS_MANAGED,
    });

    // --- Lambda (Node.js 20) â€” career agent ---
    const repoRoot = path.join(__dirname, "../..");
    const agentEntry = path.join(repoRoot, "services/agent/src/handler.ts");

    const logGroup = new logs.LogGroup(this, "CareerAgentLogGroup", {
      retention: logs.RetentionDays.TWO_WEEKS,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const careerAgentFn = new NodejsFunction(this, "CareerAgentFn", {
      functionName: "opportun-ai-t-career-agent",
      entry: agentEntry,
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: Duration.minutes(5),
      memorySize: 512,
      logGroup,
      environment: {
        TABLE_NAME: table.tableName,
        BEDROCK_MODEL_ID: bedrockModelId,
        SES_FROM_EMAIL: sesFromEmail.valueAsString,
        SES_TO_EMAIL: sesToEmail.valueAsString,
        SCHEDULE_TIMEZONE: scheduleTimezone,
        ANALYSIS_CAP: analysisCap,
      },
      bundling: {
        minify: true,
        sourceMap: true,
        target: "node20",
        externalModules: ["@aws-sdk/*"],
      },
      depsLockFilePath: path.join(repoRoot, "package-lock.json"),
      projectRoot: repoRoot,
      deadLetterQueue: dlq,
      deadLetterQueueEnabled: true,
      retryAttempts: 1,
    });

    // DynamoDB R/W (table + GSIs)
    table.grantReadWriteData(careerAgentFn);

    // Bedrock Converse / InvokeModel for Amazon Nova
        // ap-south-1 on-demand Nova requires an inference profile id (e.g. apac.amazon.nova-lite-v1:0)
    careerAgentFn.addToRolePolicy(
      new iam.PolicyStatement({
        sid: "BedrockNovaInvoke",
        actions: [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream",
          "bedrock:Converse",
          "bedrock:ConverseStream",
        ],
        resources: [
          `arn:aws:bedrock:${this.region}::foundation-model/amazon.nova-lite-v1:0`,
          `arn:aws:bedrock:${this.region}::foundation-model/amazon.nova*`,
          `arn:aws:bedrock:*::foundation-model/amazon.nova-lite-v1:0`,
          `arn:aws:bedrock:*::foundation-model/amazon.nova*`,
          `arn:aws:bedrock:${this.region}:${this.account}:inference-profile/*`,
          `arn:aws:bedrock:${this.region}:${this.account}:application-inference-profile/*`,
        ],
      }),
    );


    // SES SendEmail â€” identities verified outside CDK
    careerAgentFn.addToRolePolicy(
      new iam.PolicyStatement({
        sid: "SesSendBriefing",
        actions: ["ses:SendEmail", "ses:SendRawEmail"],
        resources: ["*"],
        conditions: {
          StringEquals: {
            "ses:FromAddress": sesFromEmail.valueAsString,
          },
        },
      }),
    );

    // CloudWatch metrics (embedded metrics / PutMetricData)
    careerAgentFn.addToRolePolicy(
      new iam.PolicyStatement({
        sid: "CloudWatchMetrics",
        actions: ["cloudwatch:PutMetricData"],
        resources: ["*"],
        conditions: {
          StringEquals: {
            "cloudwatch:namespace": "OpportunAiT",
          },
        },
      }),
    );

    // --- EventBridge Scheduler: daily 8:00 AM in configurable IANA timezone ---
    const scheduleRole = new iam.Role(this, "SchedulerInvokeRole", {
      assumedBy: new iam.ServicePrincipal("scheduler.amazonaws.com"),
      description: "Allows EventBridge Scheduler to invoke the career agent Lambda",
    });

    careerAgentFn.grantInvoke(scheduleRole);

    const schedule = new scheduler.Schedule(this, "DailyCareerAgentSchedule", {
      scheduleName: "opportun-ai-t-daily-8am",
      description: `Daily career agent run at 08:00 (${scheduleTimezone})`,
      schedule: scheduler.ScheduleExpression.cron({
        minute: "0",
        hour: "8",
        day: "*",
        month: "*",
        year: "*",
        timeZone: TimeZone.of(scheduleTimezone),
      }),
      target: new LambdaInvoke(careerAgentFn, {
        role: scheduleRole,
        retryAttempts: 2,
        deadLetterQueue: dlq,
      }),
      timeWindow: scheduler.TimeWindow.flexible(Duration.minutes(10)),
    });

    // --- Alarms ---
    const errorAlarm = new cloudwatch.Alarm(this, "CareerAgentErrorAlarm", {
      alarmName: "opportun-ai-t-lambda-errors",
      alarmDescription: "Career agent Lambda reported errors",
      metric: careerAgentFn.metricErrors({
        period: Duration.minutes(5),
        statistic: "Sum",
      }),
      threshold: 1,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    });

    const dlqAlarm = new cloudwatch.Alarm(this, "CareerAgentDlqAlarm", {
      alarmName: "opportun-ai-t-dlq-messages",
      alarmDescription: "Messages landed on the career agent DLQ",
      metric: dlq.metricApproximateNumberOfMessagesVisible({
        period: Duration.minutes(5),
        statistic: "Maximum",
      }),
      threshold: 1,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    });

    // Custom EMF metrics from the agent (namespace OpportunAiT)
    const metricsNamespace = "OpportunAiT";
    const agentCustomMetric = (
      metricName: string,
      statistic: string = "Sum",
    ) =>
      new cloudwatch.Metric({
        namespace: metricsNamespace,
        metricName,
        period: Duration.minutes(5),
        statistic,
      });

    const bedrockErrorAlarm = new cloudwatch.Alarm(this, "BedrockErrorAlarm", {
      alarmName: "opportun-ai-t-bedrock-errors",
      alarmDescription: "Career agent reported Bedrock evaluation failures",
      metric: agentCustomMetric("BedrockErrors"),
      threshold: 3,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      comparisonOperator:
        cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    });

    const runFailedAlarm = new cloudwatch.Alarm(this, "RunFailedAlarm", {
      alarmName: "opportun-ai-t-run-failed",
      alarmDescription: "Career agent pipeline marked a run as failed",
      metric: agentCustomMetric("RunFailed"),
      threshold: 1,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      comparisonOperator:
        cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    });

    // --- CloudWatch dashboard (challenge screenshots) ---
    const dashboard = new cloudwatch.Dashboard(this, "OpportunDashboard", {
      dashboardName: "Opportun-AI-t",
    });

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: "Lambda Invocations / Errors / Duration",
        left: [
          careerAgentFn.metricInvocations({ period: Duration.minutes(5) }),
          careerAgentFn.metricErrors({ period: Duration.minutes(5) }),
        ],
        right: [careerAgentFn.metricDuration({ period: Duration.minutes(5) })],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: "DLQ visible messages",
        left: [dlq.metricApproximateNumberOfMessagesVisible()],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: "Agent job pipeline (OpportunAiT)",
        left: [
          agentCustomMetric("JobsFetched"),
          agentCustomMetric("JobsNew"),
          agentCustomMetric("JobsDeduped"),
          agentCustomMetric("JobsAnalyzed"),
        ],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: "Run outcomes / Bedrock / Email",
        left: [
          agentCustomMetric("RunCompleted"),
          agentCustomMetric("RunSkipped"),
          agentCustomMetric("RunFailed"),
          agentCustomMetric("BedrockErrors"),
          agentCustomMetric("EmailSent"),
          agentCustomMetric("FollowUpsCreated"),
        ],
        right: [agentCustomMetric("DurationMs", "Average")],
        width: 12,
      }),
      new cloudwatch.AlarmStatusWidget({
        title: "Alarms",
        alarms: [errorAlarm, dlqAlarm, bedrockErrorAlarm, runFailedAlarm],
        width: 24,
      }),
      new cloudwatch.LogQueryWidget({
        title: "Recent career-agent structured logs",
        logGroupNames: [logGroup.logGroupName],
        queryLines: [
          "fields @timestamp, @message",
          "filter @message like /pipeline_|career_agent_|bedrock_|ses_/",
          "sort @timestamp desc",
          "limit 50",
        ],
        width: 24,
        height: 6,
      }),
    );

    const dashboardUrl = `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${dashboard.dashboardName}`;

    // --- Outputs ---
    new CfnOutput(this, "TableName", {
      value: table.tableName,
      description: "DynamoDB single-table name",
    });

    new CfnOutput(this, "LambdaName", {
      value: careerAgentFn.functionName,
      description: "Career agent Lambda function name",
    });

    new CfnOutput(this, "LambdaArn", {
      value: careerAgentFn.functionArn,
      description: "Career agent Lambda ARN",
    });

    new CfnOutput(this, "ScheduleName", {
      value: schedule.scheduleName ?? "opportun-ai-t-daily-8am",
      description: "EventBridge Scheduler schedule name",
    });

    new CfnOutput(this, "DlqUrl", {
      value: dlq.queueUrl,
      description: "SQS dead-letter queue URL",
    });

    new CfnOutput(this, "DashboardName", {
      value: dashboard.dashboardName ?? "Opportun-AI-t",
      description: "CloudWatch dashboard name",
    });

    new CfnOutput(this, "DashboardUrl", {
      value: dashboardUrl,
      description: "CloudWatch dashboard console URL (for challenge screenshots)",
    });

    new CfnOutput(this, "SesNote", {
      value:
        "Verify SES From/To identities in the SES console before deploy; sandbox requires both verified. Pass -c sesFromEmail=... -c sesToEmail=... or stack parameters.",
      description: "SES identity reminder",
    });
  }
}
