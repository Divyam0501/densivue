import React from 'react';
import { X, AlertTriangle, ShieldAlert, Activity, ArrowRight } from 'lucide-react';
import { PacketEvent } from '../types/oscilloscope';

interface AlertDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInspectPacket: (packet: PacketEvent) => void;
  samplePacket: PacketEvent;
}

export const AlertDetailModal: React.FC<AlertDetailModalProps> = ({
  isOpen,
  onClose,
  onInspectPacket,
  samplePacket,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-surface-container-lowest border border-error/50 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#93000a] text-[#ffdad6] px-space-md py-space-sm flex items-center justify-between border-b border-[#ffb4ab]/30">
          <div className="flex items-center gap-space-sm">
            <ShieldAlert size={18} className="text-[#ffb4ab]" />
            <span className="font-label-md font-bold tracking-widest uppercase">
              ZONE 04 ANOMALY INGRESS DIAGNOSTIC
            </span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-space-lg space-y-space-md font-label-sm">
          {/* Main Anomaly Card */}
          <div className="p-space-md bg-surface-container-low border border-surface-container-high space-y-space-xs">
            <div className="flex items-center justify-between text-error font-bold">
              <span className="flex items-center gap-1">
                <AlertTriangle size={14} />
                THRESHOLD VIOLATION: RF BURST RATE +180 PKTS/S
              </span>
              <span className="text-on-surface-variant text-[10px]">TIME: 20:41:08 UTC</span>
            </div>
            <p className="text-on-surface-variant text-xs leading-relaxed">
              Surge ingress rate detected on SSID probing channel 06 (2437 MHz). Sequence analysis identified 14 rapid probe requests with randomized locally administered MAC addresses (bit 1 of OUI set to 1) occurring within a 45ms window.
            </p>
          </div>

          {/* Anomaly Metrics Grid */}
          <div className="grid grid-cols-3 gap-space-sm">
            <div className="p-space-sm bg-surface-container border border-surface-container-high">
              <span className="text-on-surface-variant text-[10px] uppercase block">PEAK BURST</span>
              <span className="text-error font-mono font-bold text-sm">242 pkts/sec</span>
            </div>
            <div className="p-space-sm bg-surface-container border border-surface-container-high">
              <span className="text-on-surface-variant text-[10px] uppercase block">MAC ENTROPY</span>
              <span className="text-primary font-mono font-bold text-sm">0.94 bits (HIGH)</span>
            </div>
            <div className="p-space-sm bg-surface-container border border-surface-container-high">
              <span className="text-on-surface-variant text-[10px] uppercase block">CHANNEL OCCUPANCY</span>
              <span className="text-secondary font-mono font-bold text-sm">89.4% (CH 06)</span>
            </div>
          </div>

          {/* Action Recommendations */}
          <div className="p-space-md bg-surface-container-low border border-surface-container-high space-y-space-xs text-xs">
            <span className="text-on-surface font-bold flex items-center gap-1">
              <Activity size={14} className="text-secondary" /> RECOMMENDED ACTIONS:
            </span>
            <ul className="list-disc list-inside space-y-1 text-on-surface-variant">
              <li>Engage Bandpass Filter 2437 MHz to isolate Channel 6 probe noise.</li>
              <li>Toggle Trigger Sensitivity to +2.5 dB to prevent false ring buffer overruns.</li>
              <li>Export PCAP capture slice of time window 20:41:00 - 20:41:15 for forensic decoding.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-surface-container-low px-space-md py-space-sm border-t border-surface-container-high flex items-center justify-between font-label-sm">
          <span className="text-on-surface-variant text-[11px]">
            TRIGGER LOCK: ACTIVE RING FIFO
          </span>
          <div className="flex gap-space-sm">
            <button
              onClick={() => {
                onClose();
                onInspectPacket(samplePacket);
              }}
              className="bg-primary text-on-primary font-bold px-space-md py-space-xs flex items-center gap-1 hover:bg-primary-fixed transition-colors"
            >
              <span>INSPECT ANOMALY BURST FRAME</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
