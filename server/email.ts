import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.FROM_EMAIL || "YSMMS <onboarding@resend.dev>";

export async function sendMagicLinkEmail(
  email: string,
  token: string,
  baseUrl: string,
  inviterName?: string
) {
  const magicLink = `${baseUrl}/auth?token=${token}`;
  
  const isInvite = !!inviterName;
  const subject = isInvite 
    ? `${inviterName} invited you to join their gratitude circle - YSMMS`
    : "Sign in to YSMMS";
  
  const html = isInvite ? `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0066FF;">
      <div style="max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: white; border-radius: 24px; padding: 40px; text-align: center;">
          <h1 style="font-family: 'Fredoka', sans-serif; color: #0066FF; font-size: 28px; margin: 0 0 20px 0;">YSMMS</h1>
          <p style="color: #FF6B35; font-size: 18px; font-weight: 600; margin: 0 0 10px 0;">
            ${inviterName} invited you to join their gratitude circle
          </p>
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
            Share what you're grateful for with friends.
          </p>
          <a href="${magicLink}" style="display: inline-block; background: #FF6B35; color: white; font-weight: bold; font-size: 16px; padding: 16px 32px; border-radius: 12px; text-decoration: none;">
            Join ${inviterName}
          </a>
          <p style="color: #888; font-size: 14px; margin: 30px 0 0 0;">
            Or hold to select and copy:
          </p>
          <div style="background: #f5f5f5; border-radius: 8px; padding: 12px; margin: 10px 0 20px 0; text-align: left;">
            <span style="font-size: 11px; word-break: break-all; color: #333; font-family: monospace; user-select: all; -webkit-user-select: all;">
              ${magicLink}
            </span>
          </div>
          <p style="color: #888; font-size: 14px; margin: 0;">
            This link expires in 7 days.
          </p>
        </div>
      </div>
    </body>
    </html>
  ` : `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0066FF;">
      <div style="max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: white; border-radius: 24px; padding: 40px; text-align: center;">
          <h1 style="font-family: 'Fredoka', sans-serif; color: #0066FF; font-size: 28px; margin: 0 0 20px 0;">YSMMS</h1>
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
            Click below to sign in to your gratitude journal.
          </p>
          <a href="${magicLink}" style="display: inline-block; background: #FF6B35; color: white; font-weight: bold; font-size: 16px; padding: 16px 32px; border-radius: 12px; text-decoration: none;">
            Sign In
          </a>
          <p style="color: #888; font-size: 14px; margin: 30px 0 0 0;">
            Or hold to select and copy:
          </p>
          <div style="background: #f5f5f5; border-radius: 8px; padding: 12px; margin: 10px 0 20px 0; text-align: left;">
            <span style="font-size: 11px; word-break: break-all; color: #333; font-family: monospace; user-select: all; -webkit-user-select: all;">
              ${magicLink}
            </span>
          </div>
          <p style="color: #888; font-size: 14px; margin: 0;">
            This link expires in 7 days.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject,
      html,
    });

    if (error) {
      console.error("Error sending email:", error);
      throw new Error(error.message);
    }

    return data;
  } catch (err) {
    console.error("Failed to send email:", err);
    throw err;
  }
}
