import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { X, FileText, Lightbulb } from '../../icons/lucide-icons';

@Component({
  selector: 'app-sample-contract-modal',
  imports: [CommonModule, LucideAngularModule, TranslateModule],
  templateUrl: './sample-contract-modal.html',
  styleUrl: './sample-contract-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SampleContractModal {
  isOpen = input<boolean>(false);
  close = output<void>();

  readonly XIcon = X;
  readonly FileTextIcon = FileText;
  readonly LightbulbIcon = Lightbulb;

  onClose(): void {
    this.close.emit();
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }
}
