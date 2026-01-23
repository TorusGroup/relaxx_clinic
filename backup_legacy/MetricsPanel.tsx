
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
    <div className="md:hidden fixed bottom-8 left-6 right-6 z-[100] flex flex-col gap-3">
      <div className="flex justify-between items-center bg-black/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        <div className="flex gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] text-[#00FF66] font-black uppercase tracking-widest opacity-60">Abertura</span>
            <span className="text-white font-black text-xl leading-none">{displayAmp.toFixed(0)}u</span>
          </div>
          <div className="w-[1px] h-8 bg-white/10" />
          <div className="flex flex-col">
            <span className="text-[10px] text-[#00FF66] font-black uppercase tracking-widest opacity-60">Desvio</span>
            <span className="text-white font-black text-xl leading-none">{displayDev.toFixed(1)}u</span>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="bg-white/5 p-3 rounded-2xl text-white/50 active:scale-90 transition-transform"
        >
          {isExpanded ? '▼' : '▲'}
        </button>
      </div>

      {isExpanded && (
        <div className="bg-black/80 backdrop-blur-3xl border border-white/10 rounded-3xl p-8 animate-in slide-in-from-bottom-8 duration-700 space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-[#00FF66]/60">
              <span>Eixo Vertical</span>
              <span className="text-white bg-white/10 px-2 py-1 rounded-md">{displayVertical.toFixed(1)}°</span>
            </div>
            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden p-[2px] border border-white/5">
              <div className="bg-gradient-to-r from-[#00FF66]/40 to-[#00FF66] h-full transition-all duration-700 rounded-full" style={{ width: `${Math.min(100, Math.abs(displayVertical) * 5)}%` }} />
            </div>
            <div className={`p-4 rounded-2xl text-center text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-500 ${metrics.isCentered ? 'bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
              {metrics.isCentered ? 'Sinal Estabilizado' : 'Ajustar Posição'}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <MobileHUD />

      {/* Desktop Panel - Bottom Left */}
      <div className="hidden md:block fixed bottom-12 left-12 w-[380px] bg-black/60 backdrop-blur-3xl p-10 rounded-[48px] space-y-10 z-50 shadow-[0_50px_100px_rgba(0,0,0,0.6)] border border-white/5 animate-in slide-in-from-left duration-1000">
        <div className="flex justify-between items-center border-b border-white/10 pb-6">
          <div className="flex flex-col">
            <span className="text-[10px] text-[#00FF66] font-black uppercase tracking-[0.4em] opacity-40">Bio-Telemetria</span>
            <span className="text-white font-black text-xl tracking-tighter uppercase italic">Análise Direta</span>
          </div>
          {isRecording && (
            <div className="bg-[#00FF66]/10 px-4 py-2 rounded-2xl flex items-center gap-2 border border-[#00FF66]/20">
              <div className="w-2 h-2 rounded-full bg-[#00FF66] animate-pulse" />
              <span className="text-[#00FF66] text-[10px] font-black uppercase tracking-[0.2em]">LIVE</span>
            </div>
          )}
        </div>

        <div className="space-y-8">
          {[
            { label: 'Eixo Vertical', value: `${displayVertical.toFixed(1)}°`, progress: Math.abs(displayVertical) * 10 },
            { label: 'Abertura Bucal', value: `${displayAmp.toFixed(0)}u`, progress: displayAmp * 1.5 },
            { label: 'Mandible Drift', value: `${displayDev.toFixed(1)}u`, progress: Math.abs(displayDev) * 2 }
          ].map((item, i) => (
            <div key={i} className="space-y-4">
              <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                <span className="text-white/30">{item.label}</span>
                <span className="text-white font-mono">{item.value}</span>
              </div>
              <div className="w-full bg-white/5 h-[3px] rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#00FF66]/20 to-[#00FF66] h-full transition-all duration-1000"
                  style={{ width: `${Math.min(100, item.progress)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className={`p-6 rounded-3xl border transition-all duration-700 ${metrics.isCentered ? 'bg-[#00FF66]/5 border-[#00FF66]/10 text-[#00FF66]' : 'bg-rose-500/5 border-rose-500/10 text-rose-400'}`}>
          <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.3em]">
            <div className={`w-2.5 h-2.5 rounded-full ${metrics.isCentered ? 'bg-[#00FF66]' : 'bg-rose-500'} animate-pulse`} />
            {metrics.isCentered ? 'Dados Confiáveis' : 'Estabilize a Cabeça'}
          </div>
        </div>
      </div>
    </>
  );
};

export default MetricsPanel;
