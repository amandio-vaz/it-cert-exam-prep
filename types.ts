

export enum QuestionType {
  SingleChoice = "Single Choice",
  MultipleChoice = "Multiple Choice",
  Scenario = "Scenario",
  DragAndDrop = "Drag and Drop",
  TrueFalse = "True/False",
}

export interface AnswerOption {
  id: string; // e.g., 'A', 'B'
  text: string;
}

export interface Question {
  id: string; // e.g., 'Q1'
  type: QuestionType;
  text: string;
  options: AnswerOption[];
  correctAnswers: string[]; // array of option ids
  explanation: string;
  domain: string;
  scenario?: string; // For scenario-based questions
}

export interface ExamData {
  examCode: string;
  examName: string;
  questions: Question[];
}

export interface UserAnswer {
  [questionId: string]: string[]; // Store selected option ids
}

export interface Attempt {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timestamp: number;
}

export interface UploadedFile {
    name: string;
    type: string;
    content: string; // base64 encoded content
}

export interface Flashcard {
    question: string;
    answer: string;
}

export interface User {
    id: string;
    email: string;
}

export type AppState = 'login' | 'config' | 'generating' | 'taking_exam' | 'results' | 'analyzing_image' | 'generating_study_plan' | 'study_plan' | 'reviewing_exam' | 'viewing_flashcards';