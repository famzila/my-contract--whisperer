import { Injectable, inject } from '@angular/core';
import { Contract } from '../../models/contract.model';
import { ContractAnalysis } from '../../models/contract.model';
import { STORAGE_CONFIG } from '../../config/application.config';

/**
 * Offline contract storage interface
 */
export interface OfflineContract {
  id: string;
  contract: Contract;
  analysis: ContractAnalysis;
  cachedAt: Date;
  accessedAt: Date;
}

/**
 * Offline Storage Service
 * Manages FIFO cache of last 10 contract analyses using IndexedDB
 */
@Injectable({
  providedIn: 'root',
})
export class OfflineStorageService {
  private readonly DB_NAME = STORAGE_CONFIG.OFFLINE_STORAGE.DB_NAME;
  private readonly DB_VERSION = STORAGE_CONFIG.OFFLINE_STORAGE.DB_VERSION;
  private readonly STORE_NAME = STORAGE_CONFIG.OFFLINE_STORAGE.STORE_NAME;
  private readonly MAX_CONTRACTS = STORAGE_CONFIG.OFFLINE_STORAGE.MAX_CONTRACTS;
  
  private db: IDBDatabase | null = null;

  constructor() {
    this.initDB();
  }

  /**
   * Initialize IndexedDB
   */
  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
          store.createIndex('cachedAt', 'cachedAt', { unique: false });
          store.createIndex('accessedAt', 'accessedAt', { unique: false });
        }
      };
    });
  }

  /**
   * Wait for database to be ready
   */
  private async waitForDB(): Promise<IDBDatabase> {
    while (!this.db) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    return this.db;
  }

  /**
   * Save contract and analysis to offline storage
   * Automatically manages FIFO eviction
   */
  async saveContract(contract: Contract, analysis: ContractAnalysis): Promise<void> {
    const db = await this.waitForDB();
    
    const offlineContract: OfflineContract = {
      id: contract.id,
      contract,
      analysis,
      cachedAt: new Date(),
      accessedAt: new Date(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      // First, check if we need to evict oldest
      const countRequest = store.count();
      countRequest.onsuccess = () => {
        const count = countRequest.result;
        
        if (count >= this.MAX_CONTRACTS) {
          // Get oldest contract to evict
          const index = store.index('cachedAt');
          const oldestRequest = index.openCursor();
          
          oldestRequest.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor) {
              // Delete oldest
              const deleteRequest = store.delete(cursor.primaryKey);
              deleteRequest.onsuccess = () => {
                // Now save new contract
                const putRequest = store.put(offlineContract);
                putRequest.onsuccess = () => resolve();
                putRequest.onerror = () => reject(putRequest.error);
              };
              deleteRequest.onerror = () => reject(deleteRequest.error);
            }
          };
          oldestRequest.onerror = () => reject(oldestRequest.error);
        } else {
          // Save directly
          const putRequest = store.put(offlineContract);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        }
      };
      countRequest.onerror = () => reject(countRequest.error);
    });
  }

  /**
   * Get contract by ID
   */
  async getContract(id: string): Promise<OfflineContract | null> {
    const db = await this.waitForDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(id);
      
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          // Update accessed time
          result.accessedAt = new Date();
          const updateRequest = store.put(result);
          updateRequest.onsuccess = () => resolve(result);
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * List all cached contracts (sorted by accessed date, most recent first)
   */
  async listContracts(): Promise<OfflineContract[]> {
    const db = await this.waitForDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const contracts = request.result as OfflineContract[];
        resolve(contracts);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete contract from cache
   */
  async deleteContract(id: string): Promise<void> {
    const db = await this.waitForDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get cache size (number of stored contracts)
   */
  async getCacheSize(): Promise<number> {
    const db = await this.waitForDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.count();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all cached contracts
   */
  async clearAll(): Promise<void> {
    const db = await this.waitForDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get storage usage estimate
   */
  async getStorageEstimate(): Promise<{ used: number; available: number } | null> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          used: estimate.usage || 0,
          available: estimate.quota || 0,
        };
      } catch (error) {
        return null;
      }
    }
    return null;
  }
}


