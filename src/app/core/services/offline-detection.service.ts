import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable, fromEvent, merge, of } from 'rxjs';
import { map, startWith, shareReplay } from 'rxjs/operators';
import { LoggerService } from './logger.service';
import { AiOrchestratorService } from './ai/ai-orchestrator.service';

/**
 * Offline Detection Service
 * Monitors online/offline status and AI availability
 */
@Injectable({
  providedIn: 'root',
})
export class OfflineDetectionService {
  private logger = inject(LoggerService);
  private aiOrchestratorService = inject(AiOrchestratorService);
  // Signal-based online/offline state
  private _isOnline = signal<boolean>(navigator.onLine);
  private _aiAvailable = signal<boolean>(false);
  
  // Public computed signals
  readonly isOnline = computed(() => this._isOnline());
  readonly aiAvailable = computed(() => this._aiAvailable());
  readonly isFullyOffline = computed(() => !this.isOnline() && !this.aiAvailable());
  
  // Observable for reactive updates
  readonly onlineStatus$: Observable<boolean>;
  
  constructor() {
    // Set up event listeners for online/offline changes
    this.setupNetworkListeners();
    
    // Create observable for online status
    this.onlineStatus$ = merge(
      fromEvent(window, 'online').pipe(map(() => true)),
      fromEvent(window, 'offline').pipe(map(() => false))
    ).pipe(
      startWith(navigator.onLine),
      shareReplay(1)
    );
    
    // Check AI availability on initialization
    this.aiOrchestratorService.checkAvailability();
  }

  /**
   * Set up network event listeners
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.logger.info('Network: Back online');
      this._isOnline.set(true);
      // Re-check AI availability when back online
      this.aiOrchestratorService.checkAvailability();
    });

    window.addEventListener('offline', () => {
      this.logger.info('Network: Gone offline');
      this._isOnline.set(false);
    });
  }


  /**
   * Get current online status
   */
  isCurrentlyOnline(): boolean {
    return this.isOnline();
  }

  /**
   * Get comprehensive status
   */
  getStatus(): {
    online: boolean;
    aiAvailable: boolean;
    fullyOffline: boolean;
    canAnalyze: boolean;
  } {
    const online = this.isOnline();
    const aiAvailable = this.aiAvailable();
    
    return {
      online,
      aiAvailable,
      fullyOffline: !online && !aiAvailable,
      canAnalyze: aiAvailable, // Can analyze if AI is available (regardless of network)
    };
  }
}


