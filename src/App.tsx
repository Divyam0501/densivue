/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ViewMode, ScopeConfig, SpectrumConfig, CalibrationTelemetry, PacketEvent } from './types/oscilloscope';
import { INITIAL_PACKETS, SAMPLE_BSSIDS, SAMPLE_SSIDS, generateRawHex, computeFingerprintId } from './utils/packetGenerator';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HexDumpModal } from './components/HexDumpModal';
import { AlertDetailModal } from './components/AlertDetailModal';
import { AnalogTraceView } from './views/AnalogTraceView';
import { SurgeDynamicsView } from './views/SurgeDynamicsView';
import { SpectrumAnalyzerView } from './views/SpectrumAnalyzerView';
import { ProtocolBusView } from './views/ProtocolBusView';
import { CalibrationView } from './views/CalibrationView';
import { playRelayClack, playTactileClick } from './utils/audioFeedback';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('analog-trace');
  const [inspectingPacket, setInspectingPacket] = useState<PacketEvent | null>(null);
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Scope Configuration State
  const [scopeConfig, setScopeConfig] = useState<ScopeConfig>({
    timeDiv: '25ms',
    trigLevelMv: 140,
    trigSlope: 'POS (+)',
    status: 'ARMED / TRIGGERED',
    probeAtten: '10X',
    coupling: 'AC 50Ω',
    offsetV: 0.0,
    ch1VoltsDiv: 100,
    ch2VoltsDiv: 50,
    triggerSensPercent: 72,
    triggerSensDb: 1.4,
    sampleRate: '2.5 GS/s',
    noiseFloorDbm: -94,
    isPaused: false,
    streamMode: 'live',
    filterType: 'all',
  });

  // Spectrum Analyzer Config State
  const [spectrumConfig, setSpectrumConfig] = useState<SpectrumConfig>({
    centerFreqMhz: 2442.0,
    spanMhz: 100,
    rbwKhz: 100,
    vbwKhz: 30,
    detector: 'Peak',
    averaging: 16,
    marker1Freq: 2437.0,
    marker2Freq: 2462.0,
    waterfallSpeed: 1,
  });

  // Hardware Telemetry State
  const [telemetry, setTelemetry] = useState<CalibrationTelemetry>({
    fpgaTemp: 41.8,
    jitterRms: 1.12,
    pllLockMhz: 2442.0,
    pllLocked: true,
    ingressRateKbps: 923.58,
    totalObservations: 14949,
    wifiProbes: 9444,
    blePackets: 5505,
    bufferCapacityPercent: 78,
    bufferUsedKb: 800,
    bufferTotalKb: 1024,
    hardware: 'ESP32-S3 CORE via USB TTYUSB0',
    ntpStatus: 'LOCKED (STRATUM 1)',
    captureDuration: '04:18:22',
    droppedPkts: 0,
    fifoHealth: '100% OK',
    clkSource: 'INTERNAL 10.000MHz',
    baudRate: 921600,
    crcStatus: 'PASSED (0 ERR)',
    soundEnabled: true,
  });

  // Live Demodulated Packet Buffer
  const [packets, setPackets] = useState<PacketEvent[]>(INITIAL_PACKETS);

  // Background Telemetry Simulation Loop (Ingress, Packets, Jitter, Temp)
  useEffect(() => {
    const timer = setInterval(() => {
      if (scopeConfig.streamMode === 'pause') return;

      const incWifi = Math.random() > 0.45 ? 1 : 0;
      const incBle = Math.random() > 0.65 ? 1 : 0;
      const incTotal = incWifi + incBle;

      setTelemetry((prev) => {
        // Duration increment
        const nextObs = prev.totalObservations + incTotal;
        const nextWifi = prev.wifiProbes + incWifi;
        const nextBle = prev.blePackets + incBle;

        const nextIngress = parseFloat((918 + Math.random() * 8.5).toFixed(2));
        const nextTemp = parseFloat((41.7 + Math.random() * 0.25).toFixed(1));
        const nextJitter = parseFloat((1.11 + (Math.random() - 0.5) * 0.04).toFixed(2));

        return {
          ...prev,
          totalObservations: nextObs,
          wifiProbes: nextWifi,
          blePackets: nextBle,
          ingressRateKbps: nextIngress,
          fpgaTemp: nextTemp,
          jitterRms: nextJitter,
        };
      });

      // Occasionally insert a live packet into the list
      if (Math.random() < 0.4) {
        const isWifi = incWifi > 0;
        const now = new Date();
        const timeStr = `${now.toTimeString().split(' ')[0]}.${String(now.getMilliseconds()).padStart(3, '0')}`;
        const bssidObj = SAMPLE_BSSIDS[Math.floor(Math.random() * SAMPLE_BSSIDS.length)];
        const ssid = SAMPLE_SSIDS[Math.floor(Math.random() * SAMPLE_SSIDS.length)];
        const rssi = -(38 + Math.floor(Math.random() * 45));
        const snr = 14 + Math.floor(Math.random() * 18);
        const nextIdx = telemetry.totalObservations + 1;

        const newPkt: PacketEvent = {
          id: `pkt-${Date.now()}-${Math.random()}`,
          index: nextIdx,
          timestamp: timeStr,
          type: isWifi ? '802.11 PROBE' : 'BLE 5.0 ADV',
          freq: isWifi ? '2462 MHz [CH 11]' : '2402 MHz [CH 37]',
          channel: isWifi ? '11' : '37',
          sourceMac: bssidObj.mac,
          fingerprintId: computeFingerprintId(bssidObj.mac),
          rssi,
          snr,
          details: isWifi ? `SSID: "${ssid}" • DIRECTED` : 'ADV_IND • AD: 0x09 COMPLETE_NAME',
          ssid: isWifi ? ssid : undefined,
          rawHex: generateRawHex(isWifi ? '802.11 PROBE' : 'BLE 5.0 ADV', bssidObj.mac, isWifi ? ssid : undefined),
          fcsOk: true,
          ouiVendor: bssidObj.vendor,
          packetLength: isWifi ? 68 : 39,
        };

        setPackets((prev) => [newPkt, ...prev.slice(0, 39)]);
      }
    }, 450);

    return () => clearInterval(timer);
  }, [scopeConfig.streamMode, telemetry.totalObservations]);

  // Duration Stopwatch timer
  useEffect(() => {
    const secTimer = setInterval(() => {
      setTelemetry((prev) => {
        const parts = prev.captureDuration.split(':').map(Number);
        let [h, m, s] = parts;
        s++;
        if (s >= 60) {
          s = 0;
          m++;
          if (m >= 60) {
            m = 0;
            h++;
          }
        }
        const str = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        return { ...prev, captureDuration: str };
      });
    }, 1000);

    return () => clearInterval(secTimer);
  }, []);

  const handleToggleSound = () => {
    const next = !telemetry.soundEnabled;
    setTelemetry((prev) => ({ ...prev, soundEnabled: next }));
    if (next) playTactileClick();
    showToast(next ? 'ACOUSTIC BEEPER ENABLED' : 'ACOUSTIC BEEPER MUTED');
  };

  const handleCycleTrigMode = () => {
    if (telemetry.soundEnabled) playRelayClack();
    const modes: ('ARMED / TRIGGERED' | 'AUTO' | 'SINGLE')[] = ['ARMED / TRIGGERED', 'AUTO', 'SINGLE'];
    setScopeConfig((prev) => {
      const idx = modes.indexOf(prev.status as any);
      const next = modes[(idx + 1) % modes.length];
      showToast(`TRIGGER MODE: ${next}`);
      return { ...prev, status: next };
    });
  };

  const handleSnapshot = () => {
    if (telemetry.soundEnabled) playRelayClack();
    showToast('CRT PHOSPHOR FRAME SAVED TO DISK BUFFER');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  };

  return (
    <div className="min-h-screen bg-background text-on-surface antialiased font-sans select-none flex flex-col">
      {/* Fixed Full-Width Top Header & Navigation Bar */}
      <Header
        currentView={currentView}
        onSelectView={(view) => {
          if (telemetry.soundEnabled) playTactileClick();
          setCurrentView(view);
        }}
        telemetry={telemetry}
        config={scopeConfig}
        onToggleSound={handleToggleSound}
        onCycleTrigMode={handleCycleTrigMode}
        onSnapshot={handleSnapshot}
      />

      {/* Main Full-Width View Area */}
      <div className="w-full flex-1">
        <main className="w-full pt-[104px] pb-10 min-h-screen bg-background px-margin-desktop">
          {currentView === 'analog-trace' && (
            <AnalogTraceView
              config={scopeConfig}
              setConfig={setScopeConfig}
              telemetry={telemetry}
              setTelemetry={setTelemetry}
              packets={packets}
              onInspectPacket={(pkt) => setInspectingPacket(pkt)}
              onOpenAlertModal={() => setAlertModalOpen(true)}
            />
          )}

          {currentView === 'surge-dynamics' && (
            <SurgeDynamicsView
              telemetry={telemetry}
              packets={packets}
              onInspectPacket={(pkt) => setInspectingPacket(pkt)}
            />
          )}

          {currentView === 'flow-dwell' && (
            <SpectrumAnalyzerView
              telemetry={telemetry}
              config={spectrumConfig}
              setConfig={setSpectrumConfig}
            />
          )}

          {currentView === 'spatial-radar' && (
            <ProtocolBusView
              packets={packets}
              telemetry={telemetry}
              onInspectPacket={(pkt) => setInspectingPacket(pkt)}
            />
          )}

          {currentView === 'audit' && (
            <CalibrationView
              telemetry={telemetry}
              setTelemetry={setTelemetry}
            />
          )}
        </main>
      </div>

      {/* Fixed Bottom Instrument Footer */}
      <Footer telemetry={telemetry} />

      {/* Hex Dump Modal */}
      <HexDumpModal
        packet={inspectingPacket}
        onClose={() => setInspectingPacket(null)}
      />

      {/* Anomaly Inspection Modal */}
      <AlertDetailModal
        isOpen={alertModalOpen}
        onClose={() => setAlertModalOpen(false)}
        onInspectPacket={(pkt) => setInspectingPacket(pkt)}
        samplePacket={packets[0]}
      />

      {/* Transient Action Toast */}
      {toastMessage && (
        <div className="fixed bottom-12 right-6 z-50 bg-primary-container text-on-primary-container px-space-md py-space-sm font-label-sm font-bold shadow-xl border border-primary/50 flex items-center gap-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-white"></span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
