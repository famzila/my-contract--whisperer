import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { Card } from '../../../../shared/components/card/card';
import { Scale } from '../../../../shared/icons/lucide-icons';

@Component({
  selector: 'app-disclaimer-tab',
  imports: [TranslateModule, LucideAngularModule, Card],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-card>
      <div class="p-8 bg-gray-50">
        <h2 class="text-2xl font-bold text-gray-700 mb-6 flex items-center gap-3">
          <lucide-icon [name]="ScaleIcon" class="w-8 h-8 text-gray-600"></lucide-icon>
          {{ 'analysis.disclaimer.title' | translate }}
        </h2>
        <p class="text-gray-600 leading-relaxed text-lg">{{ 'analysis.disclaimer.text' | translate }}</p>
      </div>
    </app-card>
  `
})
export class DisclaimerTabComponent {
  // Icons
  ScaleIcon = Scale;
}
