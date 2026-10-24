import React, { useState, useEffect, useRef } from 'react';
import { CalibrationTelemetry, PacketEvent } from '../types/oscilloscope';
import { playTactileClick, playRelayClack } from '../utils/audioFeedback';

interface ProtocolBusViewProps {
  packets: PacketEvent[];
  telemetry: CalibrationTelemetry;
  onInspectPacket: (packet: PacketEvent) => void;
}

interface RadarBlip {
  id: string;
  angle: number; // in degrees (0 - 360)
  distance: number; // in meters (0 - 5.0)
  zone: 'core' | 'mid' | 'perimeter';
  rssi: number;
  mac: string;
  fingerprintId: string;
  label?: string;
  pulsePhase: number;
}

export const ProtocolBusView: React.FC<ProtocolBusViewProps> = ({
  telemetry,
}) => {
  const [sweepAngle, setSweepAngle] = useState(0);
  const [rpm, setRpm] = useState<30 | 15 | 60>(30);
  const [isFrozen, setIsFrozen] = useState(false);
  const [selectedBlip, setSelectedBlip] = useState<RadarBlip | null>(null);

  // 34 Target blips (6 in core < 1.5m, 18 in mid-surge 1.5-3.5m, 10 in perimeter > 3.5m)
  const initialBlips: RadarBlip[] = [
    // Core Blips (6 PAX, < 1.5m, Red)
    { id: 'c1', angle: 25, distance: 0.85, zone: 'core', rssi: -58, mac: 'DC:54:75:A1:04:F2', fingerprintId: 'FP-A104', label: '#L1', pulsePhase: 0 },
    { id: 'c2', angle: 110, distance: 1.15, zone: 'core', rssi: -61, mac: '64:E8:33:9A:88:C1', fingerprintId: 'FP-9A88', pulsePhase: 0.3 },
    { id: 'c3', angle: 195, distance: 0.95, zone: 'core', rssi: -59, mac: '70:B3:D5:1B:4F:90', fingerprintId: 'FP-1B4F', pulsePhase: 0.6 },
    { id: 'c4', angle: 245, distance: 1.30, zone: 'core', rssi: -63, mac: '3C:71:BF:88:D1:44', fingerprintId: 'FP-88D1', pulsePhase: 0.2 },
    { id: 'c5', angle: 300, distance: 0.70, zone: 'core', rssi: -56, mac: 'E4:65:B8:3C:99:A7', fingerprintId: 'FP-3C99', pulsePhase: 0.8 },
    { id: 'c6', angle: 340, distance: 1.25, zone: 'core', rssi: -62, mac: 'A8:03:2A:F5:2B:13', fingerprintId: 'FP-F52B', pulsePhase: 0.5 },

    // Mid-Surge Blips (18 PAX, 1.5m - 3.5m, Amber)
    { id: 'm1', angle: 15, distance: 2.10, zone: 'mid', rssi: -68, mac: '08:3A:F2:66:31:DE', fingerprintId: 'FP-6631', pulsePhase: 0.1 },
    { id: 'm2', angle: 38, distance: 2.85, zone: 'mid', rssi: -71, mac: '24:4C:AB:12:44:88', fingerprintId: 'FP-1244', pulsePhase: 0.4 },
    { id: 'm3', angle: 55, distance: 3.30, zone: 'mid', rssi: -74, mac: 'AC:67:84:DF:50:B2', fingerprintId: 'FP-DF50', pulsePhase: 0.7 },
    { id: 'm4', angle: 78, distance: 2.45, zone: 'mid', rssi: -69, mac: '58:BF:25:7A:1C:33', fingerprintId: 'FP-7A1C', pulsePhase: 0.2 },
    { id: 'm5', angle: 102, distance: 3.10, zone: 'mid', rssi: -73, mac: 'B0:A7:32:89:FE:41', fingerprintId: 'FP-89FE', pulsePhase: 0.9 },
    { id: 'm6', angle: 125, distance: 2.20, zone: 'mid', rssi: -68, mac: 'CC:50:E3:66:77:99', fingerprintId: 'FP-6677', pulsePhase: 0.3 },
    { id: 'm7', angle: 145, distance: 2.90, zone: 'mid', rssi: -72, mac: '18:FE:34:CD:12:90', fingerprintId: 'FP-CD12', pulsePhase: 0.5 },
    { id: 'm8', angle: 165, distance: 3.40, zone: 'mid', rssi: -74, mac: '90:38:0A:88:BB:55', fingerprintId: 'FP-88BB', pulsePhase: 0.8 },
    { id: 'm9', angle: 188, distance: 2.30, zone: 'mid', rssi: -69, mac: '30:AE:A4:77:12:33', fingerprintId: 'FP-7712', pulsePhase: 0.1 },
    { id: 'm10', angle: 210, distance: 2.75, zone: 'mid', rssi: -71, mac: '7C:2E:BD:44:AA:22', fingerprintId: 'FP-44AA', pulsePhase: 0.6 },
    { id: 'm11', angle: 232, distance: 3.20, zone: 'mid', rssi: -73, mac: 'F4:12:FA:99:33:11', fingerprintId: 'FP-9933', pulsePhase: 0.4 },
    { id: 'm12', angle: 255, distance: 2.05, zone: 'mid', rssi: -67, mac: '48:3F:DA:11:88:77', fingerprintId: 'FP-1188', pulsePhase: 0.2 },
    { id: 'm13', angle: 275, distance: 3.00, zone: 'mid', rssi: -72, mac: '84:CC:A8:66:55:44', fingerprintId: 'FP-6655', pulsePhase: 0.7 },
    { id: 'm14', angle: 295, distance: 2.60, zone: 'mid', rssi: -70, mac: 'D8:BC:38:22:99:00', fingerprintId: 'FP-2299', pulsePhase: 0.5 },
    { id: 'm15', angle: 312, distance: 3.35, zone: 'mid', rssi: -74, mac: '20:17:42:55:EE:88', fingerprintId: 'FP-55EE', pulsePhase: 0.3 },
    { id: 'm16', angle: 328, distance: 2.15, zone: 'mid', rssi: -68, mac: '60:01:94:33:AA:77', fingerprintId: 'FP-33AA', pulsePhase: 0.9 },
    { id: 'm17', angle: 345, distance: 2.80, zone: 'mid', rssi: -71, mac: 'A4:CF:12:77:44:33', fingerprintId: 'FP-7744', pulsePhase: 0.2 },
    { id: 'm18', angle: 358, distance: 3.15, zone: 'mid', rssi: -73, mac: 'E0:98:06:88:11:22', fingerprintId: 'FP-8811', pulsePhase: 0.6 },

    // Perimeter Flow Blips (10 PAX, > 3.5m, Green)
    { id: 'p1', angle: 22, distance: 4.40, zone: 'perimeter', rssi: -82, mac: '14:2D:27:A9:01:44', fingerprintId: 'FP-A901', pulsePhase: 0.1 },
    { id: 'p2', angle: 68, distance: 4.80, zone: 'perimeter', rssi: -85, mac: '5C:CF:7F:11:22:33', fingerprintId: 'FP-1122', pulsePhase: 0.5 },
    { id: 'p3', angle: 98, distance: 3.90, zone: 'perimeter', rssi: -78, mac: '94:B4:0F:44:55:66', fingerprintId: 'FP-4455', pulsePhase: 0.8 },
    { id: 'p4', angle: 130, distance: 4.60, zone: 'perimeter', rssi: -83, mac: 'D0:EF:C7:77:88:99', fingerprintId: 'FP-7788', pulsePhase: 0.3 },
    { id: 'p5', angle: 172, distance: 4.20, zone: 'perimeter', rssi: -80, mac: '00:1A:7D:AA:BB:CC', fingerprintId: 'FP-AABB', pulsePhase: 0.7 },
    { id: 'p6', angle: 215, distance: 4.70, zone: 'perimeter', rssi: -84, mac: '38:2B:78:DD:EE:FF', fingerprintId: 'FP-DDEE', pulsePhase: 0.2 },
    { id: 'p7', angle: 260, distance: 4.05, zone: 'perimeter', rssi: -79, mac: '74:4D:28:11:33:55', fingerprintId: 'FP-1133', pulsePhase: 0.9 },
    { id: 'p8', angle: 288, distance: 4.55, zone: 'perimeter', rssi: -83, mac: 'B8:27:EB:77:99:BB', fingerprintId: 'FP-7799', pulsePhase: 0.4 },
    { id: 'p9', angle: 320, distance: 4.15, zone: 'perimeter', rssi: -80, mac: 'F0:08:D1:33:55:77', fingerprintId: 'FP-3355', pulsePhase: 0.6 },
    { id: 'p10', angle: 350, distance: 4.85, zone: 'perimeter', rssi: -86, mac: '2C:F4:32:88:00:22', fingerprintId: 'FP-8800', pulsePhase: 0.1 },
  ];

  const [blips] = useState<RadarBlip[]>(initialBlips);

  // Radar sweep animation loop (30 RPM = 1 turn per 2000ms = 0.18 deg/ms)
  const lastTimeRef = useRef<number>(performance.now());
  useEffect(() => {
    let animId: number;

    const animateSweep = (now: number) => {
      const dt = now - lastTimeRef.current;
      lastTimeRef.current = now;

      if (!isFrozen) {
        // deg per ms = (rpm * 360) / 60000 = rpm * 0.006
        const speed = rpm * 0.006;
        setSweepAngle((prev) => (prev + dt * speed) % 360);
      }

      animId = requestAnimationFrame(animateSweep);
    };

    animId = requestAnimationFrame(animateSweep);
    return () => cancelAnimationFrame(animId);
  }, [rpm, isFrozen]);

  // Convert polar (angle, distance) to SVG coordinates (center 500, 500; radius 5m = 440px)
  const polarToXY = (angleDeg: number, distMeters: number) => {
    const scale = 440 / 5.0; // 88px per meter
    // In radar coords, 0 deg is North (top, y-negative)
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    const r = distMeters * scale;
    return {
      x: 500 + r * Math.cos(rad),
      y: 500 + r * Math.sin(rad),
    };
  };

  const coreRadiusPx = 1.5 * (440 / 5.0); // 132px
  const midRadiusPx = 3.5 * (440 / 5.0); // 308px
  const outerRadiusPx = 5.0 * (440 / 5.0); // 440px

  const handleCycleRpm = () => {
    if (telemetry.soundEnabled) playTactileClick();
    setRpm((prev) => (prev === 30 ? 60 : prev === 60 ? 15 : 30));
  };

  const handleToggleFreeze = () => {
    if (telemetry.soundEnabled) playRelayClack();
    setIsFrozen((prev) => !prev);
  };

  return (
    <div className="w-full flex flex-col gap-2.5 max-w-full font-body-md text-on-surface antialiased select-none pb-12">
      {/* TOP CHASSIS BANNER */}
      <header className="bg-[#0b100d] border border-[#17251a] p-2.5 rounded flex flex-col gap-1.5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 font-label-md text-xs text-[#dbe4dc] border-b border-[#17251a] pb-1.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#39ff14] animate-pulse shadow-[0_0_10px_#39ff14]"></span>
              <span className="font-headline-md text-sm tracking-tight text-white font-bold">
                DENSIVUE TRANSIT ANALYZER 402
              </span>
            </div>
            <span className="text-[#3f5042]">/</span>
            <span className="text-[#39ff14] font-bold">● LIVE</span>
            <span className="text-[#7d9180]">
              SR: <span className="text-white font-bold">2.5 GS/s</span>
            </span>
            <span className="text-[#3f5042]">|</span>
            <span className="text-[#7d9180]">
              BUS: <span className="text-white font-bold">USB-C / 480M</span>
            </span>
          </div>

          <div className="flex items-center gap-3 text-[#7d9180]">
            <span className="bg-[#121c14] border border-[#1c2e1f] px-2 py-0.5 rounded text-[#ff7700]">
              RF CONVERGENCE: <span className="text-[#ff7700] font-bold">LOCKED</span>
            </span>
            <span className="text-[#3f5042]">|</span>
            <span className="text-[#a4b7a6]">
              ANTENNA: <span className="text-[#39ff14] font-bold">8×8 PHASED</span>
            </span>
            <span className="text-[#3f5042]">|</span>
            <span className="bg-[#ff7700] text-[#190b00] px-2 py-0.5 rounded font-bold">
              OP: LAB-04
            </span>
          </div>
        </div>

        {/* SUBHEADER TELEMETRY ROW */}
        <div className="flex flex-wrap items-center justify-between gap-2 font-label-sm text-[11px] text-[#869586] pt-0.5">
          <div className="flex items-center gap-3">
            <span>
              POLAR RANGE: <span className="text-[#39ff14] font-bold">5.0 METERS</span>
            </span>
            <span className="text-[#334435]">|</span>
            <span>
              ATTENUATION: <span className="text-white font-semibold">LOG-DISTANCE PATH LOSS</span>
            </span>
            <span className="text-[#334435]">|</span>
            <span>
              SWEEP: <span className="text-[#ff7700] font-bold">{rpm} RPM</span>
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 text-center">
            <span className="text-[#ff7700] font-bold tracking-wider">
              DENSIVUE PROXIMITY RADAR 402
            </span>
            <span className="text-[#415543]">//</span>
            <span className="text-[#ffb68a] font-medium tracking-wide">
              CONCENTRIC RF COMPRESSION
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span>
              CH-06 SNIFFER <span className="text-[#39ff14] font-bold">NODE</span>
            </span>
            <span className="text-[#334435]">|</span>
            <span>
              RSSI FILTER: <span className="text-white font-bold">-70 dBm</span>
            </span>
            <span className="text-[#334435]">|</span>
            <span className="text-[#ff4444] font-bold">
              CORE LIMIT: 10 PERS
            </span>
          </div>
        </div>
      </header>

      {/* EXPANSIVE CIRCULAR CONCENTRIC POLAR RADAR CRT VIEWPORT */}
      <section className="bg-[#090e0b] border border-[#17251a] p-2 rounded flex flex-col gap-1.5 shadow-[0_0_24px_rgba(0,0,0,0.9)]">
        {/* Outer CRT Bezel Recess */}
        <div className="relative bg-[#000000] rounded border border-[#142217] p-2 overflow-hidden shadow-[inset_0_0_40px_rgba(0,0,0,0.98)] flex flex-col items-center justify-center min-h-[480px] xl:min-h-[560px]">
          {/* CRT Phosphor Scanline Overlay */}
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,rgba(57,255,20,0.04),transparent_75%)] z-10"></div>
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,22,17,0)_50%,rgba(0,0,0,0.45)_50%)] bg-[length:100%_4px] opacity-35 z-10"></div>

          {/* Top Right Specs Overlay */}
          <div className="absolute top-3 right-4 z-20 text-right font-label-sm text-[10px] text-[#556957] space-y-0.5 pointer-events-none">
            <div>FILTER CUTOFF: 15.0 Hz</div>
            <div>DWELL THRESHOLD: &gt; 8.0 SEC</div>
            <div>ANTENNA ARRAY: 8x8 PATCH PHASED</div>
          </div>

          {/* Bottom Left Specs Overlay */}
          <div className="absolute bottom-3 left-4 z-20 text-left font-label-sm text-[10px] text-[#556957] space-y-0.5 pointer-events-none">
            <div>POLAR COORD REF: 0.00m, 0.00m</div>
            <div>ATTENUATION EXP (γ): 2.45 (INDOOR CONCOURSE)</div>
            <div>RF BEAM AZIMUTH: SWEEPING 360°</div>
          </div>

          {/* Selected Blip Detail Floater */}
          {selectedBlip && (
            <div className="absolute top-3 left-4 z-30 bg-[#0d1610]/95 border border-[#1e3c23] p-2 rounded shadow-lg text-[11px] font-mono text-[#dbe4dc]">
              <div className="flex items-center justify-between gap-3 text-secondary font-bold border-b border-[#1e3c23] pb-1">
                <span>{selectedBlip.fingerprintId}</span>
                <button
                  onClick={() => setSelectedBlip(null)}
                  className="text-white hover:text-primary cursor-pointer text-xs"
                >
                  ✕
                </button>
              </div>
              <div className="pt-1 text-[10px] space-y-0.5 text-[#9cb09d]">
                <div>MAC: {selectedBlip.mac}</div>
                <div>DIST: {selectedBlip.distance.toFixed(2)}m | AZ: {selectedBlip.angle}°</div>
                <div>RSSI: {selectedBlip.rssi} dBm</div>
                <div className="text-[#ff7700]">ZONE: {selectedBlip.zone.toUpperCase()}</div>
              </div>
            </div>
          )}

          {/* RADAR SVG POLAR CANVAS */}
          <div className="relative w-full max-w-[700px] aspect-square flex items-center justify-center z-20">
            <svg
              className="w-full h-full"
              viewBox="0 0 1000 1000"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                {/* Glow Filters */}
                <filter id="radar-green-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="glow" />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="radar-amber-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="glow" />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="radar-red-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3.5" result="glow" />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Sweep Trail Wedge Gradient */}
                <radialGradient id="sweep-wedge-fade" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#39ff14" stopOpacity="0.30" />
                  <stop offset="60%" stopColor="#39ff14" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#39ff14" stopOpacity="0.0" />
                </radialGradient>

                {/* Core Choke Danger Fill */}
                <radialGradient id="core-choke-fill" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ff4444" stopOpacity="0.18" />
                  <stop offset="85%" stopColor="#ff4444" stopOpacity="0.06" />
                  <stop offset="100%" stopColor="#ff4444" stopOpacity="0.0" />
                </radialGradient>

                {/* Mid-Surge Amber Fill */}
                <radialGradient id="mid-surge-fill" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ff7700" stopOpacity="0.0" />
                  <stop offset="50%" stopColor="#ff7700" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="#ff7700" stopOpacity="0.0" />
                </radialGradient>
              </defs>

              {/* Background Concentric Radar Rings */}
              {/* Ring 3: 5.0m Outer Perimeter Circle (Green) */}
              <circle
                cx="500"
                cy="500"
                r={outerRadiusPx}
                fill="none"
                stroke="#17361a"
                strokeWidth="1.2"
              />
              <circle
                cx="500"
                cy="500"
                r={outerRadiusPx}
                fill="none"
                stroke="#2a662f"
                strokeWidth="0.8"
                strokeDasharray="4,4"
              />

              {/* Ring 2: 3.5m Mid-Surge Circle (Amber) */}
              <circle
                cx="500"
                cy="500"
                r={midRadiusPx}
                fill="url(#mid-surge-fill)"
                stroke="#4a2e0a"
                strokeWidth="1.2"
              />
              <circle
                cx="500"
                cy="500"
                r={midRadiusPx}
                fill="none"
                stroke="#d96c09"
                strokeWidth="1"
                strokeDasharray="4,3"
              />

              {/* Ring 1: 1.5m Core Choke Circle (Red) */}
              <circle
                cx="500"
                cy="500"
                r={coreRadiusPx}
                fill="url(#core-choke-fill)"
                stroke="#631414"
                strokeWidth="1.5"
              />
              <circle
                cx="500"
                cy="500"
                r={coreRadiusPx}
                fill="none"
                stroke="#ff4444"
                strokeWidth="1.2"
                strokeDasharray="3,3"
                filter="url(#radar-red-glow)"
              />

              {/* Minor Range Rings (e.g. 0.5m, 2.5m, 4.2m) */}
              <circle
                cx="500"
                cy="500"
                r={0.5 * 88}
                fill="none"
                stroke="#122415"
                strokeWidth="0.6"
                strokeDasharray="2,4"
              />
              <circle
                cx="500"
                cy="500"
                r={2.5 * 88}
                fill="none"
                stroke="#162e1a"
                strokeWidth="0.6"
                strokeDasharray="2,4"
              />

              {/* Azimuth Ray Lines (Major Axes & Diagonals) */}
              {/* 0° - 180° Vertical */}
              <line x1="500" y1="60" x2="500" y2="940" stroke="#1c3e1e" strokeWidth="1" />
              {/* 90° - 270° Horizontal */}
              <line x1="60" y1="500" x2="940" y2="500" stroke="#1c3e1e" strokeWidth="1" />
              {/* 45° - 225° Diagonal */}
              <line
                x1={500 - 311}
                y1={500 - 311}
                x2={500 + 311}
                y2={500 + 311}
                stroke="#142c16"
                strokeWidth="0.8"
                strokeDasharray="4,4"
              />
              {/* 135° - 315° Diagonal */}
              <line
                x1={500 - 311}
                y1={500 + 311}
                x2={500 + 311}
                y2={500 - 311}
                stroke="#142c16"
                strokeWidth="0.8"
                strokeDasharray="4,4"
              />

              {/* Central Reticle Crosshairs */}
              <circle cx="500" cy="500" r="3" fill="#ff4444" />
              <circle cx="500" cy="500" r="8" fill="none" stroke="#ff4444" strokeWidth="1" />

              {/* Ring Demarcation Labels (Screen-Printed Physical Legend Style) */}
              {/* Ring 3 Label: 5.0m PERIMETER FLOW [< -75 dBm] */}
              <text
                x="575"
                y="85"
                fill="#39ff14"
                fontFamily="JetBrains Mono"
                fontSize="11"
                fontWeight="700"
                letterSpacing="0.05em"
              >
                5.0M PERIMETER FLOW [&lt; -75 dBm]
              </text>

              {/* Ring 2 Label: 3.5m MID-SURGE [-65 TO -75 dBm] */}
              <text
                x="575"
                y="205"
                fill="#ff7700"
                fontFamily="JetBrains Mono"
                fontSize="11"
                fontWeight="700"
                letterSpacing="0.05em"
              >
                3.5M MID-SURGE [-65 TO -75 dBm]
              </text>

              {/* Ring 1 Label: 1.5m CORE [CHOKE // > -65 dBm] */}
              <text
                x="575"
                y="360"
                fill="#ff4444"
                fontFamily="JetBrains Mono"
                fontSize="11"
                fontWeight="700"
                letterSpacing="0.05em"
              >
                1.5M CORE [CHOKE // &gt; -65 dBm]
              </text>

              {/* Cardinal & Angular Ticks / Labels */}
              <g fontFamily="JetBrains Mono" fontSize="12" fontWeight="700" textAnchor="middle">
                {/* 000° [N] */}
                <text x="500" y="45" fill="#39ff14">
                  000° [N]
                </text>
                {/* 045° */}
                <text x="830" y="180" fill="#2d6131">
                  045°
                </text>
                {/* 090° [E] */}
                <text x="960" y="504" fill="#39ff14">
                  090° [E]
                </text>
                {/* 135° */}
                <text x="830" y="825" fill="#2d6131">
                  135°
                </text>
                {/* 180° [S] */}
                <text x="500" y="970" fill="#39ff14">
                  180° [S]
                </text>
                {/* 225° */}
                <text x="175" y="825" fill="#2d6131">
                  225°
                </text>
                {/* 270° [W] */}
                <text x="40" y="504" fill="#39ff14">
                  270° [W]
                </text>
                {/* 315° */}
                <text x="175" y="180" fill="#2d6131">
                  315°
                </text>
              </g>

              {/* ROTATING RADAR SWEEP SECTOR (PHOSPHOR TRAIL WEDGE) */}
              <g transform={`rotate(${sweepAngle}, 500, 500)`}>
                {/* Trailing Sector Wedge (40 degrees sweep trail) */}
                <path
                  d="M 500 500 L 500 60 A 440 440 0 0 0 217 162 Z"
                  fill="url(#sweep-wedge-fade)"
                  opacity="0.75"
                />
                {/* Main Neon Green Radial Sweep Line */}
                <line
                  x1="500"
                  y1="500"
                  x2="500"
                  y2="60"
                  stroke="#39ff14"
                  strokeWidth="2.5"
                  filter="url(#radar-green-glow)"
                />
              </g>

              {/* TARGET BLIPS (34 PAX RF SENSORS) */}
              {blips.map((blip) => {
                const { x, y } = polarToXY(blip.angle, blip.distance);

                // Calculate angular distance to the sweep ray to create phosphor luminescence decay
                const angleDiff = (sweepAngle - blip.angle + 360) % 360;
                // Just passed: 0-60 degrees trail => high illumination
                const isSweptRecently = angleDiff >= 0 && angleDiff < 75;
                const sweepBrightness = isSweptRecently ? 1.0 : 0.45;

                const isCore = blip.zone === 'core';
                const isMid = blip.zone === 'mid';
                const color = isCore ? '#ff4444' : isMid ? '#ff7700' : '#39ff14';
                const filter = isCore
                  ? 'url(#radar-red-glow)'
                  : isMid
                  ? 'url(#radar-amber-glow)'
                  : 'url(#radar-green-glow)';

                return (
                  <g
                    key={blip.id}
                    className="cursor-pointer transition-transform hover:scale-125"
                    onClick={() => {
                      if (telemetry.soundEnabled) playTactileClick();
                      setSelectedBlip(blip);
                    }}
                  >
                    {/* Concentric ripple halo when active or selected */}
                    {isSweptRecently && (
                      <circle
                        cx={x}
                        cy={y}
                        r={isCore ? 14 : 10}
                        fill="none"
                        stroke={color}
                        strokeWidth="0.8"
                        opacity="0.4"
                      />
                    )}

                    {/* Blip Outer Halo */}
                    <circle
                      cx={x}
                      cy={y}
                      r={isCore ? 6 : 5}
                      fill={color}
                      opacity={sweepBrightness * 0.4}
                    />

                    {/* Blip Center Dot */}
                    <circle
                      cx={x}
                      cy={y}
                      r={isCore ? 4 : 3.2}
                      fill={color}
                      filter={filter}
                      opacity={sweepBrightness}
                    />

                    {/* Optional Blip Label (e.g. #L1 in core) */}
                    {blip.label && (
                      <text
                        x={x + 7}
                        y={y - 6}
                        fill="#ff4444"
                        fontFamily="JetBrains Mono"
                        fontSize="9"
                        fontWeight="700"
                      >
                        {blip.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* COLOR LEGEND JUST BELOW THE RADAR VIEWPORT */}
          <div className="relative z-20 flex flex-wrap items-center justify-center gap-6 font-label-sm text-[11px] pt-3 pb-1 border-t border-[#18281b] w-full select-none">
            <div className="flex items-center gap-2 text-[#ff4444] font-bold">
              <span className="inline-block w-3 h-3 bg-[#ff4444] shadow-[0_0_8px_#ff4444]"></span>
              <span>CORE (&lt;1.5M CRITICAL)</span>
            </div>
            <div className="flex items-center gap-2 text-[#ff7700] font-bold">
              <span className="inline-block w-3 h-3 bg-[#ff7700] shadow-[0_0_8px_#ff7700]"></span>
              <span>MID (1.5-3.5M SURGE)</span>
            </div>
            <div className="flex items-center gap-2 text-[#39ff14] font-bold">
              <span className="inline-block w-3 h-3 bg-[#39ff14] shadow-[0_0_8px_#39ff14]"></span>
              <span>PERIMETER (&gt;3.5M FLOW)</span>
            </div>
          </div>
        </div>

        {/* RADAR ACTUATOR BAR */}
        <div className="bg-[#0c120e] px-3 py-1.5 rounded flex flex-wrap items-center justify-between gap-2 text-xs font-label-sm">
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleFreeze}
              className={`px-2.5 py-1 rounded border flex items-center gap-1.5 transition-colors cursor-pointer ${
                isFrozen
                  ? 'bg-[#2b1706] text-[#ff7700] border-[#ff7700] font-bold shadow-[0_0_8px_rgba(255,119,0,0.4)]'
                  : 'bg-[#142017] hover:bg-[#1a2d20] text-white border-[#213524]'
              }`}
            >
              <span className="material-symbols-outlined text-[14px] text-[#ff7700]">
                {isFrozen ? 'play_arrow' : 'pause'}
              </span>
              <span>{isFrozen ? 'RESUME SWEEP' : 'FREEZE SWEEP'}</span>
            </button>

            <button
              onClick={handleCycleRpm}
              className="bg-[#142017] hover:bg-[#1a2d20] text-white px-2.5 py-1 rounded border border-[#213524] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px] text-[#39ff14]">
                speed
              </span>
              <span>SWEEP RATE: {rpm} RPM</span>
            </button>
          </div>

          <div className="flex items-center gap-4 text-[#6d816f]">
            <span>
              TOTAL TARGETS: <span className="text-white font-bold">{blips.length} BEACONS</span>
            </span>
            <span className="text-[#2b3a2d]">|</span>
            <span className="text-[#39ff14] font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#39ff14] animate-pulse"></span>
              STATUS: RF RADIAL MAPPING ACTIVE
            </span>
          </div>
        </div>
      </section>

      {/* LOWER TELEMETRY DECK (4 BLOCKS IN GRID) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* BLOCK 1: CRITICAL CORE (< 1.5M) */}
        <div className="bg-[#0e0707] border border-[#3b1212] p-3 rounded flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#3b1212] pb-1.5">
            <span className="font-label-sm text-[10px] uppercase tracking-wider text-[#ff4444] font-bold">
              CRITICAL CORE (&lt; 1.5M)
            </span>
            <span className="font-label-sm text-[9px] text-[#ff4444] bg-[#210909] px-1.5 py-0.5 rounded border border-[#4a1616] font-bold animate-pulse">
              CHOKE-POINT SEVERE
            </span>
          </div>

          <div className="py-2">
            <span className="font-display-lg text-4xl xl:text-5xl font-black text-[#ff4444] tracking-tight leading-none drop-shadow-[0_0_14px_rgba(255,68,68,0.7)] font-mono">
              06
            </span>
            <span className="font-label-sm text-[10px] text-[#a85b5b] uppercase tracking-wider block mt-1 font-semibold">
              PERSONS DETECTED
            </span>
          </div>

          <div className="font-label-sm text-[10px] text-[#a85b5b] border-t border-[#3b1212] pt-1.5 leading-snug">
            <span className="text-[#ff4444] font-bold block">
              HIGH LOCAL COMPRESSION // CROWD PACKING
            </span>
            <span>HAZARD: 8 PERS/m² (WARNING LEVEL 3)</span>
          </div>
        </div>

        {/* BLOCK 2: APPROACHING SURGE (1.5M - 3.5M) */}
        <div className="bg-[#0e0b06] border border-[#3b2408] p-3 rounded flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#3b2408] pb-1.5">
            <span className="font-label-sm text-[10px] uppercase tracking-wider text-[#ff7700] font-bold">
              APPROACHING SURGE (1.5M - 3.5M)
            </span>
            <span className="font-label-sm text-[9px] text-[#ff7700] bg-[#211304] px-1.5 py-0.5 rounded border border-[#4a2b0a] font-bold">
              DYNAMIC INFLOW
            </span>
          </div>

          <div className="py-2">
            <span className="font-display-lg text-4xl xl:text-5xl font-black text-[#ff7700] tracking-tight leading-none drop-shadow-[0_0_14px_rgba(255,119,0,0.7)] font-mono">
              18
            </span>
            <span className="font-label-sm text-[10px] text-[#b38356] uppercase tracking-wider block mt-1 font-semibold">
              PERSONS DETECTED
            </span>
          </div>

          <div className="font-label-sm text-[10px] text-[#b38356] border-t border-[#3b2408] pt-1.5 leading-snug">
            <span className="text-[#ff7700] font-bold block">
              INFLOW HEADING TOWARD BOTTLENECK
            </span>
            <span>MEAN VELOCITY: 0.92 m/s INWARD CONVERGENCE</span>
          </div>
        </div>

        {/* BLOCK 3: PERIMETER FREE FLOW (> 3.5M) */}
        <div className="bg-[#070e09] border border-[#143319] p-3 rounded flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#143319] pb-1.5">
            <span className="font-label-sm text-[10px] uppercase tracking-wider text-[#39ff14] font-bold">
              PERIMETER FREE FLOW (&gt; 3.5M)
            </span>
            <span className="font-label-sm text-[9px] text-[#39ff14] bg-[#0c2410] px-1.5 py-0.5 rounded border border-[#1c4a22] font-bold">
              FLOW UNRESTRICTED
            </span>
          </div>

          <div className="py-2">
            <span className="font-display-lg text-4xl xl:text-5xl font-black text-[#39ff14] tracking-tight leading-none drop-shadow-[0_0_14px_rgba(57,255,20,0.7)] font-mono">
              10
            </span>
            <span className="font-label-sm text-[10px] text-[#6d9673] uppercase tracking-wider block mt-1 font-semibold">
              PERSONS DETECTED
            </span>
          </div>

          <div className="font-label-sm text-[10px] text-[#6d9673] border-t border-[#143319] pt-1.5 leading-snug">
            <span className="text-[#39ff14] font-bold block">
              UNRESTRICTED TRANSIT DISPERSAL
            </span>
            <span>FREE STREAM VELOCITY: 1.45 m/s NOMINAL</span>
          </div>
        </div>

        {/* BLOCK 4: SENSOR CORE SATURATION / HAZARD STATUS */}
        <div className="bg-[#140808] border-2 border-[#ff4444]/60 p-3 rounded flex flex-col justify-between shadow-md relative overflow-hidden bg-[repeating-linear-gradient(45deg,#120707,#120707_10px,#1f0a0a_10px,#1f0a0a_20px)]">
          <div className="flex items-center justify-between border-b border-[#4a1616] pb-1.5">
            <span className="font-label-sm text-[10px] uppercase tracking-wider text-[#ff4444] font-bold flex items-center gap-1">
              <span>▲</span> SENSOR CORE SATURATION
            </span>
            <span className="font-label-sm text-[10px] text-[#ff4444] font-bold font-mono">
              60% (6/10 CAPACITY LIMIT)
            </span>
          </div>

          <div className="py-2 text-xs text-[#dec1b1] leading-relaxed">
            <p className="font-semibold text-white">
              Inward compression gradient active. Deploy barrier clearance protocol.
            </p>
          </div>

          <div className="font-label-sm text-[10px] text-[#dec1b1]/70 border-t border-[#4a1616] pt-1.5 flex justify-between font-mono">
            <span>TOTAL: <strong className="text-white">34 PAX</strong></span>
            <span>CORE RATIO: <strong className="text-[#ff4444]">17.6%</strong></span>
            <span>RADIUS: <strong className="text-white">5.0M</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
