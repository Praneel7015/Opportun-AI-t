import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import type { DailyReport } from "@opportun-ai-t/core";
import { renderDigestHtml, renderDigestText } from "./templates";

export interface SesSenderOptions {
  region: string;
  fromEmail: string;
  toEmail: string;
  client?: SESClient;
}

export interface SendDigestResult {
  messageId?: string;
  skipped?: boolean;
  error?: string;
}

export class SesEmailSender {
  private readonly client: SESClient;
  private readonly fromEmail: string;
  private readonly toEmail: string;

  constructor(options: SesSenderOptions) {
    this.fromEmail = options.fromEmail;
    this.toEmail = options.toEmail;
    this.client =
      options.client ?? new SESClient({ region: options.region });
  }

  async sendDailyDigest(report: DailyReport): Promise<SendDigestResult> {
    if (!this.fromEmail || !this.toEmail) {
      return { skipped: true, error: "SES_FROM_EMAIL or SES_TO_EMAIL missing" };
    }

    try {
      const text = renderDigestText({ report });
      const html = renderDigestHtml({ report });
      const res = await this.client.send(
        new SendEmailCommand({
          Source: this.fromEmail,
          Destination: { ToAddresses: [this.toEmail] },
          Message: {
            Subject: { Data: report.subject, Charset: "UTF-8" },
            Body: {
              Text: { Data: text, Charset: "UTF-8" },
              Html: { Data: html, Charset: "UTF-8" },
            },
          },
        }),
      );
      return { messageId: res.MessageId };
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
