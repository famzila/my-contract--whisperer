import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
  // Stores only - no direct service injection
  contractStore = inject(ContractStore);
  private uiStore = inject(UiStore);
  private router = inject(Router);

  // Local UI state
  mode = signal<UploadMode>('file');
  contractText = signal('');
  isDragging = signal(false);

  /**
   * Switch between upload modes
   */
  setMode(mode: UploadMode): void {
    this.mode.set(mode);
    this.contractStore.clearErrors();
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
   * Delegates to ContractStore
   */
  private async processFile(file: File): Promise<void> {
    try {
      // Let the store handle parsing and analysis
      await this.contractStore.parseAndAnalyzeFile(file);
      
      // Show success and navigate
      this.uiStore.showToast('Contract analyzed successfully!', 'success');
      await this.router.navigate(['/analysis']);
    } catch (err) {
      const error = err as Error;
      this.uiStore.showToast('Analysis failed: ' + error.message, 'error');
    }
  }

  /**
   * Process text input
   * Delegates to ContractStore
   */
  async onTextSubmit(): Promise<void> {
    const text = this.contractText();
    
    if (!text.trim()) {
      this.uiStore.showToast('Please enter contract text', 'error');
      return;
    }

    try {
      // Let the store handle parsing and analysis
      await this.contractStore.parseAndAnalyzeText(text);
      
      // Show success and navigate
      this.uiStore.showToast('Contract analyzed successfully!', 'success');
      await this.router.navigate(['/analysis']);
    } catch (err) {
      const error = err as Error;
      this.uiStore.showToast('Analysis failed: ' + error.message, 'error');
    }
  }

  /**
   * Reset upload state
   */
  reset(): void {
    this.contractText.set('');
    this.contractStore.clearErrors();
  }

  /**
   * Get word count for text area
   */
  get wordCount(): number {
    const text = this.contractText();
    if (!text) return 0;
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Get estimated reading time (200 words per minute)
   */
  get readingTime(): number {
    const words = this.wordCount;
    return Math.ceil(words / 200);
  }
}
