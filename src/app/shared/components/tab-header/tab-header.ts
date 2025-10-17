import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-tab-header',
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-6">
      <div class="flex items-start gap-4">
        <div class="flex items-center justify-center w-14 h-14 rounded-lg" [class]="iconBgClass()">
          <lucide-icon [name]="icon()" class="w-6 h-6" [class]="iconColorClass()"></lucide-icon>
        </div>
        <div class="flex-1">
          <h2 class="text-2xl font-bold text-gray-700 mb-1">
            {{ title() }}
          </h2>
          @if (subtitle()) {
            <p class="text-gray-600 text-sm">{{ subtitle() }}</p>
          }
        </div>
      </div>
    </div>
  `
})
export class TabHeader {
  // Inputs
  title = input.required<string>();
  subtitle = input<string | null>(null);
  icon = input.required<any>();
  iconBgClass = input.required<string>();
  iconColorClass = input.required<string>();
}

