import React from 'react';
import FadeIn from './FadeIn';
import logoImg from '../logo.webp';

interface Props {
  onStart: () => void;
}

const Onboarding: React.FC<Props> = ({ onStart }) => {
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#001A13] selection:bg-[#00FF66] selection:text-[#001A13]">
      <style>{`
        @keyframes rotate-slow {
           from { transform: rotate(0deg); }
           to { transform: rotate(360deg); }
        }
        .animate-rotate-slow { animation: rotate-slow 60s linear infinite; }
      `}</style>

      <div className="min-h-full w-full flex flex-col items-center justify-center p-6 md:p-12 relative">
        {/* Background Decor */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#00FF66]/5 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#00FF66]/5 blur-[120px] rounded-full" />

          {/* Subtle Floating Logo */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] animate-rotate-slow">
            <img src="/logo_icon.png" className="w-[1000px] h-[1000px] object-contain" alt="" />
          </div>
        </div>

        <div className="max-w-4xl w-full text-center space-y-16 relative z-10">
          <header className="space-y-10">
            <FadeIn delay={0}>
              <div className="flex justify-center items-center">
                <div className="relative group">
                  <div className="absolute inset-[-10px] bg-[#00FF66]/10 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                  <img src="/logo_icon.png" alt="Relaxx" className="h-16 md:h-20 object-contain relative z-10 drop-shadow-[0_0_15px_rgba(0,255,102,0.2)]" />
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={200}>
              <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white leading-[0.95] uppercase italic">
                Diagnóstico <br />
                <span className="text-[#00FF66]">Biomecânico</span>
              </h1>
            </FadeIn>

            <FadeIn delay={300}>
              <p className="text-white/40 text-lg md:text-2xl font-light max-w-2xl mx-auto leading-tight tracking-tight">
                Análise funcional mandibular em tempo real <br />
                <span className="text-white/60">com tecnologia de visão computacional.</span>
              </p>
            </FadeIn>
          </header>

          <FadeIn delay={500}>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { label: 'SIMETRIA', title: 'Bio-Eixo', desc: 'Centralidade neural.' },
                { label: 'KINETIC', title: 'Fluidez', desc: 'Ritmo da ATM.' },
                { label: 'REPORT', title: 'Clareza', desc: 'Dados clínicos.' }
              ].map((item, i) => (
                <div key={i} className="group p-8 rounded-[32px] bg-white/5 border border-white/5 hover:border-[#00FF66]/20 transition-all duration-500 hover:bg-white/[0.07] text-left">
                  <div className="text-[#00FF66] font-black text-[10px] tracking-[0.3em] mb-4 opacity-40 group-hover:opacity-100 transition-opacity">0{i + 1} // {item.label}</div>
                  <h3 className="text-white font-bold text-xl mb-1">{item.title}</h3>
                  <p className="text-white/40 text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </FadeIn>

          <FadeIn delay={700}>
            <div className="pt-8">
              <button
                onClick={onStart}
                className="group relative px-20 py-8 rounded-full overflow-hidden transition-all duration-500 hover:scale-105 active:scale-95"
              >
                <div className="absolute inset-0 bg-[#00FF66] transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative z-10 text-[#001A13] font-black uppercase tracking-[0.4em] text-xs">Iniciar Protocolo</span>
              </button>
            </div>
          </FadeIn>

          <footer className="pt-20 flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-[0.15] grayscale contrast-125">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
              <span className="text-[10px] font-black tracking-[0.3em] uppercase">Inova HC</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
              <span className="text-[10px] font-black tracking-[0.3em] uppercase">USP Medical</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
              <span className="text-[10px] font-black tracking-[0.3em] uppercase">Clinic Lab</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
