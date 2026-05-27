const DB_NAME = 'PtsOfflineDB';
const DB_VERSION = 1;

export interface SyncMutation {
  id?: number;
  patientId: string;
  actionType: 'save_pts' | 'create_evolution';
  payload: unknown;
  timestamp: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Store de rascunhos de PTS
      if (!db.objectStoreNames.contains('drafts')) {
        db.createObjectStore('drafts', { keyPath: 'patientId' });
      }

      // Store de fila de sincronização
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

export class OfflineStore {
  private static listeners: (() => void)[] = [];
  private static pendingCount: number = 0;

  private static emit(): void {
    for (const listener of OfflineStore.listeners) {
      listener();
    }
  }

  static subscribe(listener: () => void): () => void {
    OfflineStore.listeners.push(listener);
    // Dispara a contagem inicial em background para atualizar o valor
    OfflineStore.updatePendingCount();

    return () => {
      OfflineStore.listeners = OfflineStore.listeners.filter(l => l !== listener);
    };
  }

  static getSnapshot(): number {
    return OfflineStore.pendingCount;
  }

  static getServerSnapshot(): number {
    return 0;
  }

  static async updatePendingCount(): Promise<void> {
    try {
      const queue = await OfflineStore.getSyncQueue();
      if (OfflineStore.pendingCount !== queue.length) {
        OfflineStore.pendingCount = queue.length;
        OfflineStore.emit();
      }
    } catch (e) {
      console.error('Erro ao atualizar contagem pendente para o snapshot offline:', e);
    }
  }

  /**
   * Grava um rascunho completo de PTS localmente na IndexedDB.
   */
  static async saveDraft(patientId: string, data: unknown): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('drafts', 'readwrite');
      const store = tx.objectStore('drafts');
      const request = store.put({ patientId, data, updatedAt: Date.now() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Obtém um rascunho de PTS local pelo patientId.
   */
  static async getDraft(patientId: string): Promise<unknown | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('drafts', 'readonly');
      const store = tx.objectStore('drafts');
      const request = store.get(patientId);

      request.onsuccess = () => {
        resolve(request.result ? (request.result as Record<string, unknown>).data : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Limpa o rascunho local de um paciente após sincronização de sucesso.
   */
  static async clearDraft(patientId: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('drafts', 'readwrite');
      const store = tx.objectStore('drafts');
      const request = store.delete(patientId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Adiciona uma mutação pendente (save PTS ou evolução) na fila de sincronização offline.
   */
  static async enqueueSyncMutation(
    patientId: string,
    actionType: 'save_pts' | 'create_evolution',
    payload: unknown
  ): Promise<number> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncQueue', 'readwrite');
      const store = tx.objectStore('syncQueue');
      const mutation: SyncMutation = {
        patientId,
        actionType,
        payload,
        timestamp: Date.now()
      };
      const request = store.add(mutation);

      request.onsuccess = () => {
        resolve(request.result as number);
        OfflineStore.updatePendingCount();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Obtém todas as mutações na fila de sincronização pendentes de conexão.
   */
  static async getSyncQueue(): Promise<SyncMutation[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncQueue', 'readonly');
      const store = tx.objectStore('syncQueue');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Remove um item da fila de sincronização após sincronizar na API online.
   */
  static async clearSyncQueueItem(id: number): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncQueue', 'readwrite');
      const store = tx.objectStore('syncQueue');
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
        OfflineStore.updatePendingCount();
      };
      request.onerror = () => reject(request.error);
    });
  }
}
