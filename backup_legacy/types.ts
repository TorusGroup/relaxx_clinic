
export interface DiagnosticMetrics {
  verticalAlignment: number;
  openingAmplitude: number;
  lateralDeviation: number;
  isCentered: boolean;
}

export interface TelemetryData {
  timestamp: number;
  metrics: DiagnosticMetrics;
}

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export type AppState = 'ONBOARDING' | 'PERMISSION_REQUEST' | 'COUNTDOWN' | 'CALIBRATION' | 'EXERCISE' | 'LEAD_FORM' | 'REPORTING' | 'ATM_PRECISION';

export interface UserData {
  name: string;
  whatsapp: string;
  email: string;
}
