import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { TabHeader } from "../../../../shared/components/tab-header/tab-header";
import { Scale } from '../../../../shared/icons/lucide-icons';

@Component({
  selector: 'app-disclaimer-tab',
  imports: [TranslateModule, LucideAngularModule, TabHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-tab-header 
      [title]="'analysis.disclaimer.title' | translate"
      [subtitle]="'analysis.disclaimer.subtitle' | translate"
      [icon]="ScaleIcon"
      iconBgClass="bg-gray-100"
      iconColorClass="text-gray-600">
    </app-tab-header>

    <p class="text-gray-600 leading-relaxed text-lg">
      {{ 'analysis.disclaimer.text' | translate }}
    </p>
  `,
})
export class DisclaimerTabComponent {
  // Icons
  ScaleIcon = Scale;
}
