// lib/notifications/index.ts - Sistema de alertas inteligentes
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { eq, and, gt, count, sql } from 'drizzle-orm';
import { QUOTE_EVENT_TYPES } from '@/lib/db/eventTypes';

export type NotificationType =
  | 'quote_accepted'
  | 'quote_viewed_multiple'
  | 'risk_of_loss'
  | 'closure_opportunity'
  | 'followup_needed';

export type NotificationPriority = 'low' | 'medium' | 'high';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  read: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  metadata?: Record<string, any>;
}

/**
 * Crea una notificación en la base de datos
 */
export async function createNotification(
  params: CreateNotificationParams
): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  try {
    const [notification] = await db
      .insert(notifications)
      .values({
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        priority: params.priority || 'medium',
        metadata: params.metadata || null,
      })
      .returning({ id: notifications.id });

    return { success: true, notificationId: notification.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Obtener notificaciones de un usuario
 */
export async function getUserNotifications(
  userId: string,
  options?: { unreadOnly?: boolean; limit?: number }
): Promise<AppNotification[]> {
  const conditions = [eq(notifications.userId, userId)];

  if (options?.unreadOnly) {
    conditions.push(eq(notifications.read, false));
  }

  const query = db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(notifications.createdAt.desc());

  if (options?.limit) {
    query.limit(options.limit);
  }

  return await query;
}

/**
 * Marcar como leída
 */
export async function markAsRead(notificationId: string, userId: string): Promise<boolean> {
  const result = await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));

  return result.count > 0;
}

/**
 * Marcar todas como leídas
 */
export async function markAllAsRead(userId: string): Promise<number> {
  const result = await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));

  return result.count;
}

/**
 * Contar no leídas
 */
export async function countUnread(userId: string): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));

  return Number(result[0]?.count || 0);
}

/**
 * Detectar y generar alertas inteligentes basadas en eventos
 */
export async function generateSmartAlerts(userId: string): Promise<{
  alertsGenerated: number;
  types: string[];
}> {
  const alertsGenerated = 0;
  const types: string[] = [];

  // 1. Alertar si hay presupuestos aceptados recientemente
  const recentAccepted = await db
    .select({
      quoteId: quoteEvents.quoteId,
      title: quotes.title,
      clientName: quotes.clientName,
    })
    .from(quoteEvents)
    .innerJoin(quotes, eq(quoteEvents.quoteId, quotes.id))
    .where(
      and(
        eq(quoteEvents.type, QUOTE_EVENT_TYPES.ACCEPTED),
        eq(quotes.userId, userId),
        gt(quoteEvents.createdAt, sql`NOW() - INTERVAL '24 hours'`)
      )
    );

  for (const accepted of recentAccepted) {
    await createNotification({
      userId,
      type: 'quote_accepted',
      title: 'Presupuesto Aceptado',
      message: `${accepted.clientName} aceptó "${accepted.title}"`,
      priority: 'high',
      metadata: { quoteId: accepted.quoteId },
    });
    alertsGenerated++;
    types.push('quote_accepted');
  }

  // 2. Detectar múltiples vistas (interés alto)
  const multipleViews = await db
    .select({
      quoteId: quoteEvents.quoteId,
      viewCount: count(),
      title: quotes.title,
      clientName: quotes.clientName,
    })
    .from(quoteEvents)
    .innerJoin(quotes, eq(quoteEvents.quoteId, quotes.id))
    .where(
      and(
        eq(quoteEvents.type, QUOTE_EVENT_TYPES.VIEWED),
        eq(quotes.userId, userId),
        gt(quoteEvents.createdAt, sql`NOW() - INTERVAL '7 days'`)
      )
    )
    .groupBy(quoteEvents.quoteId, quotes.title, quotes.clientName)
    .having(sql`count(*) >= 3`);

  for (const viewed of multipleViews) {
    await createNotification({
      userId,
      type: 'quote_viewed_multiple',
      title: 'Alto Interés Detectado',
      message: `${viewed.clientName} ha visto "${viewed.title}" ${viewed.viewCount} veces`,
      priority: 'high',
      metadata: { quoteId: viewed.quoteId, viewCount: viewed.viewCount },
    });
    alertsGenerated++;
    types.push('quote_viewed_multiple');
  }

  // 3. Riesgo de perder venta (sent hace 7+ días sin respuesta)
  const atRisk = await db
    .select({
      quoteId: quoteEvents.quoteId,
      title: quotes.title,
      clientName: quotes.clientName,
      sentAt: quoteEvents.createdAt,
    })
    .from(quoteEvents)
    .innerJoin(quotes, eq(quoteEvents.quoteId, quotes.id))
    .where(
      and(
        eq(quoteEvents.type, QUOTE_EVENT_TYPES.SENT),
        eq(quotes.userId, userId),
        sql`${quoteEvents.createdAt} <= NOW() - INTERVAL '7 days'`
      )
    );

  for (const risk of atRisk) {
    // Verificar que no tenga accepted/rejected después
    const laterEvents = await db
      .select({ type: quoteEvents.type })
      .from(quoteEvents)
      .where(
        and(
          eq(quoteEvents.quoteId, risk.quoteId),
          gt(quoteEvents.createdAt, risk.sentAt)
        )
      );

    const hasFinal = laterEvents.some(
      e => e.type === QUOTE_EVENT_TYPES.ACCEPTED || e.type === QUOTE_EVENT_TYPES.REJECTED
    );

    if (!hasFinal) {
      await createNotification({
        userId,
        type: 'risk_of_loss',
        title: 'Riesgo de Pérdida',
        message: `"${risk.title}" lleva 7+ días sin respuesta`,
        priority: 'high',
        metadata: { quoteId: risk.quoteId, sentAt: risk.sentAt },
      });
      alertsGenerated++;
      types.push('risk_of_loss');
    }
  }

  // 4. Oportunidad de cierre (visto pero no aceptado en 2+ días)
  const opportunities = await db
    .select({
      quoteId: quoteEvents.quoteId,
      title: quotes.title,
      clientName: quotes.clientName,
      viewedAt: quoteEvents.createdAt,
    })
    .from(quoteEvents)
    .innerJoin(quotes, eq(quoteEvents.quoteId, quotes.id))
    .where(
      and(
        eq(quoteEvents.type, QUOTE_EVENT_TYPES.VIEWED),
        eq(quotes.userId, userId),
        sql`${quoteEvents.createdAt} <= NOW() - INTERVAL '2 days'`
      )
    );

  for (const opp of opportunities) {
    const laterEvents = await db
      .select({ type: quoteEvents.type })
      .from(quoteEvents)
      .where(
        and(
          eq(quoteEvents.quoteId, opp.quoteId),
          gt(quoteEvents.createdAt, opp.viewedAt)
        )
      );

    const hasFinal = laterEvents.some(
      e => e.type === QUOTE_EVENT_TYPES.ACCEPTED || e.type === QUOTE_EVENT_TYPES.REJECTED
    );

    if (!hasFinal) {
      await createNotification({
        userId,
        type: 'closure_opportunity',
        title: 'Oportunidad de Cierre',
        message: `${opp.clientName} vio "${opp.title}", contacta para cerrar`,
        priority: 'medium',
        metadata: { quoteId: opp.quoteId, viewedAt: opp.viewedAt },
      });
      alertsGenerated++;
      types.push('closure_opportunity');
    }
  }

  return { alertsGenerated, types };
}

/**
 * Enviar alerta por email
 */
export async function sendAlertByEmail(
  userId: string,
  notification: AppNotification
): Promise<boolean> {
  try {
    const { users } = await import('@/lib/db/schema');
    const { eq } = await import('drizzle-orm');

    const user = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user[0]?.email) return false;

    const { resend } = await import('@/lib/resend');
    if (!resend) return false;

    await resend.emails.send({
      from: 'alerts@tuapp.com',
      to: user[0].email,
      subject: notification.title,
      html: `<p>${notification.message}</p>`,
    });

    return true;
  } catch (error) {
    console.error('Error sending alert email:', error);
    return false;
  }
}
