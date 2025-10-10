import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from '@ngx-translate/core';
import { X, HelpCircle, Upload, FileText, Bot, Shield, CheckCircle } from '../../icons/lucide-icons';

@Component({
  selector: 'app-how-it-works-modal',
  imports: [CommonModule, LucideAngularModule, TranslatePipe],
  templateUrl: './how-it-works-modal.html',
  styleUrl: './how-it-works-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HowItWorksModal {
  isOpen = input<boolean>(false);
  close = output<void>();

  readonly XIcon = X;
  readonly HelpCircleIcon = HelpCircle;
  readonly UploadIcon = Upload;
  readonly FileTextIcon = FileText;
  readonly BotIcon = Bot;
  readonly ShieldIcon = Shield;
  readonly CheckCircleIcon = CheckCircle;

  onClose(): void {
    this.close.emit();
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }
}
