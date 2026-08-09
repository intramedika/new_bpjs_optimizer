import { syncQueueRepository, SyncQueueItem } from "../repositories/SyncQueueRepository";

export class SyncEngine {
  private isSyncing = false;

  async triggerSync(): Promise<{ synced: number; failed: number }> {
    if (this.isSyncing) return { synced: 0, failed: 0 };
    
    this.isSyncing = true;
    let synced = 0;
    let failed = 0;

    try {
      const pendingItems = await syncQueueRepository.getPendingItems();
      
      for (const item of pendingItems) {
        await syncQueueRepository.updateStatus(item.id, "SYNCING");
        
        try {
          // Simulated network delay and submission to Central Server
          await new Promise(resolve => setTimeout(resolve, 800));
          
          // Randomly fail sometimes to demonstrate offline/retry logic, but generally succeed
          if (Math.random() > 0.9) {
            throw new Error("Central server timeout");
          }

          // In a real implementation:
          // await axios.post('https://central-server.com/api/sync', item.payload);

          await syncQueueRepository.updateStatus(item.id, "SYNCED");
          synced++;
        } catch (error: any) {
          await syncQueueRepository.updateStatus(item.id, "FAILED", error.message);
          failed++;
        }
      }
    } finally {
      this.isSyncing = false;
    }

    return { synced, failed };
  }
}

export const syncEngine = new SyncEngine();
