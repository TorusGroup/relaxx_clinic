import React from 'react';
import FadeIn from './FadeIn';
import logoImg from '../logo.webp';

interface Props {
  onStart: () => void;
}

const Onboarding: React.FC<Props> = ({ onStart }) => {
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#001A13]">
      <div className="min-h-full w-full flex flex-col items-center justify-center p-6 md:p-12">
        {/* Background Decor */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#00FF66]/10 blur-[150px] rounded-full animate-pulse md:animate-none" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#00FF66]/5 blur-[150px] rounded-full" />
        </div>

        <div className="max-w-4xl w-full text-center space-y-12 relative z-10">
          <header className="space-y-8">
            <FadeIn delay={0}>
              <div className="flex justify-center items-center">
                <div className="bg-white/5 p-4 rounded-3xl backdrop-blur-md border border-white/10 shadow-2xl">
                  <img src={logoImg}
                    alt="Relaxx Clinic"
                    className="h-12 md:h-16 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        parent.innerHTML = '<span class="text-white font-bold text-2xl tracking-tighter">RELAXX<span class="text-[#00FF66]">CLINIC</span></span>';
                      }
                    }} />
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={200}>
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
                Inteligência <span className="text-[#00FF66]">Orofacial</span> <br />de Alta Precisão.
              </h1>
            </FadeIn>

            <FadeIn delay={300}>
              <p className="text-gray-400 text-lg md:text-xl font-light max-w-2xl mx-auto leading-relaxed">
                Realize seu diagnóstico funcional mandibular em tempo real com nossa tecnologia proprietária de visão computacional.
              </p>
            </FadeIn>
          </header>

          <FadeIn delay={500}>
            <div className="relaxx-glass p-8 md:p-12 rounded-[48px] text-left space-y-10 shadow-[0_32px_64px_rgba(0,0,0,0.4)] border border-white/5 bg-white/5 backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/5 pb-6">
                <h2 className="text-[#00FF66] font-bold uppercase tracking-[0.3em] text-[10px]">Parâmetros de Análise Clínica</h2>
                <div className="flex gap-2">
                  <div className="w-1 h-1 rounded-full bg-[#00FF66] animate-bounce"></div>
                  <div className="w-1 h-1 rounded-full bg-[#00FF66]/40 animate-bounce delay-100"></div>
                  <div className="w-1 h-1 rounded-full bg-[#00FF66]/20 animate-bounce delay-200"></div>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-10">
                <div className="space-y-4 group">
                  <div className="text-[#00FF66] font-mono text-xs tracking-tighter group-hover:text-white transition-colors">01 // EIXO</div>
                  <p className="text-white font-bold text-lg">Centralização</p>
                  <p className="text-gray-500 text-sm leading-relaxed group-hover:text-gray-300 transition-colors">Alinhamento instantâneo do eixo vertical para detectar assimetrias esqueléticas.</p>
                </div>
                <div className="space-y-4 group">
                  <div className="text-[#00FF66] font-mono text-xs tracking-tighter group-hover:text-white transition-colors">02 // KINETIC</div>
                  <p className="text-white font-bold text-lg">Mobilidade</p>
                  <p className="text-gray-500 text-sm leading-relaxed group-hover:text-gray-300 transition-colors">Mapeamento dinâmico da abertura bucal para identificar desvios e "shifts" musculares.</p>
                </div>
                <div className="space-y-4 group">
                  <div className="text-[#00FF66] font-mono text-xs tracking-tighter group-hover:text-white transition-colors">03 // REPORT</div>
                  <p className="text-white font-bold text-lg">Bio-Laudo</p>
                  <p className="text-gray-500 text-sm leading-relaxed group-hover:text-gray-300 transition-colors">Processamento via rede neural Gemini para síntese diagnóstica profissional.</p>
                </div>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={700}>
            <div className="pt-6">
              <button
                onClick={onStart}
                className="btn-relaxx px-20 py-6 rounded-full font-black uppercase tracking-[0.3em] text-xs transition-all duration-500 hover:scale-105 active:scale-95 shadow-[0_20px_60px_rgba(0,255,102,0.25)] relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
                <span className="relative z-10">Iniciar Protocolo Digital</span>
              </button>
            </div>
          </FadeIn>

          <footer className="pt-16 flex items-center justify-center gap-12 opacity-20 grayscale brightness-200 contrast-125">
            <span className="text-[10px] font-black tracking-[0.2em]">HOSPITAL DAS CLÍNICAS</span>
            <span className="text-[10px] font-black tracking-[0.2em]">INOVA HC</span>
            <span className="text-[10px] font-black tracking-[0.2em]">USP MEDICAL</span>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
