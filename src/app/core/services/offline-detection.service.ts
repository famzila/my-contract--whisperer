import { Injectable, signal, computed } from '@angular/core';
import { Observable, fromEvent, merge, of } from 'rxjs';
import { map, startWith, shareReplay } from 'rxjs/operators';

/**
 * Offline Detection Service
 * Monitors online/offline status and AI availability
 */
@Injectable({
  providedIn: 'root',
})
export class OfflineDetectionService {
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
    this.checkAIAvailability();
  }

  /**
   * Set up network event listeners
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      console.log('🌐 Network: Back online');
      this._isOnline.set(true);
      // Re-check AI availability when back online
      this.checkAIAvailability();
    });

    window.addEventListener('offline', () => {
      console.log('📴 Network: Gone offline');
      this._isOnline.set(false);
    });
  }

  /**
   * Check if AI (Gemini Nano) is available
   */
  async checkAIAvailability(): Promise<boolean> {
    try {
      // Check if Chrome Built-in AI is available
      if ('ai' in window && 'languageModel' in (window as any).ai) {
        const ai = (window as any).ai;
        const capabilities = await ai.languageModel.capabilities();
        const isAvailable = capabilities && capabilities.supportedTasks && 
          capabilities.supportedTasks.includes('generateText');
        
        this._aiAvailable.set(isAvailable);
        console.log(`🤖 AI Status: ${isAvailable ? 'Available' : 'Unavailable'}`);
        return isAvailable;
      } else {
        this._aiAvailable.set(false);
        console.log('🤖 AI Status: Chrome Built-in AI not available');
        return false;
      }
    } catch (error) {
      console.warn('🤖 AI Status: Error checking AI availability:', error);
      this._aiAvailable.set(false);
      return false;
    }
  }

  /**
   * Get current online status
   */
  isCurrentlyOnline(): boolean {
    return this.isOnline();
  }

  /**
   * Get current AI availability
   */
  isCurrentlyAIAvailable(): boolean {
    return this.aiAvailable();
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

  /**
   * Force refresh AI availability check
   */
  async refreshAIStatus(): Promise<boolean> {
    return await this.checkAIAvailability();
  }
}

