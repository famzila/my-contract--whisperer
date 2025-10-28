import { Component, input, output, ChangeDetectionStrategy, computed } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { SkeletonLoader } from '../../../../shared/components/skeleton-loader';
import { Button } from '../../../../shared/components/button/button';
import { 
  Info, 
  Copy, 
  Check, 
  Mail,
  CircleQuestionMark,
  Sparkles
} from '../../../../shared/icons/lucide-icons';
import { Notice } from "../../../../shared/components/notice/notice";
import { TabHeader } from "../../../../shared/components/tab-header/tab-header";

@Component({
  selector: 'app-questions-tab',
  imports: [TranslateModule, LucideAngularModule, SkeletonLoader, Button, TabHeader, Notice],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './questions-tab.component.html'
})
export class QuestionsTabComponent {
  questions = input<string[]>([]);
  isLoading = input<boolean>(false);
  retryCount = input<number>(0);
  isRetrying = input<boolean>(false);
  isContractProvider = input<boolean>(false);
  isDrafting = input<boolean>(false);
  copyAllButtonState = input<'copy' | 'copied'>('copy');

  copyQuestion = output<string>();
  copyAllQuestions = output<void>();
  draftEmail = output<void>();

  /**
   * Clean questions by removing leading numbers
   * This prevents double numbering when AI adds numbers and UI also adds them
   */
  cleanedQuestions = computed(() => {
    const rawQuestions = this.questions();
    return rawQuestions.map(question => this.stripLeadingNumber(question));
  });
  
  // Icons
  InfoIcon = Info;
  CopyIcon = Copy;
  CheckIcon = Check;
  MailIcon = Mail;
  HelpCircleIcon = CircleQuestionMark;
  SparklesIcon = Sparkles;
  
  /**
   * Strip leading number from question text
   * Removes patterns like "1.", "2.", "3.", etc.
   */
  private stripLeadingNumber(question: string): string {
    if (!question) return question;
    
    // Remove leading number followed by period and optional space
    // Matches patterns like "1.", "2. ", "10.", "10. ", etc.
    return question.replace(/^\d+\.\s*/, '').trim();
  }
}

