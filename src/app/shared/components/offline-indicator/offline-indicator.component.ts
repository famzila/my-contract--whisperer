import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OfflineDetectionService } from '../../../core/services/offline-detection.service';
import { LucideAngularModule, Wifi, WifiOff, Brain, AlertTriangle } from 'lucide-angular';

@Component({
  selector: 'app-offline-indicator',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    @if (showBanner()) {
      <div 
        class="fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out"
        [class]="bannerClasses()"
        [style.transform]="bannerTransform()"
      >
        <div class="flex items-center justify-center px-4 py-2 text-sm font-medium">
          <div class="flex items-center gap-2">
            @if (status().online) {
              <lucide-icon name="wifi" class="w-4 h-4" />
              <span>Back online</span>
            } @else if (status().aiAvailable) {
              <lucide-icon name="brain" class="w-4 h-4" />
              <span>You're offline - Contract analysis still works with cached AI</span>
            } @else {
              <lucide-icon name="alert-triangle" class="w-4 h-4" />
              <span>Offline - AI unavailable. Some features won't work.</span>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .banner-enter {
      transform: translateY(-100%);
    }
    .banner-enter-active {
      transform: translateY(0);
    }
    .banner-exit {
      transform: translateY(0);
    }
    .banner-exit-active {
      transform: translateY(-100%);
    }
  `]
})
export class OfflineIndicatorComponent implements OnInit, OnDestroy {
  private offlineDetection = inject(OfflineDetectionService);
  
  // Component state
  private _showBanner = signal<boolean>(false);
  private _bannerType = signal<'offline' | 'online' | 'ai-unavailable'>('online');
  private _autoHideTimer: number | null = null;
  
  // Public computed signals
  readonly showBanner = computed(() => this._showBanner());
  readonly bannerType = computed(() => this._bannerType());
  readonly status = computed(() => this.offlineDetection.getStatus());
  
  // Banner styling
  readonly bannerClasses = computed(() => {
    const type = this.bannerType();
    const baseClasses = 'transition-all duration-300 ease-in-out';
    
    switch (type) {
      case 'online':
        return `${baseClasses} bg-green-100 text-green-900 border-b border-green-200`;
      case 'offline':
        return `${baseClasses} bg-amber-100 text-amber-900 border-b border-amber-200`;
      case 'ai-unavailable':
        return `${baseClasses} bg-red-100 text-red-900 border-b border-red-200`;
      default:
        return baseClasses;
    }
  });
  
  readonly bannerTransform = computed(() => {
    return this.showBanner() ? 'translateY(0)' : 'translateY(-100%)';
  });

  ngOnInit(): void {
    // Listen to status changes
    this.offlineDetection.onlineStatus$.subscribe((isOnline) => {
      this.handleStatusChange(isOnline);
    });
    
    // Check initial status
    this.handleStatusChange(this.offlineDetection.isCurrentlyOnline());
  }

  ngOnDestroy(): void {
    if (this._autoHideTimer) {
      clearTimeout(this._autoHideTimer);
    }
  }

  /**
   * Handle online/offline status changes
   */
  private handleStatusChange(isOnline: boolean): void {
    const status = this.offlineDetection.getStatus();
    
    // Clear existing timer
    if (this._autoHideTimer) {
      clearTimeout(this._autoHideTimer);
      this._autoHideTimer = null;
    }
    
    if (isOnline) {
      // Came back online
      this._bannerType.set('online');
      this._showBanner.set(true);
      
      // Auto-hide after 3 seconds
      this._autoHideTimer = window.setTimeout(() => {
        this._showBanner.set(false);
      }, 3000);
      
    } else if (status.aiAvailable) {
      // Offline but AI available
      this._bannerType.set('offline');
      this._showBanner.set(true);
      // Don't auto-hide when offline
      
    } else {
      // Offline and AI unavailable
      this._bannerType.set('ai-unavailable');
      this._showBanner.set(true);
      // Don't auto-hide when offline
    }
  }

  /**
   * Manually hide the banner
   */
  hideBanner(): void {
    this._showBanner.set(false);
    if (this._autoHideTimer) {
      clearTimeout(this._autoHideTimer);
      this._autoHideTimer = null;
    }
  }
}
