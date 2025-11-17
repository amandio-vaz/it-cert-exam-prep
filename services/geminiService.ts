import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import { UploadedFile, ExamData, Question, UserAnswer, Attempt, QuestionType } from '../types';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  // This is a placeholder for environments where process.env is not defined.
  // In a real build process, this should be handled properly.
  console.warn("API_KEY environment variable not found.");
}
const ai = new GoogleGenAI({ apiKey: API_KEY });

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
            config: {
                maxOutputTokens: 1536,
                thinkingConfig: { thinkingBudget: 512 },
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
        // pt-BR: Define um limite de tokens dinâmico baseado no número de questões (600 por questão), otimizando custos.
        maxOutputTokens: questionCount * 600,
        thinkingConfig: { thinkingBudget: questionCount * 200 },
    };

    const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config
    });

    let jsonText = (response.text || '').trim();
    
    // Tenta extrair o JSON de um bloco de código markdown, se existir.
    const markdownJsonRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = jsonText.match(markdownJsonRegex);

    if (match && match[1]) {
        jsonText = match[1];
    }

    try {
        const parsedJson = JSON.parse(jsonText);
        return parsedJson as ExamData;
    } catch (error) {
        console.error("Failed to parse JSON response:", jsonText);
        throw new Error("A resposta da IA não estava em um formato JSON válido, mesmo após a tentativa de extração.");
    }
};


export const generateStudyPlan = async (examData: ExamData, userAnswers: UserAnswer, attempt: Attempt): Promise<string> => {
    const incorrectQuestions = examData.questions.filter(q => {
        const correct = q.correctAnswers;
        const user = userAnswers[q.id] || [];
        return !(correct.length === user.length && correct.every(val => user.includes(val)));
    });

    const prompt = `
    Com base no meu desempenho neste exame simulado, crie um plano de estudos detalhado e acionável.

    **Exame:** ${examData.examName} (${examData.examCode})
    **Pontuação:** ${attempt.score.toFixed(2)}% (${attempt.correctAnswers}/${attempt.totalQuestions} corretas)

    **Questões que errei:**
    ${incorrectQuestions.map(q => `- **Domínio: ${q.domain}** - Pergunta: "${q.text}"`).join('\n')}

    **Sua tarefa:**
    1.  **Análise de Desempenho:** Identifique meus pontos fracos com base nos domínios das questões que errei.
    2.  **Plano de Estudos Estruturado:** Crie um plano de estudos priorizado. Sugira uma ordem de estudo, focando primeiro nas áreas mais fracas.
    3.  **Recomendações Acionáveis:** Para cada área fraca, forneça recomendações específicas, como:
        - "Crie flashcards para estes 10 conceitos chave."
        - "Leia e teste todos os comandos na seção 'X' da documentação oficial."
        - "Faça outro simulado de 20 questões focando apenas em segurança."
    4.  **Mapeamento de Recursos:** Se possível, relacione os tópicos a serem revisados com fontes de documentação oficial (use o Google Search para encontrar links relevantes).

    Seja claro, profissional e motivador. Use marcações (markdown) para formatar a resposta de forma organizada.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { 
            tools: [{ googleSearch: {} }],
            // pt-BR: Limita o tamanho do plano de estudos para garantir que seja detalhado, mas conciso.
            maxOutputTokens: 3072,
            thinkingConfig: { thinkingBudget: 1024 },
        },
    });
    
    return response.text || '';
};

export const generateSpeech = async (text: string): Promise<string> => {
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
        // pt-BR: Limita a resposta da análise de imagem para manter a concisão e controlar custos.
        config: {
            maxOutputTokens: 2048,
            thinkingConfig: { thinkingBudget: 1024 },
        },
    });

    return response.text || '';
};

export const generateQuestionTitle = async (questionText: string): Promise<string> => {
    const prompt = `Gere um título curto e conciso (máximo 5 palavras) que resuma a seguinte questão de certificação de TI. O título deve capturar o conceito principal testado. Retorne apenas o texto do título, sem formatação extra ou explicação. Questão: "${questionText}"`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            maxOutputTokens: 50, // Limite baixo para uma resposta rápida e curta
            temperature: 0.2, // Baixa temperatura para um título mais focado e menos criativo
        },
    });

    return (response.text || '').trim();
};