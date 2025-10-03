/**
 * Non-Contract Error Component
 * Shows friendly message when uploaded document is not a contract
 */
import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-non-contract-error',
  imports: [CommonModule],
  templateUrl: './non-contract-error.html',
  styleUrl: './non-contract-error.css',
})
export class NonContractError {
  // Inputs
  documentType = input<string>('other');
  reason = input<string | undefined>();
  
  // Outputs
  tryAgain = output<void>();
  
  /**
   * Get friendly document type name
   */
  get friendlyDocumentType(): string {
    const typeMap: Record<string, string> = {
      'email_or_letter': 'Email or Letter',
      'academic_paper': 'Academic Paper or Essay',
      'story_or_book': 'Story or Book Chapter',
      'recipe': 'Recipe',
      'instructions_or_tutorial': 'Instructions or Tutorial',
      'article': 'Article or Blog Post',
      'other': 'Document',
    };
    
    return typeMap[this.documentType()] || 'Document';
  }
  
  /**
   * Get emoji for document type
   */
  get documentEmoji(): string {
    const emojiMap: Record<string, string> = {
      'email_or_letter': '📧',
      'academic_paper': '📝',
      'story_or_book': '📚',
      'recipe': '🍳',
      'instructions_or_tutorial': '📖',
      'article': '📰',
      'other': '📄',
    };
    
    return emojiMap[this.documentType()] || '📄';
  }
  
  /**
   * Emit try again event
   */
  onTryAgain(): void {
    this.tryAgain.emit();
  }
}
