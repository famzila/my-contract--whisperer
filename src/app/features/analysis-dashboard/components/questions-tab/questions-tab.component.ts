import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { Card } from '../../../../shared/components/card/card';
import { SkeletonLoader } from '../../../../shared/components/skeleton-loader';
import { Button } from '../../../../shared/components/button/button';
import { 
  Info, 
  Copy, 
  Check, 
  Mail,
  HelpCircle,
  Sparkles
} from '../../../../shared/icons/lucide-icons';
import { Alert } from "../../../../shared/components/alert/alert";
import { TabHeader } from "../../../../shared/components/tab-header/tab-header";
import { Notice } from "../../../../shared/components/notice/notice";

@Component({
  selector: 'app-questions-tab',
  imports: [TranslateModule, LucideAngularModule, Card, SkeletonLoader, Button, Alert, TabHeader, Notice],
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
  HelpCircleIcon = HelpCircle;
  SparklesIcon = Sparkles;
}

