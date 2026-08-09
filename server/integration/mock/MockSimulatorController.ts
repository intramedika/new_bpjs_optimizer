export type SimulationMode = 
  | "SUCCESS"
  | "VALIDATION_ERROR"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "AUTH_ERROR"
  | "RATE_LIMIT"
  | "SERVER_ERROR"
  | "OFFLINE";

export class MockSimulatorController {
  private modes: Map<string, SimulationMode> = new Map();

  setSimulationMode(adapterId: string, mode: SimulationMode): void {
    this.modes.set(adapterId.toLowerCase(), mode);
    console.log(`[MockSimulatorController] Set ${adapterId} simulation mode to: ${mode}`);
  }

  getSimulationMode(adapterId: string): SimulationMode {
    return this.modes.get(adapterId.toLowerCase()) || "SUCCESS";
  }

  evaluateMode(adapterId: string): { isFailure: boolean; mode: SimulationMode } {
    const mode = this.getSimulationMode(adapterId);
    return {
      isFailure: mode !== "SUCCESS",
      mode
    };
  }
}

export const mockSimulatorController = new MockSimulatorController();
