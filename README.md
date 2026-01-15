# Relaxx Clinic - AI Diagnostics 🧬

Aplicaçao de **Bio-Diagnóstico Facial e Mandibular** desenvolvida para a Relaxx Clinic. Utiliza Inteligência Artificial para análise em tempo real da biomecânica da mandíbula, gerando laudos automáticos integrados com o ecossistema Relaxx.

## 🚀 Tecnologias

*   **Core:** React 19 + TypeScript + Vite
*   **AI Vision:** MediaPipe Face Mesh (Google)
*   **AI Reasoning:** Google Gemini 2.0 Flash (via API)
*   **Styling:** TailwindCSS
*   **Deploy:** Netlify

## ✨ Funcionalidades (V9.9)

*   **Rastreamento em Tempo Real:** Monitoramento de 478 pontos faciais a 30fps.
*   **Gráfico de Trajetória:** Visualização precisa do movimento de abertura/fechamento (Desvio Lateral vs Amplitude).
*   **Protocolo Guiado:** UX imersiva com contagem regressiva e instruções de calibração ("Zero Biológico").
*   **Laudo Inteligente:** Geração de pré-diagnósticos baseados em métricas exatas (Milímetros de abertura e desvio).
*   **Segurança:** Integração segura de API Keys via Google Cloud Referrer Restrictions.

## 🛠️ Instalação e Uso Local

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/TorusGroup/relaxx_clinic.git
    cd relaxx_clinic
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```

3.  **Configuração de Ambiente:**
    Crie um arquivo `.env.local` na raiz e adicione sua chave:
    ```env
    VITE_GEMINI_API_KEY=sua_chave_aqui
    ```

4.  **Rodar Aplicação:**
    ```bash
    npm run dev
    ```

## 🔒 Segurança em Produção

Como esta é uma aplicação Client-Side, a chave da API é exposta no navegador. Para segurança:
1.  Configure **HTTP Referrer Restrictions** no Google Cloud Console.
2.  Autorize apenas os domínios: `localhost:5000` e `https://seu-app.netlify.app`.
3.  O arquivo `netlify.toml` está configurado para permitir o build ignorando o scanner de segredos (Falso Positivo).

---
© 2026 Relaxx Clinic AI. Todos os direitos reservados.
