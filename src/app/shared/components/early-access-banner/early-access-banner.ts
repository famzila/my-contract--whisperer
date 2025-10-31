import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from '@ngx-translate/core';
import { Button } from '../button/button';
import { Sparkles, Rocket, X } from '../../icons/lucide-icons';
import { APPLICATION_CONFIG } from '../../../core/config/application.config';

@Component({
  selector: 'app-early-access-banner',
  imports: [LucideAngularModule, TranslatePipe, Button],
  templateUrl: './early-access-banner.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EarlyAccessBanner {
  // Icons
  readonly SparklesIcon = Sparkles;
  readonly RocketIcon = Rocket;
  readonly XIcon = X;

  // Dismissal state
  private _isDismissed = signal<boolean>(false);
  readonly isDismissed = computed(() => this._isDismissed());

  // Check if banner should be shown
  readonly shouldShow = computed(() => {
    // Don't show if dismissed in this session
    if (this._isDismissed()) return false;
    
    // Check if user has dismissed it before (sessionStorage)
    return sessionStorage.getItem('early-access-banner-dismissed') !== 'true';
  });

  constructor() {
    // Check sessionStorage on init
    if (sessionStorage.getItem('early-access-banner-dismissed') === 'true') {
      this._isDismissed.set(true);
    }
  }

  /**
   * Open waitlist form in new tab
   */
  openWaitlist(): void {
    window.open(APPLICATION_CONFIG.UI.WAITLIST_FORM_URL, '_blank', 'noopener,noreferrer');
  }

  /**
   * Dismiss banner for this session and remember dismissal
   */
  dismiss(): void {
    this._isDismissed.set(true);
    sessionStorage.setItem('early-access-banner-dismissed', 'true');
  }
}
