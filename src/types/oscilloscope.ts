export type ViewMode = 'analog-trace' | 'surge-dynamics' | 'flow-dwell' | 'spatial-radar' | 'audit';

export type PacketType = '802.11 PROBE' | 'BLE 5.0 ADV' | '802.11 BEACON' | 'BLE SCAN_REQ' | '802.11 DATA';

export interface PacketEvent {
  id: string;
  index: number;
  timestamp: string;
  type: PacketType;
  freq: string;
  channel: string;
  sourceMac: string;
  rssi: number;
  snr: number;
  details: string;
  rawHex: string;
  fingerprintId: string;
  ssid?: string;
  advData?: string;
  fcsOk: boolean;
  ouiVendor?: string;
  packetLength: number;
}

export interface ScopeConfig {
  timeDiv: string;
  trigLevelMv: number;
  trigSlope: 'POS (+)' | 'NEG (-)';
  status: 'ARMED / TRIGGERED' | 'AUTO' | 'SINGLE' | 'HOLD';
  probeAtten: '1X' | '10X' | '100X';
  coupling: 'AC 50Ω' | 'DC 50Ω' | 'GND';
  offsetV: number;
  ch1VoltsDiv: number; // in mV
  ch2VoltsDiv: number; // in mV
  triggerSensPercent: number;
  triggerSensDb: number;
  sampleRate: string;
  noiseFloorDbm: number;
  isPaused: boolean;
  streamMode: 'live' | 'demo' | 'pause';
  filterType: 'all' | 'wifi' | 'ble' | 'anomalies';
}

export interface SpectrumConfig {
  centerFreqMhz: number;
  spanMhz: number;
  rbwKhz: number;
  vbwKhz: number;
  detector: 'Peak' | 'RMS' | 'MaxHold' | 'Average';
  averaging: number;
  marker1Freq: number;
  marker2Freq: number;
  waterfallSpeed: number;
}

export interface CalibrationTelemetry {
  fpgaTemp: number;
  jitterRms: number;
  pllLockMhz: number;
  pllLocked: boolean;
  ingressRateKbps: number;
  totalObservations: number;
  wifiProbes: number;
  blePackets: number;
  bufferCapacityPercent: number;
  bufferUsedKb: number;
  bufferTotalKb: number;
  hardware: string;
  ntpStatus: string;
  captureDuration: string;
  droppedPkts: number;
  fifoHealth: string;
  clkSource: string;
  baudRate: number;
  crcStatus: string;
  soundEnabled: boolean;
}
