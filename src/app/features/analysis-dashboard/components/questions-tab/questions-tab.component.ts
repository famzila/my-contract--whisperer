import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
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
  // Modern input signals
  questions = input<string[]>([]);
  isLoading = input<boolean>(false);
  retryCount = input<number>(0);
  isRetrying = input<boolean>(false);
  isContractProvider = input<boolean>(false);
  isDrafting = input<boolean>(false);
  copyAllButtonState = input<'copy' | 'copied'>('copy');

  // Modern output signals
  copyQuestion = output<string>();
  copyAllQuestions = output<void>();
  draftEmail = output<void>();

  // Icons
  InfoIcon = Info;
  CopyIcon = Copy;
  CheckIcon = Check;
  MailIcon = Mail;
  HelpCircleIcon = CircleQuestionMark;
  SparklesIcon = Sparkles;
}

