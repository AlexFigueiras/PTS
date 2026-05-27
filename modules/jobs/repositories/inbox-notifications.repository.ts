import { and, eq, isNull, desc } from 'drizzle-orm';
import { inboxNotifications, type InboxNotification, type NewInboxNotification, type NotificationType } from '@/lib/db/schema/inbox-notifications';
import { type Database, getDb } from '@/lib/db/client';
import { type TenantContext } from '@/lib/tenant-context';

export class InboxNotificationsRepository {
  private readonly db: Database;
  private readonly tenantId: string;

  constructor(ctx: TenantContext) {
    if (!ctx.tenantId) {
      throw new Error('O tenantId é obrigatório para inicializar o InboxNotificationsRepository.');
    }
    this.db = getDb();
    this.tenantId = ctx.tenantId;
  }

  /**
   * Cria uma nova notificação de inbox no banco de dados.
   * Suporta opcionalmente transação ativa (tx) para consistência no transactional outbox.
   */
  async createNotification(
    userId: string,
    title: string,
    message: string,
    type: NotificationType,
    metadata?: Record<string, any>,
    options?: { tx?: any }
  ): Promise<InboxNotification> {
    const executor = options?.tx ?? this.db;

    const [row] = await executor
      .insert(inboxNotifications)
      .values({
        tenantId: this.tenantId,
        userId,
        title,
        message,
        type,
        metadata,
      } as NewInboxNotification)
      .returning();

    return row;
  }

  /**
   * Retorna as notificações não lidas de um usuário específico sob o tenant ativo.
   */
  async getUnreadNotifications(userId: string): Promise<InboxNotification[]> {
    return await this.db
      .select()
      .from(inboxNotifications)
      .where(
        and(
          eq(inboxNotifications.tenantId, this.tenantId),
          eq(inboxNotifications.userId, userId),
          isNull(inboxNotifications.readAt)
        )
      )
      .orderBy(desc(inboxNotifications.createdAt));
  }

  /**
   * Marca uma notificação específica como lida no tenant ativo.
   */
  async markAsRead(id: string, userId: string): Promise<InboxNotification | undefined> {
    const [row] = await this.db
      .update(inboxNotifications)
      .set({
        readAt: new Date(),
      })
      .where(
        and(
          eq(inboxNotifications.id, id),
          eq(inboxNotifications.tenantId, this.tenantId),
          eq(inboxNotifications.userId, userId)
        )
      )
      .returning();

    return row;
  }

  /**
   * Marca todas as notificações não lidas do usuário como lidas no tenant ativo.
   */
  async markAllAsRead(userId: string): Promise<InboxNotification[]> {
    return await this.db
      .update(inboxNotifications)
      .set({
        readAt: new Date(),
      })
      .where(
        and(
          eq(inboxNotifications.tenantId, this.tenantId),
          eq(inboxNotifications.userId, userId),
          isNull(inboxNotifications.readAt)
        )
      )
      .returning();
  }
}
