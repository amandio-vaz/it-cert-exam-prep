import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import { UploadedFile, ExamData, Question, UserAnswer, QuestionType, Attempt } from '../types';

const API_KEY = process.env.API_KEY;
let aiInstance: GoogleGenAI | null = null; // Declara uma instância anulável

// Função para obter ou criar a instância do GoogleGenAI
const getGenAI = (): GoogleGenAI => {
  if (!API_KEY) {
    throw new Error("A chave de API não está configurada. Por favor, certifique-se de que process.env.API_KEY esteja definido.");
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: API_KEY });
  }
  return aiInstance;
};

const examSchema = {
  type: Type.OBJECT,
  properties: {
    examCode: { type: Type.STRING },
    examName: { type: Type.STRING },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          type: { type: Type.STRING, enum: Object.values(QuestionType) },
          scenario: { type: Type.STRING, nullable: true },
          text: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                text: { type: Type.STRING },
              },
              required: ['id', 'text'],
            },
          },
          correctAnswers: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          explanation: { type: Type.STRING },
          domain: { type: Type.STRING },
        },
        required: ['id', 'type', 'text', 'options', 'correctAnswers', 'explanation', 'domain'],
      },
    },
  },
  required: ['examCode', 'examName', 'questions'],
};

const getSystemPrompt = (examCode: string, language: 'pt-BR' | 'en-US') => {
    if (language === 'en-US') {
        return `
You are an advanced expert in IT certification exam preparation. Your main goal is to help users prepare ethically and effectively, without cheating or accessing real exam questions.

1. Exam Identification:
   - Based on the provided exam code ('${examCode}'), identify the full official name of the certification.

2. Content Analysis:
   - Deeply analyze the content provided by the user (summaries of study materials).
   - Use Google Search to supplement and validate the information, ensuring it aligns with the current exam objectives.
   - DO NOT reproduce proprietary questions from exam dumps. Create ORIGINAL questions inspired by the exam topics.

3. Practice Exam Generation:
   - Generate a set of realistic questions based on the analysis.
   - Your response MUST be ONLY a valid JSON object, with no other text, markdown, or explanation before or after it.
   - The JSON must strictly adhere to the following schema:
   ${JSON.stringify(examSchema, null, 2)}
`;
    }

    return `
Você é um especialista avançado em preparação para exames de certificação de TI. Seu objetivo principal é ajudar os usuários a se prepararem de forma ética e eficaz, sem trapacear ou acessar perguntas reais do exame.

1. Identificação do Exame:
   - Com base no código do exame fornecido ('${examCode}'), identifique o nome oficial completo da certificação.

2. Análise de Conteúdo:
   - Analise profundamente o conteúdo fornecido pelo usuário (resumos dos materiais de estudo).
   - Use o Google Search para complementar e validar as informações, garantindo que estejam alinhadas com os objetivos atuais do exame.
   - NÃO reproduza perguntas proprietárias de bancos de exames. Crie perguntas ORIGINAIS inspiradas nos tópicos do exame.

3. Geração de Exame Prático:
   - Gere um conjunto de questões realistas com base na análise.
   - A sua resposta DEVE ser APENAS um objeto JSON válido, sem nenhum outro texto, markdown ou explicação antes ou depois dele.
   - O JSON deve seguir estritamente o seguinte esquema:
   ${JSON.stringify(examSchema, null, 2)}
`;
};

// Função auxiliar para resumir e extrair pontos-chave de um único arquivo.
const distillFileContent = async (file: UploadedFile, examCode: string, language: 'pt-BR' | 'en-US'): Promise<string> => {
    const ai = getGenAI();
    const modelName = 'gemini-2.5-flash';
    const prompt = language === 'en-US'
        ? `You are an IT certification expert. Concisely extract and summarize all key concepts, technical details, and important topics from the provided document relevant to the '${examCode}' certification. Focus on information likely to appear on the exam. Return only the summarized text.`
        : `Você é um especialista em certificações de TI. Extraia e resuma de forma concisa todos os conceitos-chave, detalhes técnicos e tópicos importantes do documento fornecido que sejam relevantes para a certificação '${examCode}'. Foque nas informações que provavelmente apareceriam no exame. Retorne apenas o texto resumido.`;


    const contents = [{
        role: "user",
        parts: [
            { inlineData: { mimeType: file.type, data: file.content } },
            { text: prompt }
        ]
    }];

    try {
        const response = await ai.models.generateContent({
            model: modelName,
            contents,
            // pt-BR: Limita o tamanho da resposta para garantir um resumo conciso e otimizar custos.
            // en-US: Limits the response size to ensure a concise summary and optimize costs.
            config: {
                maxOutputTokens: 2048,
            },
        });
        return response.text || '';
    } catch (error) {
        console.error(`Falha ao resumir o arquivo ${file.name}:`, error);
        // Retorna uma mensagem de erro para que o usuário saiba que um arquivo falhou, mas não quebra o processo.
        return `[Erro ao processar o arquivo ${file.name}]`;
    }
};

export const generateExam = async (
    files: UploadedFile[], 
    examCode: string, 
    questionCount: number, 
    extraTopics: string,
    onStatusUpdate: (status: string) => void,
    language: 'pt-BR' | 'en-US'
): Promise<ExamData> => {
    const ai = getGenAI();
    const modelName = 'gemini-2.5-flash';
    
    // Etapa 1: Destilar o conteúdo de cada arquivo para evitar exceder o limite de tokens.
    const summaryStatusMsg = language === 'en-US'
        ? `Summarizing ${files.length} file(s)...`
        : `Resumindo ${files.length} arquivo(s)...`;
    onStatusUpdate(`${summaryStatusMsg} (Step 1 of 2)`);
    
    const distillationPromises = files.map(async (file, index) => {
        const summary = await distillFileContent(file, examCode, language);
        const completedMsg = language === 'en-US' ? 'completed' : 'concluídos';
        onStatusUpdate(`${summaryStatusMsg} (${index + 1}/${files.length} ${completedMsg})`);
        return summary;
    });
    const distilledContents = await Promise.all(distillationPromises);
    const combinedSummaries = distilledContents.join('\n\n---\n\n');

    // Etapa 2: Gerar o exame usando os resumos.
    const generationStatusMsg = language === 'en-US'
        ? "Generating questions based on summaries... (Step 2 of 2)"
        : "Gerando questões com base nos resumos... (Etapa 2 de 2)";
    onStatusUpdate(generationStatusMsg);
    
    const systemInstruction = getSystemPrompt(examCode, language);
    
    const extraTopicsPrompt = {
        'pt-BR': `\n\nConsidere também estes tópicos ou perguntas extras com alta prioridade:\n${extraTopics}`,
        'en-US': `\n\nAlso, consider these extra topics or questions with high priority:\n${extraTopics}`
    };
    const extraTopicsText = extraTopics.trim() ? extraTopicsPrompt[language] : '';
    
    const userPromptText = {
        'pt-BR': `Com base nos resumos dos materiais de estudo fornecidos, gere um exame prático de ${questionCount} questões para a certificação ${examCode}.${extraTopicsText}`,
        'en-US': `Based on the provided summaries of the study materials, generate a ${questionCount}-question practice exam for the ${examCode} certification.${extraTopicsText}`
    };
    const userPrompt = userPromptText[language];
    
    const summariesHeader = language === 'en-US' ? "Study material summaries:\n\n" : "Resumos dos materiais de estudo:\n\n";

    const contents = [{
        role: "user",
        parts: [
            { text: summariesHeader + combinedSummaries },
            { text: userPrompt }
        ]
    }];

    const config = {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        // pt-BR: Limita o output para o máximo seguro do modelo para evitar erros de limite.
        // en-US: Caps output to the model's safe maximum to avoid limit errors.
        maxOutputTokens: 8192,
        temperature: 0.5,
    };

    const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config
    });

    let jsonText = (response.text || '').trim();
    
    // Remove markdown code blocks (case insensitive for JSON/json)
    jsonText = jsonText.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, '$1');

    // Fallback: Tenta encontrar o objeto JSON se houver texto extra ao redor
    const firstBrace = jsonText.indexOf('{');
    const lastBrace = jsonText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
        jsonText = jsonText.substring(firstBrace, lastBrace + 1);
    }

    try {
        const parsedJson = JSON.parse(jsonText);
        return parsedJson as ExamData;
    } catch (error) {
        console.error("Failed to parse JSON response:", jsonText);
        throw new Error("A resposta da IA não estava em um formato JSON válido. O conteúdo gerado pode ter sido cortado ou corrompido.");
    }
};


export const generateStudyPlan = async (examData: ExamData, userAnswers: UserAnswer, attempt: Attempt): Promise<string> => {
    const ai = getGenAI();
    // Agrupa as questões por domínio e calcula o desempenho
    const domainPerformance = examData.questions.reduce((acc, q) => {
        const domain = q.domain || 'Geral';
        if (!acc[domain]) {
            acc[domain] = { total: 0, correct: 0, incorrectQuestions: [] as string[] };
        }
        acc[domain].total++;
        const userAnswer = userAnswers[q.id] || [];
        const isCorrect = q.correctAnswers.length === userAnswer.length && q.correctAnswers.every(val => userAnswer.includes(val));
        
        if (isCorrect) {
            acc[domain].correct++;
        } else {
            acc[domain].incorrectQuestions.push(q.text);
        }
        return acc;
    }, {} as Record<string, { total: number; correct: number; incorrectQuestions: string[] }>);

    // Formata o resumo de desempenho para a tabela Markdown
    const performanceSummary = Object.entries(domainPerformance)
        .map(([domain, data]) => {
            const score = data.total > 0 ? (data.correct / data.total) * 100 : 0;
            return `| ${domain} | ${data.correct}/${data.total} | ${score.toFixed(1)}% |`;
        })
        .join('\n');

    const incorrectQuestionsByDomain = Object.entries(domainPerformance)
        .filter(([, data]) => data.incorrectQuestions.length > 0)
        .map(([domain, data]) => {
            return `**${domain}**:\n${data.incorrectQuestions.map(q => `- "${q}"`).join('\n')}`;
        })
        .join('\n\n');

    const prompt = `
Você é um coach de certificação de TI de elite. Sua tarefa é criar um plano de estudos **excepcionalmente detalhado, visualmente atraente e altamente acionável** com base no desempenho do usuário em um exame simulado. A resposta deve ser formatada em **Markdown avançado**, usando emojis, tabelas, negrito e listas para máxima clareza e engajamento.

---

### **Análise de Desempenho: ${examData.examName} (${examData.examCode})**

-   **🎯 Pontuação Geral:** **${attempt.score.toFixed(1)}%** (${attempt.correctAnswers}/${attempt.totalQuestions} corretas)
-   **⭐ Status:** ${attempt.score >= 70 ? 'Aprovado! 🎉 Ótimo trabalho! Use este plano para refinar seu conhecimento.' : 'Reprovado. 🧗‍♂️ Sem problemas, este é um passo crucial no aprendizado! Vamos focar nos pontos fracos.'}

**Resumo por Domínio:**

| Domínio | Desempenho | Pontuação |
| :--- | :---: | :---: |
${performanceSummary}

---

### **Plano de Ação Personalizado 🚀**

Com base na sua análise, aqui está um plano de estudos estruturado para transformar suas áreas fracas em pontos fortes e garantir seu sucesso na certificação.

#### **Fase 1: Foco nos Fundamentos (Prioridade Máxima)**

Concentre-se nos domínios com pontuação **abaixo de 70%**. Para cada um desses domínios, faça o seguinte:
1.  Crie um cabeçalho com o nome do domínio, um emoji  कमजोर e a pontuação.
2.  Liste os **conceitos-chave** que precisam ser revisados, inferindo-os a partir das perguntas erradas listadas aqui:
    ${incorrectQuestionsByDomain}
3.  Crie uma lista de **Tarefas Acionáveis** com caixas de seleção Markdown (\`[ ]\`), incluindo:
    - Uma tarefa de **Laboratório Prático** específica e detalhada (2-3 horas).
    - Duas a três recomendações de **Leitura Dirigida**, usando o Google Search para encontrar links para a **documentação oficial** ou artigos técnicos relevantes.
    - Uma sugestão para criar de 5 a 10 **Flashcards** para os termos mais importantes.
    - Uma recomendação para fazer um **Micro-Simulado** focado apenas nesse domínio.

#### **Fase 2: Reforço e Polimento (Prioridade Média)**

Para os domínios com pontuação **entre 70% e 90%**, faça o seguinte:
1.  Crie um cabeçalho com o nome do domínio, um emoji 💪 e a pontuação.
2.  Sugira duas **Tarefas Acionáveis**:
    - Uma tarefa de **Revisão Ativa** (ex: explicar conceitos em voz alta).
    - Um **Recurso Avançado**, usando o Google Search para encontrar um vídeo ou tutorial aprofundado sobre um tópico complexo do domínio.

#### **Fase 3: Manutenção do Conhecimento (Prioridade Baixa)**

Para domínios com pontuação **acima de 90%**, apenas liste-os com um emoji ✅ e uma mensagem de parabéns.

---

### **Próximos Passos e Dicas de Mestre 🏆**

1.  **🗓️ Agendamento:** Reserve blocos de estudo de 60-90 minutos no seu calendário, seguindo as prioridades acima. A consistência é a chave.
2.  **✍️ Anotações Ativas:** Não apenas leia ou assista. **Escreva, desenhe diagramas de arquitetura e crie mapas mentais.** O aprendizado ativo aumenta a retenção.
3.  **🔁 Ciclo de Feedback:** Faça um novo simulado completo em 7-10 dias para medir seu progresso e ajustar o plano.

**Lembre-se: o objetivo dos simulados não é apenas passar, mas sim identificar lacunas de conhecimento. Você está no caminho certo!**
`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { 
            tools: [{ googleSearch: {} }],
            maxOutputTokens: 4096,
        },
    });
    
    return response.text || '';
};

export const generateSpeech = async (text: string): Promise<string> => {
    const ai = getGenAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text: `Leia o seguinte texto de forma clara e profissional: ${text}` }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Kore' }, // A calm, professional male voice
                },
            },
        },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        throw new Error("Não foi possível gerar o áudio.");
    }
    return base64Audio;
};

export const analyzeImageWithGemini = async (image: UploadedFile, prompt: string): Promise<string> => {
    const ai = getGenAI();
    const imagePart = {
        inlineData: {
            mimeType: image.type,
            data: image.content,
        },
    };
    const textPart = { text: prompt };

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
        config: {
            maxOutputTokens: 2048,
        },
    });

    return response.text || '';
};

export const generateQuestionTitle = async (questionText: string): Promise<string> => {
    const ai = getGenAI();
    const prompt = `Gere um título curto e conciso (máximo 5 palavras) que resuma a seguinte questão de certificação de TI. O título deve capturar o conceito principal testado. Retorne apenas o texto do título, sem formatação extra ou explicação. Questão: "${questionText}"`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            maxOutputTokens: 50, 
            temperature: 0.2, 
        },
    });

    return (response.text || '').trim();
};