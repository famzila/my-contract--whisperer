import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { OfflineDetectionService } from '../../../core/services/offline-detection.service';
import { LucideAngularModule } from 'lucide-angular';
import { Wifi, WifiOff, Brain, TriangleAlert } from '../../icons/lucide-icons';

@Component({
  selector: 'app-offline-indicator',
  imports: [CommonModule, LucideAngularModule, TranslatePipe],
  template: `
    @if (showBanner()) {
    <div
      class="top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out"
      [class]="bannerClasses()"
      [style.transform]="bannerTransform()"
    >
      <div class="flex items-center justify-center px-4 py-2 text-sm font-medium">
        <div class="flex items-center gap-2">
          @if (status().online) {
          <lucide-icon [img]="WifiIcon" class="w-4 h-4" />
          <span>{{ 'offline.backOnline' | translate }}</span>
          } @else if (status().aiAvailable) {
          <lucide-icon [img]="BrainIcon" class="w-4 h-4" />
          <span>{{ 'offline.aiAvailable' | translate }}</span>
          } @else {
          <lucide-icon [img]="TriangleAlertIcon" class="w-4 h-4" />
          <span>{{ 'offline.aiUnavailable' | translate }}</span>
          }
        </div>
      </div>
    </div>
    }
  `,
  styles: [
    `
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
    `,
  ],
})
export class OfflineIndicatorComponent implements OnInit, OnDestroy {
  private offlineDetection = inject(OfflineDetectionService);

  // Icons
  readonly WifiIcon = Wifi;
  readonly WifiOffIcon = WifiOff;
  readonly BrainIcon = Brain;
  readonly TriangleAlertIcon = TriangleAlert;

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
        return `${baseClasses} bg-green-100 text-green-900 border-b border-green-200 dark:bg-green-900/10 dark:text-green-100 dark:border-green-800`;
      case 'offline':
        return `${baseClasses} bg-amber-100 text-amber-900 border-b border-amber-200 dark:bg-amber-900/10 dark:text-amber-100 dark:border-amber-800`;
      case 'ai-unavailable':
        return `${baseClasses} bg-red-100 text-red-900 border-b border-red-200 dark:bg-red-900/10 dark:text-red-100 dark:border-red-800`;
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

    if (isOnline && status.wasOffline) {
      // Only show "back online" if user was actually offline before
      this._bannerType.set('online');
      this._showBanner.set(true);

      // Auto-hide after 3 seconds
      this._autoHideTimer = window.setTimeout(() => {
        this._showBanner.set(false);
        this.offlineDetection.resetOfflineFlag(); // Reset the flag after showing banner
      }, 3000);
    } else if (!isOnline && status.aiAvailable) {
      // Offline but AI available
      this._bannerType.set('offline');
      this._showBanner.set(true);
      // Don't auto-hide when offline
    } else if (!isOnline && !status.aiAvailable) {
      // Offline and AI unavailable
      this._bannerType.set('ai-unavailable');
      this._showBanner.set(true);
      // Don't auto-hide when offline
    } else {
      // Online but never was offline (normal app load) - don't show banner
      this._showBanner.set(false);
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
