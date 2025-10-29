import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OfflineStorageService, OfflineContract } from '../../core/services/storage/offline-storage.service';
import { OfflineDetectionService } from '../../core/services/offline-detection.service';
import { ContractAnalysis } from '../../core/models/contract.model';
import { 
  LucideAngularModule,
} from 'lucide-angular';
import { 
  FileText, 
  Calendar, 
  Users, 
  Trash2, 
  Eye, 
  Wifi, 
  WifiOff, 
  Brain,
  Search,
  CircleAlert
} from '../../shared/icons/lucide-icons';

@Component({
  selector: 'app-history-page',
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="bg-white border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-16">
            <div class="flex items-center gap-3">
              <lucide-icon [img]="FileTextIcon" class="w-6 h-6 text-blue-600" />
              <h1 class="text-xl font-semibold text-gray-900">Contract History</h1>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {{ cacheSize() }}/10
              </span>
            </div>
            
            <!-- Status indicators -->
            <div class="flex items-center gap-2">
              @if (status().online) {
                <div class="flex items-center gap-1 text-green-600">
                  <lucide-icon [img]="WifiIcon" class="w-4 h-4" />
                  <span class="text-sm">Online</span>
                </div>
              } @else {
                <div class="flex items-center gap-1 text-amber-600">
                  <lucide-icon [img]="WifiOffIcon" class="w-4 h-4" />
                  <span class="text-sm">Offline</span>
                </div>
              }
              
              @if (status().aiAvailable) {
                <div class="flex items-center gap-1 text-green-600">
                  <lucide-icon [img]="BrainIcon" class="w-4 h-4" />
                  <span class="text-sm">AI Ready</span>
                </div>
              } @else {
                <div class="flex items-center gap-1 text-red-600">
                  <lucide-icon [img]="CircleAlertIcon" class="w-4 h-4" />
                  <span class="text-sm">AI Unavailable</span>
                </div>
              }
            </div>
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Search bar -->
        <div class="mb-6">
          <div class="relative">
            <lucide-icon [img]="SearchIcon" class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search contracts..."
              [ngModel]="searchQuery()"
              (ngModelChange)="_searchQuery.set($event)"
              class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <!-- Contracts list -->
        @if (filteredContracts().length === 0) {
          <div class="text-center py-12">
            <lucide-icon [img]="FileTextIcon" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 class="text-lg font-medium text-gray-900 mb-2">
              @if (searchQuery()) {
                No contracts match your search
              } @else {
                No contract history yet
              }
            </h3>
            <p class="text-gray-600 mb-6">
              @if (searchQuery()) {
                Try adjusting your search terms.
              } @else {
                Analyze contracts to build your history. Your last 10 analyses will be saved here.
              }
            </p>
            @if (!searchQuery()) {
              <button
                (click)="goToAnalysis()"
                class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <lucide-icon [img]="FileTextIcon" class="w-4 h-4 mr-2" />
                Start Analysis
              </button>
            }
          </div>
        } @else {
          <div class="grid gap-4">
            @for (contract of filteredContracts(); track contract.id) {
              <div class="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div class="flex items-start justify-between">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-2">
                      <h3 class="text-lg font-medium text-gray-900 truncate">
                        {{ contract.contract.fileName || 'Untitled Contract' }}
                      </h3>
                      @if (!status().online) {
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                          <lucide-icon [img]="WifiOffIcon" class="w-3 h-3 mr-1" />
                          Offline
                        </span>
                      }
                    </div>
                    
                    <div class="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      <div class="flex items-center gap-1">
                        <lucide-icon [img]="UsersIcon" class="w-4 h-4" />
                        <span>{{ getPartiesText(contract.contract) }}</span>
                      </div>
                      <div class="flex items-center gap-1">
                        <lucide-icon [img]="CalendarIcon" class="w-4 h-4" />
                        <span>{{ formatDate(contract.analysis.analyzedAt) }}</span>
                      </div>
                    </div>
                    
                    @if (contract.analysis.summary) {
                      <p class="text-sm text-gray-600 line-clamp-2">
                        {{ getSummaryPreview(contract.analysis.summary) }}
                      </p>
                    }
                  </div>
                  
                  <div class="flex items-center gap-2 ml-4">
                    <button
                      (click)="viewAnalysis(contract)"
                      class="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      <lucide-icon [img]="EyeIcon" class="w-4 h-4 mr-1" />
                      View
                    </button>
                    
                    <button
                      (click)="deleteContract(contract.id)"
                      class="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                      <lucide-icon [img]="Trash2Icon" class="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `]
})
export class HistoryPageComponent implements OnInit, OnDestroy {
  private offlineStorage = inject(OfflineStorageService);
  private offlineDetection = inject(OfflineDetectionService);
  private router = inject(Router);
  
  // Icons
  readonly FileTextIcon = FileText;
  readonly CalendarIcon = Calendar;
  readonly UsersIcon = Users;
  readonly Trash2Icon = Trash2;
  readonly EyeIcon = Eye;
  readonly WifiIcon = Wifi;
  readonly WifiOffIcon = WifiOff;
  readonly BrainIcon = Brain;
  readonly SearchIcon = Search;
  readonly CircleAlertIcon = CircleAlert;
  
  // Component state
  private _contracts = signal<OfflineContract[]>([]);
  readonly _searchQuery = signal<string>('');
  
  // Public computed signals
  readonly contracts = computed(() => this._contracts());
  readonly searchQuery = computed(() => this._searchQuery());
  readonly cacheSize = computed(() => this.contracts().length);
  readonly status = computed(() => this.offlineDetection.getStatus());
  
  // Filtered contracts based on search
  readonly filteredContracts = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.contracts();
    
    return this.contracts().filter(contract => 
      contract.contract.fileName?.toLowerCase().includes(query) ||
      this.getPartiesText(contract.contract).toLowerCase().includes(query) ||
      contract.analysis.summary?.toLowerCase().includes(query)
    );
  });

  ngOnInit(): void {
    this.loadContracts();
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  /**
   * Load cached contracts
   */
  async loadContracts(): Promise<void> {
    try {
      const contracts = await this.offlineStorage.listContracts();
      this._contracts.set(contracts);
    } catch (error) {
      console.error('Failed to load contracts:', error);
    }
  }

  /**
   * View analysis for a contract
   */
  viewAnalysis(contract: OfflineContract): void {
    // Navigate to analysis view with the cached data
    this.router.navigate(['/analysis', contract.id], {
      state: { 
        contract: contract.contract,
        analysis: contract.analysis,
        fromCache: true 
      }
    });
  }

  /**
   * Delete a contract from cache
   */
  async deleteContract(contractId: string): Promise<void> {
    if (confirm('Are you sure you want to delete this contract from your history?')) {
      try {
        await this.offlineStorage.deleteContract(contractId);
        await this.loadContracts(); // Refresh the list
      } catch (error) {
        console.error('Failed to delete contract:', error);
        alert('Failed to delete contract. Please try again.');
      }
    }
  }

  /**
   * Go to analysis page
   */
  goToAnalysis(): void {
    this.router.navigate(['/']);
  }

  /**
   * Get parties text for display
   */
  getPartiesText(contract: any): string {
    if (contract.parties) {
      return `${contract.parties.party1?.name || 'Party 1'} ↔ ${contract.parties.party2?.name || 'Party 2'}`;
    }
    return 'Unknown parties';
  }

  /**
   * Format date for display
   */
  formatDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  /**
   * Get summary preview text
   */
  getSummaryPreview(summary: string): string {
    if (typeof summary === 'string') {
      return summary.length > 150 ? summary.substring(0, 150) + '...' : summary;
    }
    return 'No summary available';
  }
}
