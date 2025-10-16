import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ContractStore } from '../../core/stores/contract.store';
import { OnboardingStore } from '../../core/stores/onboarding.store';

@Component({
  selector: 'app-mock-route',
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 class="text-xl font-semibold text-gray-900 mb-2">Loading Cached Data...</h2>
        <p class="text-gray-600">Setting up dashboard with cached contract analysis</p>
      </div>
    </div>
  `,
  standalone: true,
})
export class MockRouteComponent implements OnInit {
  private router = inject(Router);
  private contractStore = inject(ContractStore);
  private onboardingStore = inject(OnboardingStore);

  ngOnInit() {
    this.loadMockData();
  }

  private async loadMockData() {
    try {
      console.log('🎨 Mock mode enabled - stores already have mock data');
      
      // Small delay for UX
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Navigate directly to dashboard - stores already have mock data
      this.router.navigate(['/analysis']);
    } catch (error) {
      console.error('Error in mock route:', error);
      // Fallback to upload page
      this.router.navigate(['/upload']);
    }
  }
}
