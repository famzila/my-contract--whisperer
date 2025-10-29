import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from '@ngx-translate/core';
import { DialogRef } from '@angular/cdk/dialog';
import { BaseModal, BaseModalConfig } from '../base-modal/base-modal';
import { CircleQuestionMark } from '../../icons/lucide-icons';
import { Notice } from '../notice/notice';

@Component({
  selector: 'app-faq-modal',
  imports: [LucideAngularModule, TranslatePipe, BaseModal, Notice],
  templateUrl: './faq-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaqModal {
  private dialogRef = inject(DialogRef);

  // Icons for content
  readonly HelpCircleIcon = CircleQuestionMark;

  // Base modal configuration
  readonly modalConfig: BaseModalConfig = {
    titleKey: 'faq.title',
    icon: this.HelpCircleIcon
  };

  onClose(): void {
    this.dialogRef.close();
  }
}

