import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

export interface WelcomeEmailInput {
  toEmail: string;
  displayName: string;
}

/**
 * Sends a one-time welcome email after the user completes onboarding.
 *
 * Silently swallows all errors so a delivery failure never blocks the redirect.
 * SES must have the recipient address (or domain) verified when in sandbox mode —
 * if it isn't, the send will fail silently and no email is delivered.
 */
export async function sendWelcomeEmail({
  toEmail,
  displayName,
}: WelcomeEmailInput): Promise<void> {
  const fromEmail = process.env.SES_FROM_EMAIL;
  if (!fromEmail) {
    console.warn("[welcome-email] SES_FROM_EMAIL not set — skipping");
    return;
  }

  const region = process.env.APP_REGION ?? "ap-south-1";
  const client = new SESClient({ region });

  const firstName = displayName.split(" ")[0] ?? displayName;

  const textBody = [
    `Hi ${firstName},`,
    "",
    "You're all set. Opportun-AI-t is now configured and ready to work for you.",
    "",
    "The agent runs daily at 8:00 AM IST. Your first briefing will arrive",
    "tomorrow morning with ranked opportunities matched to your profile.",
    "",
    "Note: if your email address hasn't been verified in AWS SES yet, delivery",
    "will be held until verification is complete. Check the SES console if you",
    "don't receive your first briefing.",
    "",
    "Good luck,",
    "Opportun-AI-t",
  ].join("\n");

  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Georgia,serif;max-width:600px;margin:40px auto;padding:0 24px;color:#111;line-height:1.65">
  <p style="font-size:1.05rem">Hi ${escapeHtml(firstName)},</p>
  <p>You're all set. <strong>Opportun-AI-t</strong> is now configured and ready to work for you.</p>
  <p>The agent runs <strong>daily at 8:00&nbsp;AM IST</strong>. Your first briefing will arrive
  tomorrow morning with ranked opportunities matched to your profile.</p>
  <hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0">
  <p style="font-size:0.85rem;color:#666">
    <strong>Note:</strong> if your email address hasn't been verified in AWS SES yet,
    delivery will be held until verification is complete. Check the SES console if you
    don't receive your first briefing.
  </p>
  <p style="font-size:0.85rem;color:#888;margin-top:32px">— Opportun-AI-t</p>
</body>
</html>`;

  try {
    await client.send(
      new SendEmailCommand({
        Source: fromEmail,
        Destination: { ToAddresses: [toEmail] },
        Message: {
          Subject: {
            Data: "You're all set — Opportun-AI-t is ready",
            Charset: "UTF-8",
          },
          Body: {
            Text: { Data: textBody, Charset: "UTF-8" },
            Html: { Data: htmlBody, Charset: "UTF-8" },
          },
        },
      }),
    );
  } catch (err) {
    console.error(
      "[welcome-email] send failed (non-fatal):",
      err instanceof Error ? err.message : String(err),
    );
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
