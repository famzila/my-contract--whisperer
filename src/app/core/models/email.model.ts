
/**
 * Email drafting context
 */
export interface EmailContext {
    questions: string[];
    recipientName: string;
    senderName: string;
    senderRole: string;
    recipientRole: string;
    contractLanguage: string;
  }
  
  /**
   * Email rewriting options
   */
  export interface RewriteOptions {
    tone: 'formal' | 'neutral' | 'casual';
    length: 'short' | 'medium' | 'long';
  }
  
  /**
   * Email service result
   */
  export interface EmailResult {
    content: string;
    language: string;
    error?: string;
  }