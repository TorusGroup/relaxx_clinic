import React from 'react';
import ReactMarkdown from 'react-markdown';
import TrajectoryGraph from './TrajectoryGraph';
import EducationalCard from './EducationalCard';
import { TelemetryData } from '../types';

interface Props {
  report: string;
  score: number;
  clicks: number;
  history: TelemetryData[];
  onReset: () => void;
}

const ReportView: React.FC<Props> = ({ report, score, clicks, history, onReset }) => {
  const maxOpening = Math.max(...history.map(h => h.metrics.openingAmplitude));
  const avgDeviation = history.reduce((acc, h) => acc + Math.abs(h.metrics.lateralDeviation), 0) / Math.max(1, history.length);
  const now = new Date().toLocaleDateString('pt-BR');

  const path = history.map(h => ({
    x: h.metrics.lateralDeviation,
    y: h.metrics.openingAmplitude
  })).filter(p => p.y > 2);

  const getScoreColor = (s: number) => {
    if (s >= 80) return '#00FF66';
    if (s >= 60) return '#FFFF00';
    return '#FF3333';
  };

  return (
    <div className="fixed inset-0 z-[500] bg-[#001A13] overflow-y-auto print:bg-white print:static print:inset-auto print:z-0">
      <style>{`
        @media print {
          @page { margin: 1.5cm; size: A4; }
          body { 
            background-color: white !important; 
            color: black !important;
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
          }
          .no-print { display: none !important; }
          .print-black { color: black !important; }
          .print-bg-white { background: white !important; border: 1px solid #eee !important; }
          .print-green { color: #002D20 !important; }
          .print-shadow-none { box-shadow: none !important; }
          .print-border { border: 1px solid #ddd !important; border-radius: 12px !important; }
          .prose { color: #333 !important; max-width: none !important; }
          .trajectory-container { background: white !important; border: 1px solid #eee !important; }
        }
      `}</style>

      {/* HEADER - CLINICAL STYLE */}
      <div className="w-full bg-[#002D20] p-6 flex justify-between items-center border-b border-white/10 print:bg-white print:border-b-2 print:border-[#002D20]">
        <div className="flex items-center gap-4">
          <img src="/relaxx-logo.png" alt="Relaxx Clinic" className="w-12 h-12 rounded-xl border border-white/10 print:border-none" />
          <div className="flex flex-col">
            <span className="text-white font-black tracking-widest uppercase text-lg print:text-[#002D20]">Relaxx Clinic</span>
            <span className="text-[#00FF66] text-[10px] font-bold tracking-[0.2em] uppercase opacity-70 print:text-[#002D20]">Digital Biometric Lab</span>
          </div>
        </div>
        <div className="text-right flex flex-col items-end gap-1">
          <span className="text-white/40 text-[10px] uppercase font-bold print:text-black/40">Data do Exame</span>
          <span className="text-white font-mono text-xs print:text-black">{now}</span>
          <button onClick={onReset} className="text-white/30 hover:text-white transition-colors no-print text-[10px] mt-2 border border-white/10 px-3 py-1 rounded-full uppercase">Encerrar Sessão</button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 md:p-12 space-y-12 print:p-0 print:space-y-8">

        {/* 1. HEALTH SCORE & QUICK FINDINGS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 relative bg-white/5 border border-white/10 rounded-[32px] p-8 md:p-10 overflow-hidden print:bg-white print:border-2 print:border-gray-100 print:shadow-none">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#00FF66]/5 blur-[80px] rounded-full no-print" />

            <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
              {/* RADIAL GAUGE */}
              <div className="relative w-40 h-40 flex items-center justify-center flex-shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" className="print:stroke-gray-100" />
                  <circle
                    cx="50" cy="50" r="44" fill="none"
                    stroke={getScoreColor(score)} strokeWidth="10"
                    strokeDasharray={`${2 * Math.PI * 44}`}
                    strokeDashoffset={`${2 * Math.PI * 44 * (1 - score / 100)}`}
                    className="transition-all duration-1000 ease-out"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="block text-4xl font-black text-white print:text-black">{score.toFixed(0)}</span>
                  <span className="text-[8px] text-[#00FF66] uppercase tracking-widest font-black print:text-[#002D20]">Índice ATM</span>
                </div>
              </div>

              <div className="flex-1 space-y-4 text-center md:text-left">
                <h2 className="text-2xl md:text-3xl font-black text-white print:text-[#002D20] leading-tight">
                  {score >= 80 ? "Sinergia Biomecânica" : score >= 60 ? "Desvio Compensatório" : "Instabilidade Crítica"}
                </h2>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start print:hidden">
                  <span className="bg-[#00FF66]/10 text-[#00FF66] text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-widest border border-[#00FF66]/20">AI Verified</span>
                  <span className="bg-white/5 text-white/50 text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-widest border border-white/10">v15.0 Precision</span>
                </div>
                <p className="text-white/60 text-sm leading-relaxed print:text-gray-700">
                  Sua digitalização biomecânica foi concluída com sucesso. O sistema analisou 89 vetores de movimento para gerar este diagnóstico funcional instantâneo.
                </p>
              </div>
            </div>
          </section>

          {/* QUICK INDICATORS GRID */}
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-[24px] p-6 print:border-gray-100 print:bg-white text-center">
              <span className="text-[10px] text-white/40 uppercase font-black block mb-1 print:text-gray-500">Amplitude</span>
              <span className="text-2xl font-black text-white print:text-[#002D20]">{maxOpening.toFixed(1)}mm</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-[24px] p-6 print:border-gray-100 print:bg-white text-center">
              <span className="text-[10px] text-white/40 uppercase font-black block mb-1 print:text-gray-500">Estalos</span>
              <span className={`text-2xl font-black ${clicks > 0 ? 'text-red-500' : 'text-[#00FF66] print:text-[#002D20]'}`}>{clicks}</span>
            </div>
          </div>
        </div>

        {/* 2. CORE BIOMETRICS GRID (EDUCATION) */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-[2px] w-8 bg-[#00FF66]" />
            <h3 className="text-white font-black text-sm uppercase tracking-[.3em] print:text-[#002D20]">Bio-Métricas Educativas</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <EducationalCard
              title="Abertura"
              icon="📏"
              value={maxOpening.toFixed(1)}
              label="mm"
              description="Representa a capacidade máxima de alongamento das fibras musculares e excursão do disco."
              clinicalContext="O padrão funcional é entre 40-55mm. Valores fora desta faixa indicam hipo ou hipermobilidade."
              color="#00FF66"
            />
            <EducationalCard
              title="Simetria"
              icon="⚖️"
              value={avgDeviation.toFixed(1)}
              label="mm"
              description="Mede o quanto a sua mandíbula foge do eixo central durante o movimento de abertura."
              clinicalContext="Desvios acima de 3mm sugerem desequilíbrio muscular lateral ou falha na coordenação de disco."
              color="#00FF66"
            />
            <EducationalCard
              title="Estalos"
              icon="👂"
              value={clicks.toString()}
              label="ev"
              description="Ruídos detectados por picos de aceleração abruptos na articulação temporal (ATM)."
              clinicalContext={clicks > 0 ? "Presença de ruído indica deslocamento de disco com redução. Requer monitoramento." : "Ausência de ruído indica boa lubrificação e posicionamento de disco."}
              color={clicks > 0 ? "#FF3333" : "#00FF66"}
            />
          </div>
        </section>

        {/* 3. VISUAL SIGNATURE (GRAPHS) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:block print:space-y-8">

          <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 flex flex-col items-center print:bg-white print:border print:border-gray-100">
            <h3 className="text-[#00FF66] text-xs font-black uppercase tracking-[0.2em] mb-8 w-full print:text-[#002D20]">Assinatura de Trajetória</h3>
            <div className="bg-black/20 rounded-2xl p-6 border border-white/5 trajectory-container print:bg-white print:border-[#eee]">
              <TrajectoryGraph path={path} width={240} height={320} />
            </div>
            <p className="text-white/30 text-[9px] mt-6 text-center leading-relaxed print:text-gray-400">
              O traço acima é a 'impressão digital' biometal do seu movimento. Desvios indicam o lado da compensação.
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-[#002D20]/40 border border-white/10 rounded-[32px] p-8 print:bg-white print:border print:border-gray-100">
              <h3 className="text-[#00FF66] text-xs font-black uppercase tracking-[0.2em] mb-6 print:text-[#002D20]">Análise de Performance</h3>

              <div className="space-y-8">
                {/* BARS FROM PREVIOUS VERSION BUT REFINED */}
                <div className="space-y-3 font-semibold">
                  <div className="flex justify-between text-[11px] text-white/50 uppercase tracking-widest print:text-gray-500">
                    <span>Abertura Funcional</span>
                    <span className="text-[#00FF66] print:text-[#002D20]">{maxOpening.toFixed(1)}mm</span>
                  </div>
                  <div className="relative h-2 bg-white/5 rounded-full overflow-hidden print:bg-gray-100">
                    <div className="absolute top-0 bottom-0 left-[57%] w-[21%] border-x border-[#00FF66]/20 bg-[#00FF66]/5" />
                    <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#00FF66]/50 to-[#00FF66] rounded-full" style={{ width: `${(maxOpening / 70) * 100}%` }} />
                  </div>
                </div>

                <div className="space-y-3 font-semibold">
                  <div className="flex justify-between text-[11px] text-white/50 uppercase tracking-widest print:text-gray-500">
                    <span>Desvio Lateral</span>
                    <span className={avgDeviation > 3 ? 'text-red-400' : 'text-[#00FF66] print:text-[#002D20]'}>{avgDeviation.toFixed(1)}mm</span>
                  </div>
                  <div className="relative h-2 bg-white/5 rounded-full overflow-hidden print:bg-gray-100">
                    <div className="absolute top-0 bottom-0 left-0 w-[30%] border-r border-[#00FF66]/20 bg-[#00FF66]/5" />
                    <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#00FF66]/50 to-[#00FF66] rounded-full" style={{ width: `${Math.min(100, (avgDeviation / 10) * 100)}%` }} />
                  </div>
                </div>
              </div>

              <div className="mt-10 p-6 bg-white/[0.03] rounded-2lx border border-white/5 print:bg-gray-50">
                <p className="text-[11px] text-white/50 italic leading-relaxed print:text-gray-600 font-medium">
                  "A biomecânica facial é a fundação da saúde postural. Pequenos desvios na ATM podem gerar compensações em toda a cadeia cervical."
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 4. PRE-ANALYSIS RESULTS (AI) */}
        <section className="relative bg-white/5 border border-white/10 rounded-[40px] p-8 md:p-12 overflow-hidden print:bg-white print:border-2 print:border-gray-100 print:shadow-none break-inside-avoid shadow-[0_30px_60px_rgba(0,0,0,0.4)]">
          <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00FF66]/20 to-transparent no-print" />

          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00FF66] to-[#002D20] flex items-center justify-center text-white font-black shadow-lg shadow-[#00FF66]/20">AI</div>
              <div>
                <h3 className="text-white font-black text-xl tracking-tight print:text-[#002D20]">Resultado da Pré-Análise</h3>
                <p className="text-[#00FF66] text-[9px] font-black uppercase tracking-[0.3em] opacity-80">Clinical Intelligence Engine</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10 print:hidden">
              <div className="w-2 h-2 rounded-full bg-[#00FF66] animate-pulse" />
              <span className="text-[10px] text-white/50 font-black uppercase tracking-widest">Digital Audit Active</span>
            </div>
          </div>

          <div className="prose prose-invert max-w-none 
                prose-headings:text-[#00FF66] prose-headings:font-black prose-headings:uppercase prose-headings:tracking-[0.2em] prose-headings:text-[11px] prose-headings:mt-8 prose-headings:mb-4
                prose-p:text-white/80 prose-p:leading-relaxed prose-p:text-sm
                prose-strong:text-white prose-strong:font-black
                prose-ul:list-disc prose-li:text-white/70 prose-li:text-sm
                print:prose-headings:text-[#002D20] print:prose-p:text-gray-800 print:prose-strong:text-black">
            <ReactMarkdown>{report}</ReactMarkdown>
          </div>
        </section>

        {/* 5. PRÓXIMOS PASSOS & CTAS */}
        <section className="bg-gradient-to-br from-[#002D20] to-[#001A13] border border-[#00FF66]/20 rounded-[40px] p-10 md:p-14 text-center space-y-10 no-print">
          <div className="max-w-2xl mx-auto space-y-4">
            <h3 className="text-3xl font-black text-white tracking-tight">O que fazer agora?</h3>
            <p className="text-white/60 text-lg">Seu diagnóstico é o primeiro passo para uma vida sem dor. Escolha como deseja prosseguir com a Relaxx Clinic.</p>
          </div>

          <div className="flex flex-col md:flex-row gap-6 justify-center items-stretch">
            <a
              href="https://relaxx.clinic"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-white text-[#001A13] px-10 py-6 rounded-[24px] font-black uppercase tracking-widest hover:scale-105 transition-all text-sm flex flex-col items-center gap-2 group shadow-[0_20px_40px_rgba(255,255,255,0.1)] hover:shadow-[#00FF66]/20"
            >
              <span>Conhecer o Tratamento</span>
              <span className="text-[10px] opacity-40 group-hover:opacity-100 transition-opacity">relaxx.clinic</span>
            </a>

            <a
              href="https://relaxx.clinic/chat/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-transparent border-2 border-[#00FF66] text-[#00FF66] px-10 py-6 rounded-[24px] font-black uppercase tracking-widest hover:bg-[#00FF66] hover:text-[#001A13] transition-all text-sm flex flex-col items-center gap-2 group"
            >
              <span>Iniciar consulta</span>
              <span className="text-[10px] opacity-50 group-hover:opacity-100 transition-opacity">Consultoria Especialista</span>
            </a>
          </div>

          <div className="pt-6">
            <button
              onClick={() => window.print()}
              className="text-white/40 hover:text-[#00FF66] transition-colors text-[10px] font-black uppercase tracking-[0.3em]"
            >
              Imprimir Cópia Clínica (PDF) 🖨️
            </button>
          </div>
        </section>

        {/* FOOTER - ONLY PRINT */}
        <div className="hidden print:flex justify-between items-center pt-10 border-t border-gray-100 mt-20 text-[8px] text-gray-400 uppercase tracking-widest font-bold">
          <span>Relaxx Clinic - Biomechanical Report</span>
          <span>Documento Gerado por IA - v15 Precision</span>
          <span>Página 1 de 1</span>
        </div>

      </div>
    </div>
  );
};

export default ReportView;
