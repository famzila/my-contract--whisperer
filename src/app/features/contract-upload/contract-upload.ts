import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ContractParserService, type ParsedContract } from '../../core/services/contract-parser.service';
import { ContractStore } from '../../core/stores/contract.store';
import { UiStore } from '../../core/stores/ui.store';

type UploadMode = 'file' | 'text';

@Component({
  selector: 'app-contract-upload',
  imports: [CommonModule, FormsModule],
  templateUrl: './contract-upload.html',
  styleUrl: './contract-upload.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContractUpload {
  // Only inject parser service for file/text parsing
  // Store handles all analysis logic
  private parserService = inject(ContractParserService);
  private contractStore = inject(ContractStore);
  private uiStore = inject(UiStore);
  private router = inject(Router);

  // State signals
  mode = signal<UploadMode>('file');
  contractText = signal('');
  isLoading = signal(false);
  error = signal<string | null>(null);
  parsedContract = signal<ParsedContract | null>(null);
  isDragging = signal(false);

  /**
   * Switch between upload modes
   */
  setMode(mode: UploadMode): void {
    this.mode.set(mode);
    this.clearError();
  }

  /**
   * Handle file selection from input
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processFile(input.files[0]);
    }
  }

  /**
   * Handle file drop
   */
  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processFile(files[0]);
    }
  }

  /**
   * Handle drag over
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  /**
   * Handle drag leave
   */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  /**
   * Process uploaded file
   */
  private async processFile(file: File): Promise<void> {
    this.isLoading.set(true);
    this.clearError();

    try {
      // Parse the file
      const parsed = await this.parserService.parseFile(file);
      this.parsedContract.set(parsed);
      
      // Let the store handle analysis
      await this.contractStore.analyzeContract(parsed);
      
      // Show success and navigate
      this.uiStore.showToast('Contract analyzed successfully!', 'success');
      await this.router.navigate(['/analysis']);
    } catch (err) {
      const error = err as Error;
      this.error.set(error.message);
      this.uiStore.showToast('Analysis failed: ' + error.message, 'error');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Process text input
   */
  async onTextSubmit(): Promise<void> {
    const text = this.contractText();
    
    if (!text.trim()) {
      this.error.set('Please enter contract text');
      return;
    }

    this.isLoading.set(true);
    this.clearError();

    try {
      // Parse the text
      const parsed = this.parserService.parseText(text);
      this.parsedContract.set(parsed);
      
      // Let the store handle analysis
      await this.contractStore.analyzeContract(parsed);
      
      // Show success and navigate
      this.uiStore.showToast('Contract analyzed successfully!', 'success');
      await this.router.navigate(['/analysis']);
    } catch (err) {
      const error = err as Error;
      this.error.set(error.message);
      this.uiStore.showToast('Analysis failed: ' + error.message, 'error');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Clear error message
   */
  private clearError(): void {
    this.error.set(null);
  }

  /**
   * Reset upload state
   */
  reset(): void {
    this.contractText.set('');
    this.parsedContract.set(null);
    this.clearError();
    this.isLoading.set(false);
  }

  /**
   * Get word count for text area
   */
  get wordCount(): number {
    const text = this.contractText();
    if (!text) return 0;
    return this.parserService.getWordCount(text);
  }

  /**
   * Get estimated reading time
   */
  get readingTime(): number {
    const text = this.contractText();
    if (!text) return 0;
    return this.parserService.estimateReadingTime(text);
  }
}
