/**
 * Non-Contract Error Component
 * Shows friendly message when uploaded document is not a contract
 */
import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { 
  Mail, 
  FileText, 
  BookOpen, 
  ChefHat, 
  Book, 
  Newspaper, 
  File, 
  HelpCircle,
  Briefcase,
  Home,
  Handshake,
  Clipboard,
  Lightbulb,
  ArrowLeft
} from '../../icons/lucide-icons';

@Component({
  selector: 'app-non-contract-error',
  imports: [CommonModule, TranslateModule, LucideAngularModule],
  templateUrl: './non-contract-error.html',
  styleUrl: './non-contract-error.css',
})
export class NonContractError {
  // Inputs
  documentType = input<string>('other');
  reason = input<string | undefined>();
  
  // Outputs
  tryAgain = output<void>();

  // Lucide icons
  readonly MailIcon = Mail;
  readonly FileTextIcon = FileText;
  readonly BookOpenIcon = BookOpen;
  readonly ChefHatIcon = ChefHat;
  readonly BookIcon = Book;
  readonly NewspaperIcon = Newspaper;
  readonly FileIcon = File;
  readonly HelpCircleIcon = HelpCircle;
  readonly BriefcaseIcon = Briefcase;
  readonly HomeIcon = Home;
  readonly HandshakeIcon = Handshake;
  readonly ClipboardIcon = Clipboard;
  readonly LightbulbIcon = Lightbulb;
  readonly ArrowLeftIcon = ArrowLeft;
  
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
   * Get icon for document type
   */
  get documentIcon(): any {
    const iconMap: Record<string, any> = {
      'email_or_letter': this.MailIcon,
      'academic_paper': this.FileTextIcon,
      'story_or_book': this.BookOpenIcon,
      'recipe': this.ChefHatIcon,
      'instructions_or_tutorial': this.BookIcon,
      'article': this.NewspaperIcon,
      'other': this.FileIcon,
    };
    
    return iconMap[this.documentType()] || this.FileIcon;
  }
  
  /**
   * Emit try again event
   */
  onTryAgain(): void {
    this.tryAgain.emit();
  }
}
