import nodemailer from "nodemailer";

const SMTP_GMAIL_USER = process.env.SMTP_GMAIL_USER;
const SMTP_GMAIL_APP_PASSWORD = process.env.SMTP_GMAIL_APP_PASSWORD;

if (!SMTP_GMAIL_USER || !SMTP_GMAIL_APP_PASSWORD) {
  throw new Error("SMTP_GMAIL_USER and SMTP_GMAIL_APP_PASSWORD must be set in the environment");
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: SMTP_GMAIL_USER, pass: SMTP_GMAIL_APP_PASSWORD },
});

export interface SendMailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendMail(input: SendMailInput): Promise<void> {
  await transporter.sendMail({
    from: `"TasdikiDocs" <${SMTP_GMAIL_USER}>`,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
}
