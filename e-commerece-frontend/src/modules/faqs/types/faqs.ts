// Matches the backend's admin FAQ responses exactly.
export interface AdminFaq {
  id: string;
  question: string;
  // Simple HTML written in the editor
  answer: string;
  sortOrder: number;
  isActive: boolean;
}

export interface FaqInput {
  question?: string;
  answer?: string;
  isActive?: boolean;
}
