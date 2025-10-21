import { ChangeDetectionStrategy, Component, inject, computed } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from '@ngx-translate/core';
import { DialogRef } from '@angular/cdk/dialog';
import { BaseModal, BaseModalConfig } from '../base-modal/base-modal';
import { FileText, Lightbulb, Download } from '../../icons/lucide-icons';
import { Notice } from '../notice/notice';

interface SampleContract {
  id: string;
  href: string;
  download: string;
  titleKey: string;
  descriptionKey: string;
  fileType: string;
  bgColor: string;
  hoverBgColor: string;
  iconColor: string;
}

@Component({
  selector: 'app-sample-contract-modal',
  imports: [NgTemplateOutlet, LucideAngularModule, TranslatePipe, BaseModal, Notice],
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

  // Sample contracts data
  readonly sampleContracts = computed<SampleContract[]>(() => [
    {
      id: 'nda',
      href: '/samples/nda-contract.docx',
      download: 'nda-contract.docx',
      titleKey: 'sampleContract.ndaContract',
      descriptionKey: 'sampleContract.ndaDescription',
      fileType: 'common.fileTypes.docx',
      bgColor: 'bg-red-100 dark:bg-red-900',
      hoverBgColor: 'bg-red-200 dark:bg-red-800',
      iconColor: 'text-red-600 dark:text-red-400'
    },
    {
      id: 'freelance',
      href: '/samples/freelance-contract.pdf',
      download: 'freelance-contract.pdf',
      titleKey: 'sampleContract.freelanceContract',
      descriptionKey: 'sampleContract.freelanceDescription',
      fileType: 'common.fileTypes.pdf',
      bgColor: 'bg-blue-100 dark:bg-blue-900',
      hoverBgColor: 'bg-blue-200 dark:bg-blue-800',
      iconColor: 'text-blue-600 dark:text-blue-400'
    },
    {
      id: 'lease',
      href: '/samples/residential-lease-contract.docx',
      download: 'residential-lease-contract.docx',
      titleKey: 'sampleContract.leaseContract',
      descriptionKey: 'sampleContract.leaseDescription',
      fileType: 'common.fileTypes.docx',
      bgColor: 'bg-green-100 dark:bg-green-900',
      hoverBgColor: 'bg-green-200 dark:bg-green-800',
      iconColor: 'text-green-600 dark:text-green-400'
    },
    {
      id: 'arabic',
      href: '/samples/arabic-contract.docx',
      download: 'arabic-contract.docx',
      titleKey: 'sampleContract.arabicContract',
      descriptionKey: 'sampleContract.arabicDescription',
      fileType: 'common.fileTypes.docx',
      bgColor: 'bg-purple-100 dark:bg-purple-900',
      hoverBgColor: 'bg-purple-200 dark:bg-purple-800',
      iconColor: 'text-purple-600 dark:text-purple-400'
    }
  ]);

  onClose(): void {
    this.dialogRef.close();
  }
}
