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
      fileType: 'DOCX',
      bgColor: 'bg-red-100',
      hoverBgColor: 'bg-red-200',
      iconColor: 'text-red-600'
    },
    {
      id: 'freelance',
      href: '/samples/freelance-contract.pdf',
      download: 'freelance-contract.pdf',
      titleKey: 'sampleContract.freelanceContract',
      descriptionKey: 'sampleContract.freelanceDescription',
      fileType: 'PDF',
      bgColor: 'bg-blue-100',
      hoverBgColor: 'bg-blue-200',
      iconColor: 'text-blue-600'
    },
    {
      id: 'lease',
      href: '/samples/residential-lease-contract.docx',
      download: 'residential-lease-contract.docx',
      titleKey: 'sampleContract.leaseContract',
      descriptionKey: 'sampleContract.leaseDescription',
      fileType: 'DOCX',
      bgColor: 'bg-green-100',
      hoverBgColor: 'bg-green-200',
      iconColor: 'text-green-600'
    },
    {
      id: 'arabic',
      href: '/samples/arabic-contract.docx',
      download: 'arabic-contract.docx',
      titleKey: 'sampleContract.arabicContract',
      descriptionKey: 'sampleContract.arabicDescription',
      fileType: 'DOCX',
      bgColor: 'bg-purple-100',
      hoverBgColor: 'bg-purple-200',
      iconColor: 'text-purple-600'
    }
  ]);

  onClose(): void {
    this.dialogRef.close();
  }
}
