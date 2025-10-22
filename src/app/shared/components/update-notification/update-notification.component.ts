import { Component, inject, signal, computed, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SwUpdateService } from '../../../core/services/sw-update.service';
import { LucideAngularModule, Download, X, RefreshCw } from 'lucide-angular';

@Component({
  selector: 'app-update-notification',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    @if (showNotification()) {
      <div class="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4">
        <div class="bg-white border border-gray-200 rounded-lg shadow-lg p-4 animate-in slide-in-from-bottom-2">
          <div class="flex items-start gap-3">
            <div class="flex-shrink-0">
              @if (status().downloading) {
                <lucide-icon name="refresh-cw" class="w-5 h-5 text-blue-600 animate-spin" />
              } @else {
                <lucide-icon name="download" class="w-5 h-5 text-green-600" />
              }
            </div>
            
            <div class="flex-1 min-w-0">
              <h3 class="text-sm font-medium text-gray-900">
                @if (status().downloading) {
                  Downloading Update...
                } @else if (status().error) {
                  Update Error
                } @else {
                  New Version Available
                }
              </h3>
              
              <p class="text-sm text-gray-600 mt-1">
                @if (status().downloading) {
                  Please wait while we download the latest version.
                } @else if (status().error) {
                  {{ status().error }}
                } @else {
                  A new version of Contract Whisperer is ready to install.
                }
              </p>
              
              @if (status().available && !status().downloading && !status().error) {
                <div class="flex gap-2 mt-3">
                  <button
                    (click)="applyUpdate()"
                    class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                  >
                    <lucide-icon name="download" class="w-3 h-3 mr-1" />
                    Update Now
                  </button>
                  
                  <button
                    (click)="dismissUpdate()"
                    class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                  >
                    <lucide-icon name="x" class="w-3 h-3 mr-1" />
                    Later
                  </button>
                </div>
              }
              
              @if (status().error) {
                <div class="flex gap-2 mt-3">
                  <button
                    (click)="dismissUpdate()"
                    class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                  >
                    <lucide-icon name="x" class="w-3 h-3 mr-1" />
                    Dismiss
                  </button>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .animate-in {
      animation: slideIn 0.3s ease-out;
    }
    
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(100%);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class UpdateNotificationComponent implements OnInit, OnDestroy {
  private swUpdate = inject(SwUpdateService);
  
  // Component state
  private _showNotification = signal<boolean>(false);
  private _autoHideTimer: number | null = null;
  
  // Public computed signals
  readonly showNotification = computed(() => this._showNotification());
  readonly status = computed(() => this.swUpdate.getUpdateStatus());

  ngOnInit(): void {
    // Listen to update status changes using effect
    effect(() => {
      if (this.swUpdate.updateAvailable()) {
        this.showUpdateNotification();
      }
    });
    
    effect(() => {
      if (this.swUpdate.updateDownloading()) {
        this.showUpdateNotification();
      }
    });
    
    effect(() => {
      if (this.swUpdate.updateError()) {
        this.showUpdateNotification();
      }
    });
  }

  ngOnDestroy(): void {
    if (this._autoHideTimer) {
      clearTimeout(this._autoHideTimer);
    }
  }

  /**
   * Show update notification
   */
  private showUpdateNotification(): void {
    this._showNotification.set(true);
    
    // Auto-hide after 10 seconds if user doesn't interact
    if (this._autoHideTimer) {
      clearTimeout(this._autoHideTimer);
    }
    
    this._autoHideTimer = window.setTimeout(() => {
      if (!this.status().downloading && !this.status().error) {
        this.dismissUpdate();
      }
    }, 10000);
  }

  /**
   * Apply the available update
   */
  async applyUpdate(): Promise<void> {
    try {
      await this.swUpdate.applyUpdate();
      // Page will reload automatically after successful update
    } catch (error) {
      console.error('Failed to apply update:', error);
    }
  }

  /**
   * Dismiss the update notification
   */
  dismissUpdate(): void {
    this._showNotification.set(false);
    this.swUpdate.dismissUpdate();
    
    if (this._autoHideTimer) {
      clearTimeout(this._autoHideTimer);
      this._autoHideTimer = null;
    }
  }
}
