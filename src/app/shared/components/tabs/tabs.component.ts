import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { LoadingSpinner } from '../loading-spinner/loading-spinner';

export interface TabConfig {
  id: string;
  label: string;
  icon: any;
  isLoading?: boolean;
  badge?: string | number;
  disabled?: boolean;
}

@Component({
  selector: 'app-tabs',
  imports: [LucideAngularModule, LoadingSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tabs.component.html'
})
export class TabsComponent {
  // Modern input signals
  tabs = input<TabConfig[]>([]);
  activeTab = input<string>('');

  // Modern output signals
  tabSelected = output<string>();

  // Computed for better performance
  private readonly baseClasses = 'inline-flex items-center justify-center p-4 border-b-2 rounded-t-lg transition-colors duration-200';
  private readonly activeClasses = 'text-purple-600 border-purple-600 hover:text-purple-600';
  private readonly inactiveClasses = 'text-gray-500 border-gray-100 hover:text-gray-600 hover:border-gray-300';
  private readonly disabledClasses = 'text-gray-400 border-gray-100 cursor-not-allowed';

  selectTab(tabId: string): void {
    this.tabSelected.emit(tabId);
  }

  getTabClasses(tab: TabConfig): string {
    if (tab.disabled) {
      return `${this.baseClasses} ${this.disabledClasses}`;
    }
    
    const stateClasses = tab.id === this.activeTab() ? this.activeClasses : this.inactiveClasses;
    return `${this.baseClasses} ${stateClasses}`;
  }
}
