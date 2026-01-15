
import { GoogleGenerativeAI } from "@google/generative-ai";
import { TelemetryData } from "../types";

export const generateClinicalReport = async (history: TelemetryData[], clickCount: number = 0): Promise<string> => {
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

    // Safety check for empty history
    const safeMaxOpening = isFinite(maxOpening) ? maxOpening : 0;
    const safeAvgDeviation = isFinite(avgDeviation) ? avgDeviation : 0;

    const prompt = `
      ATUAÇÃO: Especialista em Bioestética Orofacial e Cadeias Musculares (Conceito Relaxx).
      OBJETIVO: Gerar uma PRÉ-AVALIAÇÃO BIOMECÂNICA (Triagem). NÃO É UM DIAGNÓSTICO MÉDICO FECHADO.

      DADOS BIOMÉTRICOS EXATOS (Baseie sua análise APENAS nestes números):
      - Abertura Máxima: ${safeMaxOpening.toFixed(2)}mm
      - Desvio Lateral: ${safeAvgDeviation.toFixed(2)}mm
      - Estalos/Clicks Detectados: ${clickCount}
      
      REGRAS DE INTERPRETAÇÃO (Siga estritamente):
      1. Se Abertura < 40mm: Classificar como "Limitação de Amplitude".
      2. Se Abertura > 55mm: Classificar como "Hipermobilidade/Laxidão".
      3. Se Abertura entre 40-55mm: Classificar como "Amplitude Funcional Normal".
      
      4. Se Desvio < 3mm: Classificar como "Padrão de Estabilidade Preservado". 
      5. Se Desvio > 3mm: Classificar como "Assimetria de Movimento Detectada".

      6. Se Estalos > 0: ALERTAR sobre possível desarranjo interno (incoordenação côndilo-disco). Citar que estalos indicam atrito articular.

      DIRETRIZES ÉTICAS E DE TOM:
      - Seja objetivo e técnico. SEM emojis excessivos ou linguagem infantil.
      - NÃO inicie com frases como "Aqui está seu relatório" ou "Como IA...". Apenas entregue o laudo.
      - Se os números estiverem normais (Regras 3, 4 e 6=0), PARABENIZE a saúde funcional e sugira manutenção preventiva. NÃO INVENTE PROBLEMAS.
      - Se houver desvios ou estalos, explique a biomecânica (Efeito Dominó) e direcione para "Anamnese Clínica Detalhada" com um especialista, não para venda direta.

      ESTRUTURA DE SAÍDA (MARKDOWN):
      # 🧬 BIO-ANÁLISE DIGITAL (Triagem)
      
      ## 1. INTEGRIDADE DA ATM
      [Sua análise baseada EXCLUSIVAMENTE nas regras de Abertura acima]
      
      ## 2. DINÂMICA DE MOVIMENTO
      [Sua análise baseada EXCLUSIVAMENTE nas regras de Desvio acima]
      
      ## 3. CORRELAÇÃO POSTURAL
      [Explique brevemente o conceito de cadeias musculares. Se houve desvio, cite possível tensão cervical. Se não, cite o equilíbrio do sistema.]
      
      ## 4. PRÓXIMOS PASSOS
      [Se houver alertas: Recomendar "Agendamento de Consulta para Avaliação Clínica".]
      [Se normal: Recomendar "Check-up Preventivo Anual".]
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
