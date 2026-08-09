import { integrationHub } from "../integration/IntegrationHub";

export interface IEKlaimConfig {
  baseUrl: string;
  secretKey: string;
  userKey: string;
  hospitalCode: string;
}

export interface IEKlaimResponse<T = any> {
  status: "SUCCESS" | "FAILED" | "NOT_CONFIGURED" | "OFFLINE";
  httpCode?: number;
  message: string;
  data?: T;
}

export class EKlaimAdapterLegacyForwarder {
  async testConnection(): Promise<IEKlaimResponse> {
    const res = await integrationHub.testConnection("eklaim", "tenant-default", "hospital-01");
    return {
      status: res.success ? "SUCCESS" : (res.status === "NOT_CONFIGURED" ? "NOT_CONFIGURED" : "FAILED"),
      httpCode: typeof res.externalResponseCode === 'number' ? res.externalResponseCode : undefined,
      message: res.message,
      data: res.data
    };
  }

  async submitClaim(claimData: any): Promise<IEKlaimResponse> {
    const res = await integrationHub.execute({
      adapterId: "eklaim",
      operation: "grouping",
      tenantId: "tenant-default",
      hospitalId: "hospital-01",
      payload: claimData
    });
    return {
      status: res.success ? "SUCCESS" : (res.status === "NOT_CONFIGURED" ? "NOT_CONFIGURED" : "FAILED"),
      message: res.message,
      data: res.data
    };
  }
}

export const eKlaimAdapter = new EKlaimAdapterLegacyForwarder();
