import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { env } from "./env.js";

function getSesClient() {
  const { SES_REGION, SES_ACCESS_KEY_ID, SES_SECRET_ACCESS_KEY } = env;
  if (!SES_REGION || !SES_ACCESS_KEY_ID || !SES_SECRET_ACCESS_KEY) return null;
  return new SESv2Client({
    region: SES_REGION,
    credentials: {
      accessKeyId: SES_ACCESS_KEY_ID,
      secretAccessKey: SES_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * Send a password reset email via SES.
 * Returns true on success, false if SES is not configured.
 */
export async function sendResetEmail({ to, resetUrl }) {
  const client = getSesClient();
  if (!client) {
    console.log("[email] SES not configured; skipping send", { to, resetUrl });
    return false;
  }
  const from = env.SES_FROM_EMAIL;
  if (!from) {
    console.log("[email] SES_FROM_EMAIL missing; skipping send", {
      to,
      resetUrl,
    });
    return false;
  }

  const params = {
    Destination: { ToAddresses: [to] },
    FromEmailAddress: from,
    Content: {
      Simple: {
        Subject: { Data: "Reset your password" },
        Body: {
          Text: {
            Data: `You requested a password reset.\n\nReset link: ${resetUrl}\n\nIf you did not request this, please ignore.`,
          },
          Html: {
            Data: `<p>You requested a password reset.</p><p><a href="${resetUrl}">Reset your password</a></p><p>If you did not request this, please ignore.</p>`,
          },
        },
      },
    },
  };

  await client.send(new SendEmailCommand(params));
  return true;
}

