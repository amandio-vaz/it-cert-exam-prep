
import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import { UploadedFile, ExamData, Question, UserAnswer, Attempt, QuestionType } from '../types';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  // This is a placeholder for environments where process.env is not defined.
  // In a real build process, this should be handled properly.
  console.warn("API_KEY environment variable not found.");
}
const ai = new GoogleGenAI({ apiKey: API_KEY });

const getSystemPrompt = (examCode: string) => `
Você é um especialista avançado em preparação para exames de certificação de TI. Seu objetivo principal é ajudar os usuários a se prepararem de forma ética e eficaz, sem trapacear ou acessar perguntas reais do exame.

1. Identificação do Exame:
   - Com base no código do exame fornecido ('${examCode}'), identifique o nome oficial completo da certificação.

2. Análise de Conteúdo:
   - Analise profundamente o conteúdo fornecido pelo usuário (arquivos e URLs).
   - Use o Google Search para complementar e validar as informações, garantindo que estejam alinhadas com os objetivos atuais do exame.
   - NÃO reproduza perguntas proprietárias de bancos de exames. Crie perguntas ORIGINAIS inspiradas nos tópicos do exame.

3. Geração de Exame Prático:
   - Gere um conjunto de questões realistas com base na análise.
   - A resposta DEVE ser um objeto JSON bem formado que corresponda ao esquema fornecido.
   - Inclua diversos tipos de questões (escolha única, múltipla escolha, etc.).
   - Para cada questão, forneça o texto da pergunta, opções, a(s) resposta(s) correta(s), uma explicação detalhada (porque a correta está certa e as erradas estão erradas) e o domínio/objetivo do exame correspondente.
`;

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


export const generateExam = async (files: UploadedFile[], urls: string[], examCode: string, questionCount: number, useThinkingMode: boolean): Promise<ExamData> => {
    const modelName = useThinkingMode ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
    const systemInstruction = getSystemPrompt(examCode);

    const fileParts = files.map(file => ({
        inlineData: {
            mimeType: file.type,
            data: file.content,
        },
    }));

    const urlText = urls.length > 0 ? `\n\nURLs de referência:\n${urls.join('\n')}` : '';
    const userPrompt = `Gere um exame prático de ${questionCount} questões para o exame ${examCode}. Baseie-se nos arquivos e URLs fornecidos.${urlText}`;
    
    const contents = [{
        role: "user",
        parts: [
            ...fileParts,
            { text: userPrompt }
        ]
    }];

    const config = {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: examSchema,
        ...(useThinkingMode && { thinkingConfig: { thinkingBudget: 32768 } }),
    };

    const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config
    });

    const jsonText = response.text.trim();
    try {
        const parsedJson = JSON.parse(jsonText);
        return parsedJson as ExamData;
    } catch (error) {
        console.error("Failed to parse JSON response:", jsonText);
        throw new Error("A resposta da IA não estava em um formato JSON válido.");
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
        config: { tools: [{ googleSearch: {} }] },
    });
    
    return response.text;
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
    });

    return response.text;
};
