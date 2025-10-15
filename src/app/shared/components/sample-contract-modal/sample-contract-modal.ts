import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from '@ngx-translate/core';
import { DialogRef } from '@angular/cdk/dialog';
import { BaseModal, BaseModalConfig } from '../base-modal/base-modal';
import { FileText, Lightbulb, Download } from '../../icons/lucide-icons';

@Component({
  selector: 'app-sample-contract-modal',
  imports: [CommonModule, LucideAngularModule, TranslatePipe, BaseModal],
  templateUrl: './sample-contract-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SampleContractModal {
  private dialogRef = inject(DialogRef);

  // Icons for content
  readonly FileTextIcon = FileText;
  readonly LightbulbIcon = Lightbulb;
  readonly DownloadIcon = Download;

  // Base modal configuration
  readonly modalConfig: BaseModalConfig = {
    titleKey: 'sampleContract.title',
    icon: this.FileTextIcon
  };

  onClose(): void {
    this.dialogRef.close();
  }
}
