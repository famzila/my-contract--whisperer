import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ContractStore, EmailDraftStore } from '../../core/stores';
import { Card, LoadingSpinner, Button } from '../../shared/components';
import type { ContractClause } from '../../core/models/contract.model';
import type { AIAnalysisResponse, RiskSeverity, RiskEmoji } from '../../core/models/ai-analysis.model';
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
  
  // Stores
  contractStore = inject(ContractStore);
  emailStore = inject(EmailDraftStore);
  
  // Local UI state only
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
   * Parse AI response - build structured data from analysis object
   */
  private parseAIResponse(): void {
    const analysis = this.contractStore.analysis();
    if (!analysis) return;
    
    // Check if analysis already has structured data (new format)
    if (analysis.metadata || analysis.omissions || analysis.questions) {
      // Build AIAnalysisResponse from analysis fields
      const structured: AIAnalysisResponse = {
        metadata: analysis.metadata || {
          contractType: 'Unknown',
          effectiveDate: null,
          endDate: null,
          duration: null,
          autoRenew: null,
          jurisdiction: null,
          parties: {
            employer: { name: 'N/A', location: null },
            employee: { name: 'N/A', location: null }
          }
        },
        summary: typeof analysis.summary === 'object' ? analysis.summary : {
          parties: analysis.summary || 'N/A',
          role: 'N/A',
          responsibilities: [],
          compensation: {},
          benefits: [],
          termination: {},
          restrictions: {},
          fromYourPerspective: analysis.summary || 'N/A',
          keyBenefits: [],
          keyConcerns: []
        },
        risks: analysis.clauses
          .filter(c => c.riskLevel !== 'safe')
          .map(c => ({
            title: c.plainLanguage.substring(0, 50) + '...',  // Use plainLanguage as title
            severity: (c.riskLevel === 'high' ? 'High' : c.riskLevel === 'medium' ? 'Medium' : 'Low') as RiskSeverity,
            emoji: (c.riskLevel === 'high' ? '🚨' : c.riskLevel === 'medium' ? '⚠️' : 'ℹ️') as RiskEmoji,
            description: c.plainLanguage,
            impact: `Risk level: ${c.riskLevel}`,  // Required field
            impactOn: 'both',
            contextWarning: null
          })),
        obligations: {
          employer: analysis.obligations?.filter(o => o.party === 'their').map(o => ({
            duty: o.description,
            amount: null,
            frequency: null,
            startDate: null,
            duration: null,
            scope: null
          })) || [],
          employee: analysis.obligations?.filter(o => o.party === 'your').map(o => ({
            duty: o.description,
            amount: null,
            frequency: null,
            startDate: null,
            duration: null,
            scope: null
          })) || []
        },
        omissions: analysis.omissions?.map(o => ({
          item: o.item,
          impact: o.importance,  // Map 'importance' to 'impact'
          priority: 'Medium' as 'High' | 'Medium' | 'Low'  // Default priority
        })) || [],
        questions: analysis.questions || [],
        contextWarnings: analysis.contextWarnings as any,  // Type cast for now
        disclaimer: analysis.disclaimer || 'This analysis is provided by an AI system and is not legal advice.'
      };
      
      this.structuredData.set(structured);
      console.log('✅ Successfully built structured data from analysis');
      return;
    }
    
    // Fallback: Try to parse summary as JSON (old format)
    if (typeof analysis.summary === 'string') {
      try {
        const parsed = JSON.parse(analysis.summary);
        this.structuredData.set(parsed);
        console.log('✅ Successfully parsed JSON from summary string');
      } catch (error) {
        console.warn('⚠️ Could not parse JSON, using fallback text format');
        this.structuredData.set(null);
      }
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
  
  /**
   * Draft a professional email with questions using Writer API
   * Delegates to EmailDraftStore
   */
  async draftProfessionalEmail(): Promise<void> {
    const data = this.structuredData();
    if (!data) return;
    
    const questions = data.questions;
    const employerName = data.metadata.parties.employer.name;
    const employeeName = data.metadata.parties.employee.name;
    
    // Delegate to EmailDraftStore
    await this.emailStore.draftEmail(questions, employerName, employeeName);
  }
  
  /**
   * Copy drafted email to clipboard
   * Delegates to EmailDraftStore
   */
  async copyDraftedEmail(): Promise<void> {
    const success = await this.emailStore.copyEmail();
    if (success) {
      // TODO: Show toast notification
    }
  }
  
  /**
   * Close email draft modal
   * Delegates to EmailDraftStore
   */
  closeDraftedEmail(): void {
    this.emailStore.clearEmail();
  }
  
  /**
   * Toggle rewrite options panel
   * Delegates to EmailDraftStore
   */
  toggleRewriteOptions(): void {
    this.emailStore.toggleRewriteOptions();
  }
  
  /**
   * Rewrite email with new tone/length
   * Delegates to EmailDraftStore
   */
  async rewriteEmail(): Promise<void> {
    await this.emailStore.rewriteEmail();
  }
  
  /**
   * Set rewrite tone
   * Delegates to EmailDraftStore
   */
  setRewriteTone(tone: 'formal' | 'neutral' | 'casual'): void {
    this.emailStore.setRewriteTone(tone);
  }
  
  /**
   * Set rewrite length
   * Delegates to EmailDraftStore
   */
  setRewriteLength(length: 'short' | 'medium' | 'long'): void {
    this.emailStore.setRewriteLength(length);
  }
}
