import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { LucideAngularModule, LucideIconData } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { LoadingSpinner } from '../loading-spinner/loading-spinner';

export interface TabConfig {
  id: string;
  label?: string;
  labelKey?: string; // Translation key for reactive translation
  icon: LucideIconData;
  isLoading?: boolean;
  badge?: string | number;
  disabled?: boolean;
}

@Component({
  selector: 'app-tabs',
  imports: [LucideAngularModule, TranslateModule, LoadingSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tabs.component.html'
})
export class TabsComponent {
  // Modern input signals
  tabs = input<TabConfig[]>([]);
  activeTab = input<string>('');

  // Modern output signals
  tabSelected = output<string>();

  // Computed for better performance - using component classes
  private readonly baseClasses = 'tabs-button';
  private readonly activeClasses = 'tabs-button-active';
  private readonly inactiveClasses = 'tabs-button-inactive';
  private readonly disabledClasses = 'tabs-button-disabled';

  selectTab(tabId: string, event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    this.tabSelected.emit(tabId);
  }

  getTabClasses(tab: TabConfig): string {
    if (tab.disabled) {
      return `${this.baseClasses} ${this.disabledClasses}`;
    }
    
    const stateClasses = tab.id === this.activeTab() ? this.activeClasses : this.inactiveClasses;
    return `${this.baseClasses} ${stateClasses}`;
  }

  getIconClasses(tab: TabConfig): string {
    const baseClasses = 'w-4 h-4 mr-2';
    
    if (tab.disabled) {
      return `${baseClasses} text-gray-400 dark:text-gray-500`;
    }
    
    const isActive = tab.id === this.activeTab();
    if (isActive) {
      return `${baseClasses} text-purple-600 dark:text-purple-400`;
    }
    
    return `${baseClasses} text-gray-400 dark:text-gray-500`;
  }

  getBadgeClasses(tab: TabConfig): string {
    if (tab.disabled) {
      return 'tabs-badge tabs-badge-disabled';
    }
    
    const isActive = tab.id === this.activeTab();
    if (isActive) {
      return 'tabs-badge tabs-badge-active';
    }
    
    return 'tabs-badge tabs-badge-inactive';
  }
}
