import { BaseService } from '@/services/base.service';
import { InboxNotificationsRepository } from '../repositories/inbox-notifications.repository';
import { type InboxNotification, type NotificationType } from '@/lib/db/schema/inbox-notifications';

export interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  metadata?: Record<string, any>;
  tx?: any;
}

export class NotificationService extends BaseService {
  private readonly repo: InboxNotificationsRepository;

  constructor(ctx: any) {
    super(ctx);
    this.repo = new InboxNotificationsRepository(ctx);
  }

  /**
   * Cria uma nova notificação de inbox para o usuário especificado.
   */
  async createNotification(input: CreateNotificationInput): Promise<InboxNotification> {
    return await this.repo.createNotification(
      input.userId,
      input.title,
      input.message,
      input.type,
      input.metadata,
      { tx: input.tx }
    );
  }

  /**
   * Obtém todas as notificações não lidas para o usuário do contexto atual.
   */
  async getUnreadNotifications(): Promise<InboxNotification[]> {
    if (!this.ctx.userId) {
      throw new Error('Usuário não autenticado no contexto.');
    }
    return await this.repo.getUnreadNotifications(this.ctx.userId);
  }

  /**
   * Marca uma notificação específica do usuário atual como lida.
   */
  async markAsRead(id: string): Promise<InboxNotification | undefined> {
    if (!this.ctx.userId) {
      throw new Error('Usuário não autenticado no contexto.');
    }
    return await this.repo.markAsRead(id, this.ctx.userId);
  }

  /**
   * Marca todas as notificações não lidas do usuário atual como lidas.
   */
  async markAllAsRead(): Promise<InboxNotification[]> {
    if (!this.ctx.userId) {
      throw new Error('Usuário não autenticado no contexto.');
    }
    return await this.repo.markAllAsRead(this.ctx.userId);
  }
}
