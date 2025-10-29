import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable, fromEvent, merge } from 'rxjs';
import { map, startWith, shareReplay } from 'rxjs/operators';
import { LoggerService } from './logger.service';
import { AiOrchestratorService } from './ai/ai-orchestrator.service';

@Injectable({
  providedIn: 'root',
})
export class OfflineDetectionService {
  private logger = inject(LoggerService);
  private aiOrchestratorService = inject(AiOrchestratorService);
  
  private _wasOffline = signal<boolean>(false);
  private _isOnline = signal<boolean>(navigator.onLine);
  private _aiAvailable = signal<boolean>(false);
  
  readonly isOnline = computed(() => this._isOnline());
  readonly aiAvailable = computed(() => this._aiAvailable());
  readonly isFullyOffline = computed(() => !this.isOnline() && !this.aiAvailable());
  readonly wasOffline = computed(() => this._wasOffline());
  
  readonly onlineStatus$: Observable<boolean>;
  
  constructor() {
    // Check if user was offline in previous session (BEFORE setting up listeners)
    if (sessionStorage.getItem('was-offline') === 'true') {
      this._wasOffline.set(true);
    }
    
    this.setupNetworkListeners();
    
    this.onlineStatus$ = merge(
      fromEvent(window, 'online').pipe(map(() => true)),
      fromEvent(window, 'offline').pipe(map(() => false))
    ).pipe(
      startWith(navigator.onLine),
      shareReplay(1)
    );
    
    // Check AI availability and update signal
    this.checkAndUpdateAiAvailability();
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.logger.info('Network: Back online');
      this._isOnline.set(true);
      this.checkAndUpdateAiAvailability();
    });

    window.addEventListener('offline', () => {
      this.logger.info('Network: Gone offline');
      this._isOnline.set(false);
      this._wasOffline.set(true);
      sessionStorage.setItem('was-offline', 'true'); // Persist offline state
      // Check AI availability when going offline (it might still work)
      this.checkAndUpdateAiAvailability();
    });
  }

  /**
   * Check AI availability and update the signal
   * Note: Chrome's Gemini Nano works offline, so if we're offline and check fails,
   * we should still check if LanguageModel API exists (works offline)
   */
  private async checkAndUpdateAiAvailability(): Promise<void> {
    try {
      // Quick check: If Chrome's LanguageModel API exists, AI is likely available
      // This works offline since Gemini Nano runs locally
      const hasLanguageModelApi = typeof window !== 'undefined' && 'LanguageModel' in window;
      
      if (hasLanguageModelApi) {
        // Try the full availability check
        try {
          const status = await this.aiOrchestratorService.checkAvailability();
          // AI is available if at least prompt service is available (core functionality)
          const isAvailable = status?.prompt ?? false;
          this._aiAvailable.set(isAvailable);
          this.logger.info(`AI availability updated: ${isAvailable}`);
        } catch (error) {
          // If check fails but API exists, assume available (works offline)
          this._aiAvailable.set(true);
          this.logger.info('AI availability check failed, but LanguageModel API exists - assuming available');
        }
      } else {
        // LanguageModel API doesn't exist
        this._aiAvailable.set(false);
        this.logger.warn('Chrome LanguageModel API not available');
      }
    } catch (error) {
      this.logger.error('Failed to check AI availability', error);
      // If we're offline and error occurs, check if API exists as fallback
      if (!this.isOnline() && typeof window !== 'undefined' && 'LanguageModel' in window) {
        this._aiAvailable.set(true);
        this.logger.info('Offline and check failed, but LanguageModel API exists - assuming available');
      } else {
        this._aiAvailable.set(false);
      }
    }
  }

  /**
   * Reset the "was offline" flag (call after showing reconnection banner)
   */
  resetOfflineFlag(): void {
    this._wasOffline.set(false);
    sessionStorage.removeItem('was-offline'); // Clear persisted state
  }

  isCurrentlyOnline(): boolean {
    return this.isOnline();
  }

  getStatus(): {
    online: boolean;
    aiAvailable: boolean;
    fullyOffline: boolean;
    canAnalyze: boolean;
    wasOffline: boolean;
  } {
    const online = this.isOnline();
    const aiAvailable = this.aiAvailable();
    
    return {
      online,
      aiAvailable,
      fullyOffline: !online && !aiAvailable,
      canAnalyze: aiAvailable,
      wasOffline: this.wasOffline(),
    };
  }
}