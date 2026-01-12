
import React, { useState, useEffect, useRef } from 'react';
import { DiagnosticMetrics } from '../types';

interface Props {
  metrics: DiagnosticMetrics;
  isRecording: boolean;
}

// Hook for speedometer-like visual smoothing (Low-Pass Filter)
const useSmoothedNumber = (target: number, speed = 0.1) => {
  const [current, setCurrent] = useState(target);
  const targetRef = useRef(target);

  useEffect(() => {
    targetRef.current = target;
  }, [target]);

  useEffect(() => {
    let animFrame: number;
    const animate = () => {
      setCurrent(prev => {
        const diff = targetRef.current - prev;
        if (Math.abs(diff) < 0.05) return targetRef.current; // Snap to target
        return prev + diff * speed; // Lerp
      });
      animFrame = requestAnimationFrame(animate);
    };
    animFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrame);
  }, [speed]);

  return current;
};

const MetricsPanel: React.FC<Props> = ({ metrics, isRecording }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Visual Smoothing (Lag) for Premium Feel
  const displayAmp = useSmoothedNumber(metrics.openingAmplitude, 0.15); // Faster for opening
  const displayDev = useSmoothedNumber(metrics.lateralDeviation, 0.08); // Slower for deviation (more stable)
  const displayVertical = useSmoothedNumber(metrics.verticalAlignment, 0.1);

  // Versão Mobile HUD
  const MobileHUD = () => (
    <div className="md:hidden fixed bottom-24 left-6 right-6 z-[100] flex flex-col gap-3">
      <div className="flex justify-between items-center bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl">
        <div className="flex gap-4">
          <div className="flex flex-col">
            <span className="text-[8px] text-[#00FF66] font-black uppercase tracking-widest">Abertura</span>
            <span className="text-white font-mono text-sm">{displayAmp.toFixed(0)}u</span>
          </div>
          <div className="w-[1px] h-8 bg-white/10" />
          <div className="flex flex-col">
            <span className="text-[8px] text-[#00FF66] font-black uppercase tracking-widest">Desvio</span>
            <span className="text-white font-mono text-sm">{displayDev.toFixed(1)}u</span>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="bg-white/5 p-2 rounded-xl text-white/50"
        >
          {isExpanded ? '▼' : '▲'}
        </button>
      </div>

      {isExpanded && (
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="space-y-4">
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-400 uppercase">Eixo Vertical</span>
              <span className="text-white">{displayVertical.toFixed(1)}°</span>
            </div>
            <div className="w-full bg-white/10 h-1 rounded-full">
              <div className="bg-[#00FF66] h-full transition-all duration-300" style={{ width: `${Math.min(100, Math.abs(displayVertical) * 5)}%` }} />
            </div>
            <div className={`p-2 rounded-lg text-center text-[9px] font-bold uppercase tracking-widest ${metrics.isCentered ? 'bg-[#00FF66]/10 text-[#00FF66]' : 'bg-red-500/10 text-red-400'}`}>
              {metrics.isCentered ? 'Posicionamento Correto' : 'Centralize o Rosto'}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <MobileHUD />

      {/* Desktop Panel */}
      <div className="hidden md:block absolute top-12 right-12 w-[400px] relaxx-glass p-8 rounded-[40px] space-y-8 z-50 shadow-2xl border-white/5">
        <div className="flex justify-between items-center border-b border-white/10 pb-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-[#00FF66] font-black uppercase tracking-[0.3em]">Bio-Telemetria</span>
            <span className="text-white font-bold text-sm tracking-tight">Análise em Tempo Real</span>
          </div>
          {isRecording && (
            <div className="bg-[#00FF66]/10 px-3 py-1 rounded-full flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00FF66] animate-pulse" />
              <span className="text-[#00FF66] text-[10px] font-black uppercase tracking-widest">LIVE</span>
            </div>
          )}
        </div>

        <div className="space-y-5">
          {[
            { label: 'Eixo Vertical', value: `${displayVertical.toFixed(1)}°`, progress: Math.abs(displayVertical) * 10 },
            { label: 'Abertura Bucal', value: `${displayAmp.toFixed(0)}u`, progress: displayAmp * 1.5 },
            { label: 'Mandible Drift', value: `${displayDev.toFixed(1)}u`, progress: Math.abs(displayDev) * 2 }
          ].map((item, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between text-[10px]">
                <span className="text-gray-400 font-bold uppercase tracking-widest">{item.label}</span>
                <span className="text-white font-mono">{item.value}</span>
              </div>
              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden p-[2px] border border-white/5">
                <div
                  className="bg-gradient-to-r from-[#00FF66]/40 to-[#00FF66] h-full transition-all duration-700 rounded-full shadow-[0_0_10px_rgba(0,255,102,0.3)]"
                  style={{ width: `${Math.min(100, item.progress)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className={`p-4 rounded-2xl border transition-all duration-500 ${metrics.isCentered ? 'bg-[#00FF66]/5 border-[#00FF66]/20 text-[#00FF66]' : 'bg-red-500/5 border-red-500/20 text-red-400'}`}>
          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em]">
            <div className={`w-2 h-2 rounded-full ${metrics.isCentered ? 'bg-[#00FF66] shadow-[0_0_10px_#00FF66]' : 'bg-red-400 shadow-[0_0_10px_red]'}`} />
            {metrics.isCentered ? 'Sinal Estabilizado' : 'Ajustar Centralização'}
          </div>
        </div>
      </div>
    </>
  );
};

export default MetricsPanel;
