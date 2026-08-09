import { integrationRegistry } from "./IntegrationRegistry";
import { SIMRSAdapter } from "./adapters/SIMRSAdapter";
import { EKlaimAdapter } from "./adapters/EKlaimAdapter";
import { VClaimAdapter } from "./adapters/VClaimAdapter";
import { MockEKlaimAdapter } from "./adapters/MockEKlaimAdapter";
import { MockVClaimAdapter } from "./adapters/MockVClaimAdapter";
import { integrationConfigRepository } from "./repositories/IntegrationConfigRepository";

export async function initializeIntegrationHub() {
  // Register Real Adapters
  integrationRegistry.register(new SIMRSAdapter());
  integrationRegistry.register(new EKlaimAdapter());
  integrationRegistry.register(new VClaimAdapter());

  // Register Mock Adapters
  integrationRegistry.register(new MockEKlaimAdapter());
  integrationRegistry.register(new MockVClaimAdapter());

  // Seed default MOCK configurations
  await integrationConfigRepository.save({
    tenantId: "tenant-default",
    hospitalId: "hospital-01",
    adapterId: "eklaim",
    environment: "MOCK",
    baseUrl: "https://mock.eklaim.sandbox.local",
    credentials: { mockKey: "MOCK_SECRET_KEY" },
    status: "MOCK_CONNECTED"
  });

  await integrationConfigRepository.save({
    tenantId: "tenant-default",
    hospitalId: "hospital-01",
    adapterId: "vclaim",
    environment: "MOCK",
    baseUrl: "https://mock.vclaim.sandbox.local",
    credentials: { consId: "MOCK_CONS_ID", secretKey: "MOCK_SECRET_KEY", userKey: "MOCK_USER_KEY" },
    status: "MOCK_CONNECTED"
  });

  console.log("[IntegrationHub] Initialized and registered 5 adapters (3 Real + 2 Mock Sandbox Adapters). Default environment: MOCK.");
}
