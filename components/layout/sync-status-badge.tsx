'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { OfflineStore } from '@/lib/offline/offline-store';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function SyncStatusBadge() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const pendingCount = useSyncExternalStore(
    OfflineStore.subscribe,
    OfflineStore.getSnapshot,
    OfflineStore.getServerSnapshot
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleManualSync = async () => {
    if (isSyncing) return; // Mutex in-flight lock

    if (!isOnline) {
      toast.info('Sem conexão com a internet', {
        description: 'As alterações salvas no seu aparelho serão enviadas automaticamente assim que a conexão for restabelecida.',
      });
      return;
    }

    if (pendingCount === 0) {
      toast.success('Todos os dados estão sincronizados!');
      return;
    }

    setIsSyncing(true);
    toast.loading('Sincronizando alterações offline...', { id: 'manual-sync-toast' });

    try {
      const { savePtsDocument } = await import('@/modules/pts/pts.services');
      const queue = await OfflineStore.getSyncQueue();
      
      let successCount = 0;
      for (const item of queue) {
        try {
          if (item.actionType === 'save_pts') {
            const payload = item.payload as { data: unknown; status: 'draft' | 'completed' };
            await savePtsDocument(item.patientId, payload.data, payload.status);
          }
          await OfflineStore.clearSyncQueueItem(item.id!);
          successCount++;
        } catch (err) {
          console.error('Falha ao sincronizar item:', err);
        }
      }
      
      if (successCount > 0) {
        toast.success(`${successCount} alteração(ões) sincronizada(s) com sucesso!`, { id: 'manual-sync-toast' });
      } else {
        toast.error('Não foi possível sincronizar no momento. Tente novamente mais tarde.', { id: 'manual-sync-toast' });
      }
    } catch (e) {
      console.error('Erro na sincronização manual:', e);
      toast.error('Erro durante a sincronização.', { id: 'manual-sync-toast' });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleManualSync}
      disabled={isSyncing}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-black uppercase tracking-wider transition-all duration-300 min-h-[48px] focus:outline-none select-none",
        isSyncing && "pointer-events-none cursor-not-allowed opacity-80",
        isOnline
          ? pendingCount > 0
            ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 shadow-sm animate-pulse"
            : "bg-slate-50 text-slate-600 border-slate-200/60 hover:bg-slate-100/80"
          : pendingCount > 0
            ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 shadow-sm animate-pulse"
            : "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
      )}
      title={
        !isOnline
          ? `Trabalhando Offline - ${pendingCount} alteração(ões) pendente(s)`
          : pendingCount > 0
            ? `${pendingCount} alteração(ões) aguardando sincronização`
            : "Conectado e sincronizado"
      }
    >
      <div className="relative flex items-center justify-center">
        <span className={cn(
          "absolute -top-1 -right-1 flex h-2 w-2 rounded-full",
          !isOnline ? "bg-rose-500 animate-ping" : pendingCount > 0 ? "bg-amber-500 animate-ping" : "bg-emerald-500"
        )} />
        <span className={cn(
          "relative h-2 w-2 rounded-full",
          !isOnline ? "bg-rose-500" : pendingCount > 0 ? "bg-amber-500" : "bg-emerald-500"
        )} />
      </div>

      <span className="flex items-center gap-1.5 font-black uppercase tracking-[0.05em] sm:tracking-[0.1em]">
        {isSyncing ? (
          <RefreshCw size={14} className="animate-spin text-amber-600" />
        ) : !isOnline ? (
          <WifiOff size={14} className="shrink-0" />
        ) : pendingCount > 0 ? (
          <RefreshCw size={14} className="shrink-0 animate-spin animate-infinite duration-1000" />
        ) : (
          <Wifi size={14} className="shrink-0 text-emerald-600" />
        )}

        <span className="hidden md:inline font-bold">
          {isSyncing
            ? "Sincronizando..."
            : !isOnline
              ? pendingCount > 0
                ? `Offline · ${pendingCount} Pendente${pendingCount > 1 ? 's' : ''}`
                : "Offline"
              : pendingCount > 0
                ? `${pendingCount} Pendente${pendingCount > 1 ? 's' : ''}`
                : "Conectado"}
        </span>
        <span className="inline md:hidden font-bold">
          {isSyncing
            ? "Sinc..."
            : !isOnline
              ? pendingCount > 0
                ? `Off · ${pendingCount}P`
                : "Off"
              : pendingCount > 0
                ? `${pendingCount}P`
                : "On"}
        </span>
      </span>
    </button>
  );
}
