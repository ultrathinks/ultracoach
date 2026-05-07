import type { Transporter } from "nodemailer";
import nodemailer from "nodemailer";
import { db } from "../db";
import { emailJobs } from "../db/schema";

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;
  const port = Number(process.env.SMTP_PORT ?? 587);
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
    pool: true,
    maxConnections: 3,
  });
  return transporter;
}

export interface EnqueueEmailInput {
  to: string;
  subject: string;
  template: string;
  payload: Record<string, unknown>;
  priority?: number;
  locale?: "ko" | "en";
}

export async function enqueueEmail(input: EnqueueEmailInput): Promise<void> {
  await db.insert(emailJobs).values({
    to: input.to,
    subject: input.subject,
    template: input.template,
    payload: input.payload,
    priority: input.priority ?? 5,
    locale: input.locale ?? "ko",
    status: "pending",
  });
}

export interface SendRawEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendRawEmail(input: SendRawEmailInput): Promise<void> {
  if (!process.env.SMTP_FROM) {
    throw new Error("missing SMTP_FROM");
  }
  await getTransporter().sendMail({
    from: process.env.SMTP_FROM,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
}

export async function sendDiscordAlert(message: string): Promise<void> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message }),
    });
  } catch (err) {
    console.warn("discord alert failed:", err);
  }
}
