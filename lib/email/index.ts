// lib/email/index.ts - Sistema de envío de emails con tracking
import { db } from '@/lib/db';
import { emailTracking } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  quoteId: string;
  eventType?: string; // ej: QUOTE_SENT, QUOTE_FOLLOWUP_SENT
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  emailId?: string;
  error?: string;
}

export async function sendTrackedEmail(params: SendEmailParams): Promise<SendEmailResult> {
  if (!resend) {
    return { success: false, error: 'Resend API key not configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: params.from || 'noreply@tuapp.com',
      to: Array.isArray(params.to) ? params.to : [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
      reply_to: params.replyTo,
      tags: [
        { name: 'quoteId', value: params.quoteId },
        { name: 'eventType', value: params.eventType || 'unknown' },
      ],
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    if (data?.id) {
      // Registrar en email_tracking
      await db.insert(emailTracking).values({
        emailId: data.id,
        quoteId: params.quoteId,
        eventType: params.eventType || 'unknown',
        recipientEmail: Array.isArray(params.to) ? params.to[0] : params.to,
      });
    }

    return { success: true, emailId: data?.id };
  } catch (error) {
    console.error('Error sending tracked email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getEmailTracking(emailId: string) {
  const tracking = await db
    .select()
    .from(emailTracking)
    .where(eq(emailTracking.emailId, emailId))
    .limit(1);

  return tracking[0] || null;
}

export async function getQuoteEmails(quoteId: string) {
  return await db
    .select()
    .from(emailTracking)
    .where(eq(emailTracking.quoteId, quoteId))
    .orderBy(emailTracking.createdAt);
}
