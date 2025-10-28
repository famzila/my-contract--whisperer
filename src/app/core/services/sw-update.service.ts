import { Injectable, inject, signal, computed } from '@angular/core';
import { SwUpdate, VersionReadyEvent, VersionDetectedEvent, VersionInstallationFailedEvent } from '@angular/service-worker';
import { filter, map, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { LoggerService } from './logger.service';

/**
 * Service Worker Update Service
 * Handles app updates and notifies users
 */
@Injectable({
  providedIn: 'root',
})
export class SwUpdateService {
  private swUpdate = inject(SwUpdate);
  private logger = inject(LoggerService);
  
  // Signals for UI state
  private _updateAvailable = signal<boolean>(false);
  private _updateDownloading = signal<boolean>(false);
  private _updateError = signal<string | null>(null);
  
  // Public computed signals
  readonly updateAvailable = computed(() => this._updateAvailable());
  readonly updateDownloading = computed(() => this._updateDownloading());
  readonly updateError = computed(() => this._updateError());
  
  // Current version info
  readonly currentVersion = signal<string>('');
  readonly newVersion = signal<string>('');

  constructor() {
    this.setupUpdateListeners();
  }

  /**
   * Set up service worker update listeners
   */
  private setupUpdateListeners(): void {
    if (!this.swUpdate.isEnabled) {
      this.logger.info('Service Worker: Not enabled (development mode)');
      return;
    }

    // Listen for version detection
    this.swUpdate.versionUpdates
      .pipe(
        filter((evt): evt is VersionDetectedEvent => evt.type === 'VERSION_DETECTED'),
        tap(evt => {
          this.logger.info(`Update: New version detected: ${evt.version.hash}`);
          this._updateDownloading.set(true);
          this.newVersion.set(evt.version.hash);
        })
      )
      .subscribe();

    // Listen for version ready
    this.swUpdate.versionUpdates
      .pipe(
        filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'),
        tap(evt => {
          this.logger.info(`Update: New version ready`);
          this.logger.info(`Current: ${evt.currentVersion.hash}`);
          this.logger.info(`Available: ${evt.latestVersion.hash}`);
          
          this._updateAvailable.set(true);
          this._updateDownloading.set(false);
          this.currentVersion.set(evt.currentVersion.hash);
          this.newVersion.set(evt.latestVersion.hash);
        })
      )
      .subscribe();

    // Listen for installation failures
    this.swUpdate.versionUpdates
      .pipe(
        filter((evt): evt is VersionInstallationFailedEvent => evt.type === 'VERSION_INSTALLATION_FAILED'),
        tap(evt => {
          this.logger.error(`Update: Installation failed: ${evt.error}`);
          this._updateError.set(`Update failed: ${evt.error}`);
          this._updateDownloading.set(false);
        })
      )
      .subscribe();
  }

  /**
   * Check for updates manually
   */
  async checkForUpdate(): Promise<boolean> {
    if (!this.swUpdate.isEnabled) {
      this.logger.info('Service Worker: Not enabled, skipping update check');
      return false;
    }

    try {
      this.logger.info('Checking for updates...');
      const updateFound = await this.swUpdate.checkForUpdate();
      this.logger.info(updateFound ? 'Update available' : 'Already up to date');
      return updateFound;
    } catch (error) {
      this.logger.error('Update check failed:', error);
      this._updateError.set(`Update check failed: ${error}`);
      return false;
    }
  }

  /**
   * Apply the available update
   */
  async applyUpdate(): Promise<void> {
    if (!this.updateAvailable()) {
      throw new Error('No update available to apply');
    }

    try {
      console.log('🔄 Applying update...');
      await this.swUpdate.activateUpdate();
      console.log('✅ Update applied, reloading page...');
      
      // Reload the page to apply the update
      document.location.reload();
    } catch (error) {
      console.error('❌ Failed to apply update:', error);
      this._updateError.set(`Failed to apply update: ${error}`);
      throw error;
    }
  }

  /**
   * Dismiss the update notification
   */
  dismissUpdate(): void {
    this._updateAvailable.set(false);
    this._updateError.set(null);
  }

  /**
   * Get update status for UI
   */
  getUpdateStatus(): {
    available: boolean;
    downloading: boolean;
    error: string | null;
    currentVersion: string;
    newVersion: string;
  } {
    return {
      available: this.updateAvailable(),
      downloading: this.updateDownloading(),
      error: this.updateError(),
      currentVersion: this.currentVersion(),
      newVersion: this.newVersion(),
    };
  }

  /**
   * Set up automatic update checking (every 6 hours)
   */
  setupAutomaticUpdates(): void {
    if (!this.swUpdate.isEnabled) {
      return;
    }

    // Check for updates every 6 hours
    setInterval(() => {
      this.checkForUpdate();
    }, 6 * 60 * 60 * 1000); // 6 hours

    console.log('🔄 Automatic update checking enabled (every 6 hours)');
  }
}
