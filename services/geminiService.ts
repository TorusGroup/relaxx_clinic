
import { GoogleGenerativeAI } from "@google/generative-ai";
import { TelemetryData } from "../types";

export const generateClinicalReport = async (history: TelemetryData[]): Promise<string> => {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.error("❌ API ERROR: VITE_GEMINI_API_KEY Missing");
      return "Erro de Configuração: Chave de API não encontrada.";
    }

    console.log("🧬 Starting Analysis with Gemini 2.0 Flash...");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const maxOpening = Math.max(...history.map(h => h.metrics.openingAmplitude));
    const avgDeviation = history.reduce((acc, h) => acc + Math.abs(h.metrics.lateralDeviation), 0) / history.length;
    const maxDeviation = Math.max(...history.map(h => Math.abs(h.metrics.lateralDeviation)));
    const stabilityIndex = history.length > 0 ? (100 - (avgDeviation * 2)) : 0;

    const prompt = `
      ATUAÇÃO: Especialista em Bioestética Orofacial e Cadeias Musculares (Conceito Relaxx).
      
      DADOS BIOMÉTRICOS (VISÃO COMPUTACIONAL):
      - Abertura Máxima (Amplitude): ${maxOpening.toFixed(2)}mm
      - Desvio Lateral Médio (Instabilidade): ${avgDeviation.toFixed(2)}mm
      - Índice de Estabilidade Muscular: ${stabilityIndex.toFixed(1)}%
      
      DIRETRIZES DE MARCA (RELAXX CLINIC):
      - O corpo é uma unidade conectada. A mandíbula (ATM) é o "dominó número 1".
      - DTM causa dores em cadeia (pescoço, ombros, lombar).
      - Tom de voz: Científico, Futurista, Direto.
      
      GERAR LAUDO ESTRUTURADO:
      # 🧬 BIO-ANÁLISE DIGITAL
      
      ## 1. INTEGRIDADE DA ATM
      (Analise a amplitude. Se < 40mm, alertar sobre limitação funcional. Se > 55mm, hipermobilidade).
      
      ## 2. DINÂMICA DE MOVIMENTO
      (Analise o desvio. Se > 3mm, explicar como isso sobrecarrega o Nervo Trigêmeo e gera tensão cervical).
      
      ## 3. CONEXÃO POSTURAL (EFEITO DOMINÓ)
      (Explique que a assimetria detectada não para na boca. Pode ser a causa de dores de cabeça ou tensão nos ombros relatada pelo paciente).
      
      ## 4. PLANO DE AÇÃO
      (Recomende Agendamento de Protocolo Relaxx para recalibração oclusal com Placa Relaxx).
      
      Use emojis médicos sutis e formatação Markdown limpa.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    console.log("✅ Analysis Complete.");
    return response.text();

  } catch (error) {
    console.error("❌ Gemini API Fatal Error:", error);
    return `Erro na síntese neural: ${error instanceof Error ? error.message : "Falha desconhecida"}`;
  }
};
