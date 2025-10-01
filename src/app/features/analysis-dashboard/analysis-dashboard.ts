import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ContractStore } from '../../core/stores/contract.store';
import { Card } from '../../shared/components/card/card';
import { LoadingSpinner } from '../../shared/components/loading-spinner/loading-spinner';
import { Button } from '../../shared/components/button/button';
import type { ContractClause } from '../../core/models/contract.model';

@Component({
  selector: 'app-analysis-dashboard',
  imports: [CommonModule, Card, LoadingSpinner, Button],
  templateUrl: './analysis-dashboard.html',
  styleUrl: './analysis-dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalysisDashboard implements OnInit {
  private router = inject(Router);
  contractStore = inject(ContractStore);
  
  // Local state
  selectedTab = signal<'overview' | 'clauses' | 'obligations'>('overview');
  expandedClauseId = signal<string | null>(null);

  ngOnInit(): void {
    // Redirect if no contract/analysis
    if (!this.contractStore.hasContract() || !this.contractStore.hasAnalysis()) {
      this.router.navigate(['/upload']);
    }
  }

  /**
   * Switch tab
   */
  selectTab(tab: 'overview' | 'clauses' | 'obligations'): void {
    this.selectedTab.set(tab);
  }

  /**
   * Toggle clause expansion
   */
  toggleClause(clauseId: string): void {
    const current = this.expandedClauseId();
    this.expandedClauseId.set(current === clauseId ? null : clauseId);
  }

  /**
   * Get risk level color
   */
  getRiskColor(risk: string): string {
    switch (risk) {
      case 'high':
        return 'bg-error text-white';
      case 'medium':
        return 'bg-warning text-white';
      case 'low':
        return 'bg-risk-low text-white';
      case 'safe':
        return 'bg-risk-safe text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  }

  /**
   * Get risk level icon
   */
  getRiskIcon(risk: string): string {
    switch (risk) {
      case 'high':
        return '🚨';
      case 'medium':
        return '⚠️';
      case 'low':
        return '⚡';
      case 'safe':
        return '✅';
      default:
        return '❔';
    }
  }

  /**
   * Get risk score label
   */
  getRiskScoreLabel(score: number): string {
    if (score >= 80) return 'High Risk';
    if (score >= 50) return 'Medium Risk';
    if (score >= 20) return 'Low Risk';
    return 'Safe';
  }

  /**
   * Get risk score color
   */
  getRiskScoreColor(score: number): string {
    if (score >= 80) return 'text-error';
    if (score >= 50) return 'text-warning';
    if (score >= 20) return 'text-risk-low';
    return 'text-risk-safe';
  }

  /**
   * Format date
   */
  formatDate(date?: Date): string {
    if (!date) return 'No due date';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  /**
   * Get priority color
   */
  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'high':
        return 'text-error';
      case 'medium':
        return 'text-warning';
      case 'low':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  }

  /**
   * Upload new contract
   */
  uploadNew(): void {
    this.contractStore.reset();
    this.router.navigate(['/upload']);
  }
}
