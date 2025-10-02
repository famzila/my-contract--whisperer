import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ContractStore } from '../../core/stores/contract.store';
import { Card } from '../../shared/components/card/card';
import { LoadingSpinner } from '../../shared/components/loading-spinner/loading-spinner';
import { Button } from '../../shared/components/button/button';
import type { ContractClause } from '../../core/models/contract.model';
import type { AIAnalysisResponse } from '../../core/models/ai-analysis.model';
import { AppConfig } from '../../core/config/app.config';

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
  selectedTab = signal<'summary' | 'risks' | 'obligations' | 'omissions' | 'questions' | 'disclaimer'>('summary');
  expandedQuestionId = signal<string | null>(null);
  
  // Parsed structured data from AI JSON response
  structuredData = signal<AIAnalysisResponse | null>(null);
  
  // Check if mock mode is enabled
  isMockMode = AppConfig.useMockAI;

  ngOnInit(): void {
    // Redirect if no contract/analysis
    if (!this.contractStore.hasContract() || !this.contractStore.hasAnalysis()) {
      this.router.navigate(['/upload']);
      return;
    }
    
    // Parse AI response into sections
    this.parseAIResponse();
  }

  /**
   * Parse AI response - try JSON first, fallback to text parsing
   */
  private parseAIResponse(): void {
    const analysis = this.contractStore.analysis();
    if (!analysis?.summary) return;
    
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(analysis.summary);
      this.structuredData.set(parsed);
      console.log('✅ Successfully parsed JSON structured data');
    } catch (error) {
      console.warn('⚠️ Could not parse JSON, data may be in text format');
      this.structuredData.set(null);
    }
  }

  /**
   * Switch tab
   */
  selectTab(tab: 'summary' | 'risks' | 'obligations' | 'omissions' | 'questions' | 'disclaimer'): void {
    this.selectedTab.set(tab);
  }

  /**
   * Toggle question expansion
   */
  toggleQuestion(questionId: string): void {
    const current = this.expandedQuestionId();
    this.expandedQuestionId.set(current === questionId ? null : questionId);
  }
  
  /**
   * Copy question to clipboard
   */
  async copyQuestion(question: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(question);
      console.log('✅ Question copied to clipboard');
    } catch (err) {
      console.error('❌ Failed to copy question:', err);
    }
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
  
  /**
   * Get risks from structured data
   */
  getRisks() {
    return this.structuredData()?.risks || [];
  }
  
  /**
   * Get omissions from structured data
   */
  getOmissions() {
    return this.structuredData()?.omissions || [];
  }
  
  /**
   * Get questions from structured data
   */
  getQuestions(): string[] {
    return this.structuredData()?.questions || [];
  }
  
  /**
   * Get summary data
   */
  getSummary() {
    return this.structuredData()?.summary || null;
  }
  
  /**
   * Get obligations data
   */
  getObligations() {
    return this.structuredData()?.obligations || { employer: [], employee: [] };
  }
  
  /**
   * Get disclaimer text
   */
  getDisclaimer(): string {
    return this.structuredData()?.disclaimer || 'I am an AI assistant, not a lawyer. This information is for educational purposes only. Consult a qualified attorney for legal advice.';
  }
  
  /**
   * Get metadata
   */
  getMetadata() {
    return this.structuredData()?.metadata || null;
  }
  
  /**
   * Get high priority risks
   */
  getHighRisks() {
    return this.getRisks().filter(r => r.severity === 'High');
  }
  
  /**
   * Get medium priority risks
   */
  getMediumRisks() {
    return this.getRisks().filter(r => r.severity === 'Medium');
  }
  
  /**
   * Get low priority risks
   */
  getLowRisks() {
    return this.getRisks().filter(r => r.severity === 'Low');
  }
  
  /**
   * Get high priority omissions
   */
  getHighPriorityOmissions() {
    return this.getOmissions().filter(o => o.priority === 'High');
  }
  
  /**
   * Get medium priority omissions
   */
  getMediumPriorityOmissions() {
    return this.getOmissions().filter(o => o.priority === 'Medium');
  }
  
  /**
   * Get low priority omissions
   */
  getLowPriorityOmissions() {
    return this.getOmissions().filter(o => o.priority === 'Low');
  }
  
  /**
   * Format obligation display text
   */
  formatObligation(obl: any): string {
    let text = obl.duty;
    
    if (obl.amount) {
      text += ` • $${obl.amount.toLocaleString()}`;
    }
    if (obl.frequency) {
      text += ` • ${obl.frequency}`;
    }
    if (obl.startDate) {
      text += ` • Starts: ${obl.startDate}`;
    }
    if (obl.duration) {
      text += ` • Duration: ${obl.duration}`;
    }
    if (obl.scope && !obl.amount && !obl.frequency) {
      text += ` • ${obl.scope}`;
    }
    
    return text;
  }
}
