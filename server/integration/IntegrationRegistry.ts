import { 
  IIntegrationRegistry, 
  IIntegrationAdapter, 
  AdapterMetadata 
} from "./Interfaces";
import { integrationConfigRepository } from "./repositories/IntegrationConfigRepository";

export class IntegrationRegistry implements IIntegrationRegistry {
  private adapters: Map<string, IIntegrationAdapter> = new Map();

  register(adapter: IIntegrationAdapter): void {
    const meta = adapter.getMetadata();
    if (!meta.adapterId) {
      throw new Error("Adapter registration failed: missing adapterId");
    }
    this.adapters.set(meta.adapterId.toLowerCase(), adapter);
    console.log(`[IntegrationRegistry] Registered adapter: ${meta.name} (${meta.adapterId})`);
  }

  getAdapter(adapterId: string): IIntegrationAdapter | null {
    return this.adapters.get(adapterId.toLowerCase()) || null;
  }

  listAdapters(): AdapterMetadata[] {
    return Array.from(this.adapters.values()).map(a => a.getMetadata());
  }

  getAvailableCapabilities(adapterId: string): string[] {
    const adapter = this.getAdapter(adapterId);
    return adapter ? adapter.getCapabilities() : [];
  }

  async isConfigured(adapterId: string, tenantId: string, hospitalId: string): Promise<boolean> {
    const config = await integrationConfigRepository.findByAdapter(adapterId, tenantId, hospitalId);
    if (!config) return false;
    const adapter = this.getAdapter(adapterId);
    return adapter ? adapter.validateConfiguration(config) : false;
  }
}

export const integrationRegistry = new IntegrationRegistry();
