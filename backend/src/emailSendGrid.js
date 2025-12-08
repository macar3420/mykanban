import sgMail from "@sendgrid/mail";
import { env } from "./env.js";

function configureSendGrid() {
  if (!env.SENDGRID_API_KEY) return false;
  sgMail.setApiKey(env.SENDGRID_API_KEY);
  return true;
}

/**
 * Send a password reset email via SendGrid.
 * Returns true on success, false if SendGrid is not configured.
 */
export async function sendResetEmailSendGrid({ to, resetUrl }) {
  if (!configureSendGrid()) {
    console.log("[email] SendGrid not configured; skipping send", { to, resetUrl });
    return false;
  }
  const from = env.SENDGRID_FROM_EMAIL;
  if (!from) {
    console.log("[email] SENDGRID_FROM_EMAIL missing; skipping send", { to, resetUrl });
    return false;
  }

  const msg = {
    to,
    from,
    subject: "Reset your password",
    text: `You requested a password reset.\n\nReset link: ${resetUrl}\n\nIf you did not request this, please ignore.`,
    html: `<p>You requested a password reset.</p><p><a href="${resetUrl}">Reset your password</a></p><p>If you did not request this, please ignore.</p>`,
  };

  try {
    await sgMail.send(msg);
    console.log("[email] SendGrid email sent successfully", { to });
    return true;
  } catch (error) {
    console.error("[email] SendGrid send failed:", error.message);
    if (error.response) {
      console.error("[email] SendGrid error details:", JSON.stringify(error.response.body, null, 2));
    }
    return false;
  }
}

