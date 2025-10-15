import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { Card } from '../../../../shared/components/card/card';
import { SkeletonLoader } from '../../../../shared/components/skeleton-loader';
import { Button } from '../../../../shared/components/button/button';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import { 
  Info, 
  Copy, 
  Check, 
  Mail 
} from '../../../../shared/icons/lucide-icons';

@Component({
  selector: 'app-questions-tab',
  imports: [TranslateModule, LucideAngularModule, Card, SkeletonLoader, Button, LoadingSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './questions-tab.component.html'
})
export class QuestionsTabComponent {
  // Modern input signals
  questions = input<string[]>([]);
  isLoading = input<boolean>(false);
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
}

