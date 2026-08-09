import { integrationHub } from "../integration/IntegrationHub";

export interface IVClaimConfig {
  baseUrl: string;
  consId: string;
  secretKey: string;
  userKey: string;
}

export interface IVClaimResponse<T = any> {
  status: "SUCCESS" | "FAILED" | "NOT_CONFIGURED" | "OFFLINE";
  httpCode?: number;
  message: string;
  data?: T;
}

export class VClaimAdapterLegacyForwarder {
  async testConnection(): Promise<IVClaimResponse> {
    const res = await integrationHub.testConnection("vclaim", "tenant-default", "hospital-01");
    return {
      status: res.success ? "SUCCESS" : (res.status === "NOT_CONFIGURED" ? "NOT_CONFIGURED" : "FAILED"),
      httpCode: typeof res.externalResponseCode === 'number' ? res.externalResponseCode : undefined,
      message: res.message,
      data: res.data
    };
  }
}

export const vClaimAdapter = new VClaimAdapterLegacyForwarder();
