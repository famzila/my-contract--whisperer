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
import { WriterService } from '../../core/services/ai/writer.service';

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
  private writerService = inject(WriterService);
  
  // Local state
  selectedTab = signal<'summary' | 'risks' | 'obligations' | 'omissions' | 'questions' | 'disclaimer'>('summary');
  expandedQuestionId = signal<string | null>(null);
  
  // Parsed structured data from AI JSON response
  structuredData = signal<AIAnalysisResponse | null>(null);
  
  // Check if mock mode is enabled
  isMockMode = AppConfig.useMockAI;
  
  // Email draft state
  isDraftingEmail = signal<boolean>(false);
  draftedEmail = signal<string | null>(null);
  isRewritingEmail = signal<boolean>(false);
  showRewriteOptions = signal<boolean>(false);
  
  // Rewrite options
  rewriteTone = signal<'formal' | 'neutral' | 'casual'>('formal');
  rewriteLength = signal<'short' | 'medium' | 'long'>('medium');

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
  
  /**
   * Draft a professional email with questions using Writer API
   */
  async draftProfessionalEmail(): Promise<void> {
    if (this.isDraftingEmail()) return;
    
    const data = this.structuredData();
    if (!data) return;
    
    const questions = data.questions;
    const employerName = data.metadata.parties.employer.name;
    const employeeName = data.metadata.parties.employee.name;
    
    if (questions.length === 0) {
      console.warn('No questions to draft email');
      return;
    }
    
    this.isDraftingEmail.set(true);
    this.draftedEmail.set(null);
    
    try {
      // Check if Writer API is available
      const isAvailable = await this.writerService.isWriterAvailable();
      
      if (!isAvailable || AppConfig.useMockAI) {
        // Use mock email if Writer API not available or in mock mode
        console.log('📧 Using mock email template (Writer API not available or mock mode enabled)');
        const mockEmail = this.generateMockEmail(employerName, employeeName, questions);
        
        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        this.draftedEmail.set(mockEmail);
        this.isDraftingEmail.set(false);
        return;
      }
      
      // Use Writer API to generate professional email with streaming
      console.log('✍️ Drafting email with Writer API (streaming)...');
      
      const prompt = this.buildEmailPrompt(employerName, employeeName, questions);
      const stream = await this.writerService.writeStreaming(prompt, {
        tone: 'formal',
        length: 'medium',
        sharedContext: `This is a professional email from ${employeeName} to ${employerName} regarding an employment agreement.`,
      });
      
      // Process the stream - Writer API returns an async iterable of text chunks
      let emailText = '';
      
      for await (const chunk of stream as any) {
        emailText += chunk;
        
        // Update email in real-time for that "wow effect"
        this.draftedEmail.set(emailText);
      }
      
      console.log('✅ Email drafted successfully');
    } catch (error) {
      console.error('❌ Error drafting email:', error);
      // Fallback to mock email on error
      const mockEmail = this.generateMockEmail(employerName, employeeName, questions);
      this.draftedEmail.set(mockEmail);
    } finally {
      this.isDraftingEmail.set(false);
    }
  }
  
  /**
   * Build prompt for Writer API
   */
  private buildEmailPrompt(employerName: string, employeeName: string, questions: string[]): string {
    const questionsList = questions.map((q, i) => `${i + 1}. ${q}`).join('\n\n');
    
    return `Write a professional, polite email from ${employeeName} to the HR team or hiring manager at ${employerName} asking for clarification on the following points from an employment agreement:

${questionsList}

The email should:
- Start with "Subject: Clarification on Employment Agreement Terms"
- Address the recipient as "Dear HR Team" or "Dear Hiring Manager" (be specific to ${employerName})
- Express gratitude for receiving the agreement and excitement about the opportunity
- List the questions in a numbered format
- Mention that clarity will help ensure alignment and contribute to a successful working relationship
- End with "Best regards," followed by ${employeeName}
- Be professional, courteous, concise but complete

Format the email with proper structure including Subject, Greeting, Body, and Closing.`;
  }
  
  /**
   * Generate mock email when Writer API is not available
   */
  private generateMockEmail(employerName: string, employeeName: string, questions: string[]): string {
    const questionsList = questions
      .slice(0, 5) // Limit to first 5 questions for readability
      .map((q, i) => `${i + 1}. ${q}`)
      .join('\n\n');
    
    return `Subject: Clarification on Employment Agreement Terms

Dear ${employerName} HR Team,

Thank you for sending over the Employment Agreement for the position at ${employerName}. I am excited about the opportunity to join your team.

Before I proceed with signing, I would appreciate clarification on the following points to ensure I fully understand the terms:

${questionsList}

I believe having clarity on these matters will help ensure we are aligned and will contribute to a successful working relationship.

I look forward to your response and appreciate your time in addressing these questions.

Best regards,
${employeeName}`;
  }
  
  /**
   * Copy drafted email to clipboard
   */
  async copyDraftedEmail(): Promise<void> {
    const email = this.draftedEmail();
    if (!email) return;
    
    try {
      await navigator.clipboard.writeText(email);
      console.log('✅ Email copied to clipboard');
      // TODO: Show toast notification
    } catch (err) {
      console.error('❌ Failed to copy email:', err);
    }
  }
  
  /**
   * Close email draft modal
   */
  closeDraftedEmail(): void {
    this.draftedEmail.set(null);
    this.showRewriteOptions.set(false);
  }
  
  /**
   * Toggle rewrite options panel
   */
  toggleRewriteOptions(): void {
    this.showRewriteOptions.update(val => !val);
  }
  
  /**
   * Rewrite email with new tone/length using streaming
   */
  async rewriteEmail(): Promise<void> {
    const currentEmail = this.draftedEmail();
    if (!currentEmail || this.isRewritingEmail()) return;
    
    this.isRewritingEmail.set(true);
    
    try {
      // Check if Rewriter API is available
      const isAvailable = await this.writerService.isRewriterAvailable();
      
      if (!isAvailable || AppConfig.useMockAI) {
        console.log('📧 Rewriter API not available, using Writer API as fallback');
        
        // Fallback to Writer API with new instructions
        const data = this.structuredData();
        if (!data) return;
        
        const prompt = `Rewrite this email with a ${this.rewriteTone()} tone and ${this.rewriteLength()} length:\n\n${currentEmail}`;
        const rewritten = await this.writerService.write(prompt, {
          tone: this.rewriteTone(),
          length: this.rewriteLength(),
        });
        
        this.draftedEmail.set(rewritten);
        this.isRewritingEmail.set(false);
        return;
      }
      
      // Use Rewriter API with streaming
      console.log('🔄 Rewriting email with Rewriter API (streaming)...');
      
      // Map user-friendly options to Rewriter API values
      const rewriterTone = this.mapToneToRewriterAPI(this.rewriteTone());
      const rewriterLength = this.mapLengthToRewriterAPI(this.rewriteLength());
      
      const stream = await this.writerService.rewriteStreaming(currentEmail, {
        tone: rewriterTone,
        length: rewriterLength,
      });
      
      // Process the stream
      // The Rewriter API returns an async iterable of text chunks
      let rewrittenText = '';
      
      for await (const chunk of stream as any) {
        rewrittenText += chunk;
        
        // Update email in real-time
        this.draftedEmail.set(rewrittenText);
      }
      
      console.log('✅ Email rewritten successfully');
    } catch (error) {
      console.error('❌ Error rewriting email:', error);
      // Keep original email on error
    } finally {
      this.isRewritingEmail.set(false);
    }
  }
  
  /**
   * Set rewrite tone
   */
  setRewriteTone(tone: 'formal' | 'neutral' | 'casual'): void {
    this.rewriteTone.set(tone);
  }
  
  /**
   * Set rewrite length
   */
  setRewriteLength(length: 'short' | 'medium' | 'long'): void {
    this.rewriteLength.set(length);
  }
  
  /**
   * Map user-friendly tone to Rewriter API tone
   */
  private mapToneToRewriterAPI(tone: 'formal' | 'neutral' | 'casual'): 'more-formal' | 'as-is' | 'more-casual' {
    switch (tone) {
      case 'formal':
        return 'more-formal';
      case 'neutral':
        return 'as-is';
      case 'casual':
        return 'more-casual';
    }
  }
  
  /**
   * Map user-friendly length to Rewriter API length
   */
  private mapLengthToRewriterAPI(length: 'short' | 'medium' | 'long'): 'shorter' | 'as-is' | 'longer' {
    switch (length) {
      case 'short':
        return 'shorter';
      case 'medium':
        return 'as-is';
      case 'long':
        return 'longer';
    }
  }
}
