import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LucideAngularModule, Sparkles } from 'lucide-angular';
import { TranslatePipe } from '@ngx-translate/core';
import { DialogRef } from '@angular/cdk/dialog';
import { BaseModal, BaseModalConfig } from '../base-modal/base-modal';
import { CircleQuestionMark, Upload, FileText, Bot, Shield, CircleCheckBig } from '../../icons/lucide-icons';
import { Notice } from '../notice/notice';

@Component({
  selector: 'app-how-it-works-modal',
  imports: [LucideAngularModule, TranslatePipe, BaseModal, Notice],
  templateUrl: './how-it-works-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HowItWorksModal {
  private dialogRef = inject(DialogRef);

  // Icons for content
  readonly HelpCircleIcon = CircleQuestionMark;
  readonly UploadIcon = Upload;
  readonly FileTextIcon = FileText;
  readonly BotIcon = Bot;
  readonly ShieldIcon = Shield;
  readonly CheckCircleIcon = CircleCheckBig;
  readonly SparklesIcon = Sparkles;

  // Base modal configuration
  readonly modalConfig: BaseModalConfig = {
    titleKey: 'howItWorks.title',
    icon: this.HelpCircleIcon
  };

  onClose(): void {
    this.dialogRef.close();
  }
}
