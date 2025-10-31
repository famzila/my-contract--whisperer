import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import * as mammoth from 'mammoth';
import { ContractFileType, ParsedContract } from '../models/contract.model';
import { CONTRACT_CONFIG } from '../config/application.config';

/**
 * Service for parsing contract files and extracting text
 * Supports: TXT, PDF (basic), DOCX (future), and direct text input
 */
@Injectable({
  providedIn: 'root',
})
export class ContractParserService {
  private translate = inject(TranslateService);
  
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
      throw new Error(this.translate.instant('errors.contractTextEmpty'));
    }

    if (text.length < CONTRACT_CONFIG.MIN_TEXT_LENGTH) {
      throw new Error(this.translate.instant('errors.contractTextTooShort'));
    }

    // Check maximum length
    if (text.length > CONTRACT_CONFIG.MAX_TEXT_LENGTH) {
      throw new Error(this.translate.instant('errors.contractTextTooLong'));
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
    // Check file size
    if (file.size > CONTRACT_CONFIG.MAX_FILE_SIZE) {
      throw new Error(this.translate.instant('errors.fileSizeExceeded'));
    }

    // Check file type
    const supportedTypes: ContractFileType[] = [
      'text/plain',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!supportedTypes.includes(file.type as ContractFileType)) {
      throw new Error(this.translate.instant('errors.unsupportedFileType', { type: file.type }));
    }

    // Check if file is empty
    if (file.size === 0) {
      throw new Error(this.translate.instant('errors.fileEmpty'));
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
        throw new Error(this.translate.instant('errors.unsupportedFileType', { type: file.type }));
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
   * Extract text from PDF file using pdf.js
   */
  private async extractTextFromPdf(file: File): Promise<string> {
    try {
      // Dynamically import pdf.js to avoid bundle bloat
      const pdfjsLib = await import('pdfjs-dist');
      
      // Configure worker
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
      
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Load PDF document
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      // Extract text from all pages
      const textPromises: Promise<string>[] = [];
      
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        textPromises.push(
          pdf.getPage(pageNum).then(async (page) => {
            const textContent = await page.getTextContent();
            return textContent.items
              .filter((item): item is any => 'str' in item)
              .map(item => item.str)
              .join(' ');
          })
        );
      }
      
      const pageTexts = await Promise.all(textPromises);
      const fullText = pageTexts.join('\n\n');
      
      if (!fullText || fullText.trim().length === 0) {
        throw new Error(this.translate.instant('errors.pdfEmpty'));
      }
      
      return fullText;
    } catch (error) {
      console.error('PDF parsing error:', error);
      throw new Error(
        this.translate.instant('errors.pdfParsingFailed', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      );
    }
  }

  /**
   * Extract text from DOCX file using mammoth.js
   */
  private async extractTextFromDocx(file: File): Promise<string> {
    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Extract text from DOCX using correct mammoth API
      const result = await mammoth.extractRawText({ arrayBuffer });
      
      if (!result.value || result.value.trim().length === 0) {
        throw new Error(this.translate.instant('errors.docxEmpty'));
      }
      
      // Log any messages from mammoth (warnings, etc.)
      if (result.messages.length > 0) {
        console.warn('DOCX parsing messages:', result.messages);
      }
      
      return result.value;
    } catch (error) {
      console.error('DOCX parsing error:', error);
      throw new Error(
        this.translate.instant('errors.docxParsingFailed', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      );
    }
  }

  /**
   * Validate contract text length
   */
  validateTextLength(text: string): { valid: boolean; message?: string } {
    if (text.length < CONTRACT_CONFIG.MIN_TEXT_LENGTH) {
      return {
        valid: false,
        message: this.translate.instant('errors.contractTextTooShort'),
      };
    }

    if (text.length > CONTRACT_CONFIG.MAX_TEXT_LENGTH) {
      return {
        valid: false,
        message: this.translate.instant('errors.contractTextTooLong'),
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



