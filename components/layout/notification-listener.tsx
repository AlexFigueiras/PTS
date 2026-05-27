'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

interface NotificationListenerProps {
  userId: string;
}

export function NotificationListener({ userId }: NotificationListenerProps) {
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;

    const supabase = createSupabaseBrowserClient();

    // Configura a inscrição Realtime para escutar inserções na tabela inbox_notifications
    const channel = supabase
      .channel(`inbox_notifications_user_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'inbox_notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as any;
          if (!newNotif) return;

          // Exibe o toast correspondente ao tipo de notificação com micro-animação
          const toastOptions = {
            description: newNotif.message,
            duration: newNotif.type === 'error' ? 8000 : 5000,
          };

          if (newNotif.type === 'error') {
            toast.error(newNotif.title, toastOptions);
          } else if (newNotif.type === 'warning') {
            toast.warning(newNotif.title, toastOptions);
          } else {
            toast.success(newNotif.title, toastOptions);
          }

          // Dispara um refresh sutil da rota ativa para atualizar o sino de notificações
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, router]);

  // Componente puramente funcional invisível
  return null;
}
