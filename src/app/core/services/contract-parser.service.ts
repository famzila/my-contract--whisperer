import { Injectable } from '@angular/core';

/**
 * Contract file types supported
 */
export type ContractFileType = 'text/plain' | 'application/pdf' | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/**
 * Parsed contract result
 */
export interface ParsedContract {
  text: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  parsedAt: Date;
}

/**
 * Service for parsing contract files and extracting text
 * Supports: TXT, PDF (basic), DOCX (future), and direct text input
 */
@Injectable({
  providedIn: 'root',
})
export class ContractParserService {
  
  /**
   * Parse a file and extract contract text
   */
  async parseFile(file: File): Promise<ParsedContract> {
    this.validateFile(file);

    const text = await this.extractText(file);

    return {
      text: text.trim(),
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      parsedAt: new Date(),
    };
  }

  /**
   * Parse text input directly
   */
  parseText(text: string, source: string = 'manual-input'): ParsedContract {
    if (!text || text.trim().length === 0) {
      throw new Error('Contract text cannot be empty');
    }

    if (text.length < 100) {
      throw new Error('Contract text is too short (minimum 100 characters)');
    }

    return {
      text: text.trim(),
      fileName: source,
      fileSize: new Blob([text]).size,
      fileType: 'text/plain',
      parsedAt: new Date(),
    };
  }

  /**
   * Validate file before parsing
   */
  private validateFile(file: File): void {
    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('File size exceeds 5MB limit');
    }

    // Check file type
    const supportedTypes: ContractFileType[] = [
      'text/plain',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!supportedTypes.includes(file.type as ContractFileType)) {
      throw new Error(`Unsupported file type: ${file.type}. Supported types: TXT, PDF, DOCX`);
    }

    // Check if file is empty
    if (file.size === 0) {
      throw new Error('File is empty');
    }
  }

  /**
   * Extract text from file based on type
   */
  private async extractText(file: File): Promise<string> {
    switch (file.type) {
      case 'text/plain':
        return await this.extractTextFromTxt(file);
      
      case 'application/pdf':
        return await this.extractTextFromPdf(file);
      
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return await this.extractTextFromDocx(file);
      
      default:
        throw new Error(`Unsupported file type: ${file.type}`);
    }
  }

  /**
   * Extract text from TXT file
   */
  private async extractTextFromTxt(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (!text || text.trim().length === 0) {
          reject(new Error('File is empty or unreadable'));
          return;
        }
        resolve(text);
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Extract text from PDF file
   * Note: Basic implementation - for MVP, user can copy/paste text
   * Future: Integrate pdf.js library for better PDF parsing
   */
  private async extractTextFromPdf(file: File): Promise<string> {
    // For MVP Phase 1, we'll return a helpful message
    // In Phase 2, we can integrate pdf.js or similar library
    throw new Error(
      'PDF parsing will be available in a future update. ' +
      'For now, please copy the contract text and paste it directly.'
    );
  }

  /**
   * Extract text from DOCX file
   * Note: Basic implementation - for MVP, user can copy/paste text
   * Future: Integrate mammoth.js or similar library
   */
  private async extractTextFromDocx(file: File): Promise<string> {
    // For MVP Phase 1, we'll return a helpful message
    // In Phase 2, we can integrate mammoth.js or similar library
    throw new Error(
      'DOCX parsing will be available in a future update. ' +
      'For now, please copy the contract text and paste it directly.'
    );
  }

  /**
   * Validate contract text length
   */
  validateTextLength(text: string): { valid: boolean; message?: string } {
    const minLength = 100;
    const maxLength = 50000; // ~50KB of text

    if (text.length < minLength) {
      return {
        valid: false,
        message: `Contract text is too short. Minimum ${minLength} characters required.`,
      };
    }

    if (text.length > maxLength) {
      return {
        valid: false,
        message: `Contract text is too long. Maximum ${maxLength} characters allowed.`,
      };
    }

    return { valid: true };
  }

  /**
   * Estimate reading time for contract
   */
  estimateReadingTime(text: string): number {
    const wordsPerMinute = 200;
    const words = text.split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
  }

  /**
   * Get word count
   */
  getWordCount(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }
}



