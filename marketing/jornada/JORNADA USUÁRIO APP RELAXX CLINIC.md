### **Documento de Experiência do Usuário (UX) e Interface (UI)**

## **Projeto Relaxx.clinic: Menos tensão, mais você.**

Versão: 1.0  
Data: 23 de julho de 2025  
Objetivo: Detalhar a jornada completa do usuário para o aplicativo Relaxx.clinic, servindo como guia mestre para o desenvolvimento do frontend. O foco é criar uma experiência fluida, empoderadora e clinicamente robusta, que traduza a essência da marca em cada interação.

### **1\. Filosofia de Design e Princípios Fundamentais**

Inspirados pelo manifesto "Menos tensão, mais você" e pela paleta de cores (\#003223, \#15ed70, \#a6fcd5, \#fbfbf9), nossos princípios de design são:

1. **Acolhimento Terapêutico:** A interface deve ser calma, convidativa e empática. Usamos microinterações suaves, linguagem clara e um tom de voz que cuida, como uma amiga especialista. A paleta de cores será usada para criar um ambiente sereno, com o verde-escuro (\#003223) para fundos e textos de base, o branco (\#fbfbf9) para áreas de respiro, e os verdes-claros (\#15ed70, \#a6fcd5) para botões de ação (CTAs), destaques e gráficos, simbolizando saúde e progresso.  
2. **Clareza Científica:** A complexidade da DTM é traduzida em informações visuais simples e compreensíveis. Gráficos, relatórios e dados são apresentados de forma limpa e direta, sem jargões, empoderando o usuário com conhecimento sobre sua própria saúde.  
3. **Jornada Contínua e Sem Fricção:** Cada tela flui para a próxima de forma lógica e intuitiva. Minimizamos a necessidade de digitação com seleções inteligentes, login social e um fluxo de checkout que acontece em uma única página.  
4. **Design que Respira:** Inspirado nos benchmarks, mas com nossa identidade. Usaremos ilustrações personalizadas com traços orgânicos, muito espaço em branco e uma tipografia elegante e legível para criar uma sensação premium e de bem-estar.

### **2\. Mapa da Jornada do Usuário (Tela a Tela)**

#### **FASE 1: Descoberta, Educação e Confiança**

O objetivo desta fase é acolher o usuário, educá-lo sobre a importância da saúde da mandíbula e construir a confiança necessária para que ele inicie sua jornada.

* **Tela 1: Splash Screen**  
  * **Visual:** Fundo no tom verde-escuro (\#003223). O logo "X" da Relaxx aparece no centro e pulsa suavemente uma única vez, como uma batida de coração calma, antes de transicionar para a próxima tela.  
  * **Propósito:** Carregamento inicial e apresentação sutil da marca.  
* **Telas 2-4: Onboarding Educacional**  
  * **Visual:** Slides em tela cheia com ilustrações elegantes e minimalistas sobre um fundo branco (\#fbfbf9). O usuário navega horizontalmente.  
  * **Conteúdo:**  
    * **Slide 1:** Título: "Sua mandíbula comanda mais do que você imagina." Ilustração mostrando conexões sutis da mandíbula com o pescoço, ombros e coluna.  
    * **Slide 2:** Título: "A tensão silenciosa afeta seu sono, sua energia e seu bem-estar." Ilustração de uma pessoa com uma aura de tensão ao redor da cabeça, que se dissipa.  
    * **Slide 3:** Título: "Vamos resgatar seu equilíbrio. Juntos." Ilustração de uma pessoa com uma postura relaxada e expressão serena.  
  * **Interação:** Botão "Iniciar Minha Jornada" com destaque no verde (\#15ed70).

#### **FASE 2: Análise, Conexão e Ação**

Aqui, coletamos as informações essenciais e conectamos o usuário ao cuidado profissional da forma mais simples possível.

* **Tela 5: Cadastro Simplificado**  
  * **Visual:** Tela limpa com o logo e duas opções claras.  
  * **Interação:** Botões grandes para "Continuar com Google" e "Continuar com Apple". Uma opção de "Cadastrar com e-mail" em menor destaque abaixo. O objetivo é remover a barreira do preenchimento de formulários.  
* **Tela 6: Anamnese Conversacional**  
  * **Visual:** A interface simula um chat. Cada pergunta aparece como uma nova mensagem. O usuário responde com botões de múltipla escolha ou sliders.  
  * **Interação Chave:** Ao final, uma pergunta aberta: **"Qual é o seu principal objetivo com o tratamento?"**. As respostas (ex: "dormir melhor", "aliviar dor de cabeça") serão usadas como tags para personalizar o acompanhamento futuro.  
* **Tela 7: O Hub de Ação**  
  * **Visual:** Um dashboard limpo e direto. "Olá, \[Nome\]\! Pronto para começar?".  
  * **CTA Primário:** Um card em destaque: **"Falar com um especialista agora"**. Abaixo, um texto dinâmico: "Tempo de espera estimado: \~5 minutos".  
  * **CTA Secundário:** Um botão com menos destaque: **"Agendar melhor horário"**, que abre um calendário intuitivo para escolher data e hora.

#### **FASE 3: A Experiência da Teleconsulta**

O momento mais importante da jornada: a união do cuidado humano com a tecnologia de ponta.

* **Tela 8: Sala de Espera Virtual**  
  * **Visual:** O fundo mostra uma animação de gradiente suave e lenta com os tons de verde da marca. Exibe a foto, nome e especialidade do dentista.  
  * **Texto:** "Dr. Carlos está se conectando... Prepare-se para um momento de cuidado."  
* **Tela 9: A Sala de Consulta**  
  * **Visual:** Vídeo do dentista em tela cheia. O vídeo do usuário fica em uma janela menor e flutuante. Um painel lateral, visível apenas para o dentista, exibe as respostas da anamnese.  
* **Tela 10: A Ferramenta de Análise de Movimento**  
  * **Ativação:** O dentista solicita e o usuário concede permissão para a câmera.  
  * **Visual:** A tela foca no vídeo do usuário. Sobre o rosto, uma malha de pontos do MediaPipe é renderizada de forma sutil e elegante.  
  * **Visualização de Dados (A Mágica da UX):**  
    * **Abertura:** Uma barra vertical ao lado do rosto se preenche em tempo real, mostrando a amplitude em milímetros.  
    * **Desvio:** Uma linha verde neon (\#15ed70) traça o caminho exato do queixo durante o movimento, tornando qualquer desvio em "S" ou "C" instantaneamente visível.  
    * **Guia:** Textos simples aparecem na tela, guiando o usuário: "Abra a boca lentamente", "Agora, feche".  
* **Tela 11: Relatório Pós-Consulta**  
  * **Visual:** Um relatório visualmente rico, como um infográfico, que pode ser salvo como PDF ou imagem.  
  * **Conteúdo:** Resumo da conversa, diagnóstico preliminar, os gráficos gerados pela análise e a recomendação clara do próximo passo.  
  * **CTA:** Um botão proeminente: "Agendar minha radiografia".

#### **FASE 4: O E-commerce da Saúde**

Transformamos a compra em uma experiência de cuidado, fluida e sem ansiedade.

* **Telas 12 e 13: Checkout e Agendamento Integrados**  
  * **Visual:** Uma única página com seções que se abrem suavemente.  
  * **Fluxo:**  
    1. **Dados:** CPF e endereço para entrega da placa.  
    2. **Pagamento:** Campos para Cartão de Crédito e um botão grande para "Pagar com Pix" (que gera um QR Code).  
    3. **Agendamento da Radiologia:** Um mapa interativo mostra as 3 clínicas parceiras mais próximas. Ao selecionar uma, um calendário simples exibe os horários disponíveis.  
* **Tela 14: Confirmação e Carregamento**  
  * **Visual:** Enquanto o pagamento processa, o logo "X" pulsa suavemente. A transição para a tela de sucesso é instantânea após a aprovação.  
  * **Conteúdo da Confirmação:** "Tudo certo, \[Nome\]\! Sua jornada de relaxamento começou." O QR Code para a clínica é o elemento central.  
  * **Interação:** Botões "Adicionar à Apple Wallet / Google Wallet" e "Enviar confirmação por e-mail".

#### **FASE 5: A Jornada de Tratamento e Acompanhamento**

O aplicativo se torna o companheiro diário do usuário na busca pelo bem-estar.

* **Tela 15: Acompanhamento do Pedido**  
  * **Visual:** Uma linha do tempo vertical e elegante, com ícones personalizados para cada etapa.  
  * **Status:** Consulta Realizada \-\> Análise 3D em Progresso \-\> Sua Placa Personalizada está em Produção \-\> A Caminho \-\> Placa Entregue\!.  
* **Tela 16: Dashboard de Tratamento**  
  * **Visual:** O novo hub principal do app. Inspirado nos melhores apps de bem-estar.  
  * **Widgets Principais:**  
    * **Adesão ao Tratamento:** Um gráfico circular proeminente: "Você usou sua placa por **21 de 30** noites".  
    * **Seus Objetivos (Personalização):** Um card que recupera o objetivo da anamnese ("Como está sua dor de cabeça?") e permite um registro rápido com uma escala de emojis ou um slider de 0 a 10\.  
    * **Acesso Rápido:** Botões para "Diário", "Exercícios" e "Monitor de Sono".  
* **Telas 17-20: Ferramentas de Suporte**  
  * **Diário do Dia:** Uma interface de notas simples e bonita para registrar percepções.  
  * **Monitor de Sono:** Gráficos limpos que, via integração com o HealthKit (iOS) ou Health Connect (Android), exibem dados de sono. Inclui um "Despertador Inteligente".  
  * **Exercícios Terapêuticos:** Uma biblioteca de vídeos curtos e bem produzidos com exercícios para mandíbula e pescoço.  
  * **Rede de Cuidado:** Uma área para encontrar e agendar consultas com profissionais parceiros (fisioterapeutas, etc.).

### **3\. Notificações e Engajamento**

As notificações seguirão nosso tom de voz: gentis e úteis, nunca intrusivas.

* "Hora de relaxar. Lembre-se de usar sua placa Relaxx esta noite. 😴"  
* "Como você se sentiu hoje, \[Nome\]? Reserve 1 minuto para seu diário."  
* "Sua placa personalizada já está em produção\! ✨"

Este documento é a base para que a equipe de desenvolvimento no Bolt e Replit possa construir uma experiência coesa, funcional e, acima de tudo, profundamente humana.