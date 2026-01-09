
import React from 'react';
import ReactMarkdown from 'react-markdown';

interface Props {
  report: string;
  onReset: () => void;
}

const ReportView: React.FC<Props> = ({ report, onReset }) => {
  return (
    <div className="fixed inset-0 z-[150] bg-[#001A13] overflow-y-auto p-6 md:p-12 lg:p-20">
      <div className="max-w-4xl mx-auto space-y-12 pb-32">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-white/10 pb-12">
          <div className="space-y-6">
            <div className="bg-white/5 p-3 rounded-2xl w-fit border border-white/5">
                <img src="./logo.webp" 
                     alt="Relaxx Clinic" 
                     className="h-10 object-contain"
                     onError={(e) => e.currentTarget.style.display = 'none'} />
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tighter leading-none">
              Laudo <span className="text-[#00FF66]">Biomecânico</span>
            </h1>
          </div>
          <button 
            onClick={onReset}
            className="text-[#00FF66] border border-[#00FF66]/20 bg-[#00FF66]/5 px-10 py-4 rounded-full text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-[#00FF66]/20 transition-all flex items-center gap-3"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Nova Análise
          </button>
        </header>

        <main className="prose prose-invert max-w-none">
          <div className="relaxx-glass p-8 md:p-20 rounded-[64px] shadow-2xl relative overflow-hidden border-white/5">
            {/* Branding Watermark */}
            <div className="absolute top-0 right-0 p-16 opacity-[0.03] pointer-events-none select-none">
               <img src="./logo.webp" className="h-64 grayscale brightness-200" />
            </div>

            <ReactMarkdown
               components={{
                h1: ({node, ...props}) => <h1 className="text-[#00FF66] text-3xl font-black uppercase mb-12 border-l-[12px] border-[#00FF66] pl-10 tracking-tighter" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-white text-2xl font-extrabold mt-16 mb-8 flex items-center gap-4 tracking-tight" {...props} />,
                p: ({node, ...props}) => <p className="mb-8 text-gray-300 text-lg leading-[1.9] font-light" {...props} />,
                ul: ({node, ...props}) => <ul className="list-none space-y-6 mb-12" {...props} />,
                li: ({node, ...props}) => (
                  <li className="flex gap-6 items-start text-gray-300 bg-white/[0.02] p-6 rounded-3xl border border-white/5 transition-hover hover:bg-white/[0.04]">
                    <span className="w-3 h-3 rounded-full bg-[#00FF66] mt-2.5 flex-shrink-0 shadow-[0_0_15px_#00FF66]" />
                    <span className="text-lg">{props.children}</span>
                  </li>
                ),
              }}
            >
              {report}
            </ReactMarkdown>
          </div>
        </main>

        <section className="flex flex-col items-center gap-12">
            <div className="h-[1px] w-64 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            
            <div className="grid md:grid-cols-2 gap-8 w-full">
                <div className="relaxx-glass p-10 rounded-[40px] space-y-5 border-white/5">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                        <svg className="w-6 h-6 text-[#00FF66]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    </div>
                    <h3 className="text-white font-bold text-xl">Integridade Digital</h3>
                    <p className="text-gray-400 text-base font-light leading-relaxed">Protocolo de segurança Relaxx: Seus dados biométricos foram destruídos permanentemente após a análise neural.</p>
                </div>
                <div className="relaxx-glass p-10 rounded-[40px] space-y-5 border-[#00FF66]/20 bg-[#00FF66]/5">
                    <div className="w-12 h-12 rounded-2xl bg-[#00FF66]/20 flex items-center justify-center">
                        <svg className="w-6 h-6 text-[#00FF66]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <h3 className="text-[#00FF66] font-bold text-xl">Agendamento</h3>
                    <p className="text-gray-200 text-base font-light leading-relaxed">Apresente este código de diagnóstico em sua unidade Relaxx para uma avaliação clínica presencial acelerada.</p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6 w-full md:w-auto">
                <button 
                    onClick={() => window.print()}
                    className="btn-relaxx px-16 py-6 rounded-full font-black uppercase tracking-[0.3em] text-xs transition-all flex items-center justify-center gap-4"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                    Gerar PDF do Laudo
                </button>
                <button 
                    className="px-16 py-6 border border-white/10 rounded-full font-black uppercase tracking-[0.3em] text-xs text-white hover:bg-white/5 transition-all"
                    onClick={() => window.open('https://relaxx.clinic', '_blank')}
                >
                    Falar com Especialista
                </button>
            </div>
        </section>
      </div>
    </div>
  );
};

export default ReportView;
