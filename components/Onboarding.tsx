
import React from 'react';

interface Props {
  onStart: () => void;
}

const Onboarding: React.FC<Props> = ({ onStart }) => {
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#001A13]">
      <div className="min-h-full w-full flex flex-col items-center justify-center p-6 md:p-12">
        {/* Background Decor */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#00FF66]/10 blur-[150px] rounded-full" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#00FF66]/5 blur-[150px] rounded-full" />
        </div>

        <div className="max-w-4xl w-full text-center space-y-12 relative z-10">
          <header className="space-y-8">
            <div className="flex justify-center items-center">
              <div className="bg-white/5 p-4 rounded-3xl backdrop-blur-md border border-white/10 shadow-2xl">
                <img src="./logo.webp"
                  alt="Relaxx Clinic"
                  className="h-12 md:h-16 object-contain"
                  onError={(e) => {
                    // Fallback caso o logo não carregue
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      parent.innerHTML = '<span className="text-white font-bold text-2xl tracking-tighter">RELAXX<span className="text-[#00FF66]">CLINIC</span></span>';
                    }
                  }} />
              </div>
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
              Inteligência <span className="text-[#00FF66]">Orofacial</span> <br />de Alta Precisão.
            </h1>
            <p className="text-gray-400 text-lg md:text-xl font-light max-w-2xl mx-auto leading-relaxed">
              Realize seu diagnóstico funcional mandibular em tempo real com nossa tecnologia proprietária de visão computacional.
            </p>
          </header>

          <div className="relaxx-glass p-8 md:p-12 rounded-[48px] text-left space-y-10 shadow-[0_32px_64px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between border-b border-white/5 pb-6">
              <h2 className="text-[#00FF66] font-bold uppercase tracking-[0.3em] text-[10px]">Parâmetros de Análise Clínica</h2>
              <div className="flex gap-2">
                <div className="w-1 h-1 rounded-full bg-[#00FF66]"></div>
                <div className="w-1 h-1 rounded-full bg-[#00FF66]/40"></div>
                <div className="w-1 h-1 rounded-full bg-[#00FF66]/20"></div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-10">
              <div className="space-y-4">
                <div className="text-[#00FF66] font-mono text-xs tracking-tighter">01 // EIXO</div>
                <p className="text-white font-bold text-lg">Centralização</p>
                <p className="text-gray-500 text-sm leading-relaxed">Alinhamento instantâneo do eixo vertical para detectar assimetrias esqueléticas.</p>
              </div>
              <div className="space-y-4">
                <div className="text-[#00FF66] font-mono text-xs tracking-tighter">02 // KINETIC</div>
                <p className="text-white font-bold text-lg">Mobilidade</p>
                <p className="text-gray-500 text-sm leading-relaxed">Mapeamento dinâmico da abertura bucal para identificar desvios e "shifts" musculares.</p>
              </div>
              <div className="space-y-4">
                <div className="text-[#00FF66] font-mono text-xs tracking-tighter">03 // REPORT</div>
                <p className="text-white font-bold text-lg">Bio-Laudo</p>
                <p className="text-gray-500 text-sm leading-relaxed">Processamento via rede neural Gemini para síntese diagnóstica profissional.</p>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button
              onClick={onStart}
              className="btn-relaxx px-20 py-6 rounded-full font-black uppercase tracking-[0.3em] text-xs transition-all duration-500 hover:scale-105 active:scale-95 shadow-[0_20px_60px_rgba(0,255,102,0.25)]"
            >
              Iniciar Protocolo Digital
            </button>
          </div>

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
