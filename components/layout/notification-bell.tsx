'use client';

import { useEffect, useState, useTransition } from 'react';
import { Bell, Check, CheckSquare, Inbox, ShieldAlert, AlertTriangle, Info } from 'lucide-react';
import { toast } from 'sonner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
  getUnreadNotificationsAction,
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
} from '@/modules/jobs/actions';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error';
  createdAt: string | Date;
  readAt: string | Date | null;
  metadata?: any;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Função para buscar notificações não lidas
  const fetchNotifications = async () => {
    const res = await getUnreadNotificationsAction();
    if (res.success && res.data) {
      setNotifications(res.data as NotificationItem[]);
    }
  };

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const supabase = createSupabaseBrowserClient();

    const init = async () => {
      await fetchNotifications();
      if (!active) return;

      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id || null;
      if (!userId || !active) return;

      channel = supabase
        .channel('bell_notifications_sync')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'inbox_notifications',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            if (active) {
              fetchNotifications();
            }
          }
        )
        .subscribe();
    };

    init();

    return () => {
      active = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Otimismo na UI para sensação premium
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    
    const res = await markNotificationAsReadAction(id);
    if (!res.success) {
      toast.error(res.error || 'Erro ao marcar notificação como lida.');
      fetchNotifications(); // Reverte em caso de falha
    }
  };

  const handleMarkAllAsRead = async () => {
    // Otimismo na UI
    setNotifications([]);
    
    startTransition(async () => {
      const res = await markAllNotificationsAsReadAction();
      if (res.success) {
        toast.success('Todas as notificações foram marcadas como lidas.');
      } else {
        toast.error(res.error || 'Erro ao limpar notificações.');
        fetchNotifications(); // Reverte em caso de falha
      }
    });
  };

  // Formatação de data amigável
  const formatRelativeTime = (dateStr: string | Date) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `Há ${diffMins} min`;
    if (diffHours < 24) return `Há ${diffHours}h`;
    return `Há ${diffDays}d`;
  };

  const unreadCount = notifications.length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        className="relative rounded-full p-2.5 text-muted-foreground hover:bg-slate-100 hover:text-foreground focus:outline-none transition-all duration-200"
        aria-label="Abrir notificações"
      >
        <Bell className="h-5 w-5 transition-transform duration-200 group-hover:scale-105" />
        {unreadCount > 0 && (
          <>
            {/* Badge vermelha premium com efeito ping */}
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-[#F8FAFC]">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
            <span className="absolute right-1.5 top-1.5 h-4 min-w-4 animate-ping rounded-full bg-red-500 opacity-40 ring-2 ring-[#F8FAFC]" />
          </>
        )}
      </PopoverTrigger>

      <PopoverContent className="w-80 sm:w-96 p-0 bg-white/95 backdrop-blur-md border border-slate-100 shadow-2xl rounded-xl" align="end" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50/50 rounded-t-xl">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 text-sm">Notificações</span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
                {unreadCount} novas
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={isPending}
              className="h-8 px-2 text-xs text-primary hover:bg-primary/5 hover:text-primary-semibold transition-all"
            >
              <CheckSquare className="mr-1.5 h-3.5 w-3.5" />
              Limpar tudo
            </Button>
          )}
        </div>

        {/* Content List */}
        <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-50 scrollbar-thin">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <div className="rounded-full bg-slate-50 p-3 mb-3">
                <Inbox className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-xs font-semibold text-slate-700">Tudo em ordem!</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-[240px]">
                Você não possui nenhum alerta clínico ou notificação pendente no momento.
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              // Seleção de ícones e cores conforme o tipo
              let icon = <Info className="h-4 w-4 text-blue-500" />;
              let typeStyles = 'bg-blue-50/50 border-l-2 border-blue-500';

              if (notif.type === 'error') {
                icon = <ShieldAlert className="h-4 w-4 text-red-500" />;
                typeStyles = 'bg-red-50/30 border-l-2 border-red-500';
              } else if (notif.type === 'warning') {
                icon = <AlertTriangle className="h-4 w-4 text-amber-500" />;
                typeStyles = 'bg-amber-50/30 border-l-2 border-amber-500';
              }

              return (
                <div
                  key={notif.id}
                  className={`group relative flex items-start gap-3 p-4 transition-all duration-200 hover:bg-slate-50/80 ${typeStyles}`}
                >
                  {/* Ícone de status */}
                  <div className="mt-0.5 shrink-0 rounded-full p-1 bg-white shadow-xs">
                    {icon}
                  </div>

                  {/* Textos */}
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-xs font-semibold text-slate-800">
                        {notif.title}
                      </span>
                      <span className="shrink-0 text-[10px] text-slate-400">
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500 break-words line-clamp-3">
                      {notif.message}
                    </p>
                  </div>

                  {/* Ação: Marcar como lida */}
                  <button
                    onClick={(e) => handleMarkAsRead(notif.id, e)}
                    className="absolute right-3 top-4 rounded-md p-1 text-slate-300 hover:bg-white hover:text-emerald-600 hover:shadow-xs transition-all duration-150 focus:outline-none opacity-0 group-hover:opacity-100"
                    title="Marcar como lida"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
