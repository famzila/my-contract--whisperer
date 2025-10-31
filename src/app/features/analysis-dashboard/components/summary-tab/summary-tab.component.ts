import { Component, input, ChangeDetectionStrategy, computed } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { SkeletonLoader } from '../../../../shared/components/skeleton-loader';
import { 
  Clipboard, 
  TriangleAlert, 
  Users, 
  Briefcase, 
  DollarSign, 
  DoorOpen, 
  Shield,
  FileX,
  View,
  Zap
} from '../../../../shared/icons/lucide-icons';
import { Notice } from "../../../../shared/components/notice/notice";
import { TabHeader } from "../../../../shared/components/tab-header/tab-header";
import { ContractSummary, PerspectiveContext } from "../../../../core/models/ai-analysis.model";

@Component({
  selector: 'app-summary-tab',
  imports: [TranslatePipe, LucideAngularModule, SkeletonLoader, TabHeader, Notice],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './summary-tab.component.html'
})
export class SummaryTabComponent {
  // Modern input signals
  summary = input<ContractSummary | null>(null);
  isLoading = input<boolean>(false);
  retryCount = input<number>(0);
  isRetrying = input<boolean>(false);
  perspectiveContext = input<PerspectiveContext | null>(null);

  /**
   * Check if compensation section has any data
   */
  hasCompensationData = computed(() => {
    const compensation = this.summary()?.compensation;
    const benefits = this.summary()?.benefits;
    
    // Check for non-null, non-empty values
    // baseSalary is a number, others are strings
    const hasBaseSalary = compensation?.baseSalary != null;
    const hasBonus = compensation?.bonus != null && compensation.bonus !== '' && compensation.bonus !== 'null';
    const hasEquity = compensation?.equity != null && compensation.equity !== '' && compensation.equity !== 'null';
    const hasOther = compensation?.other != null && compensation.other !== '' && compensation.other !== 'null';
    const hasBenefits = benefits && benefits.length > 0;
    
    return hasBaseSalary || hasBonus || hasEquity || hasOther || hasBenefits;
  });

  /**
   * Check if termination section has any data
   */
  hasTerminationData = computed(() => {
    const termination = this.summary()?.termination;
    
    // Check for non-null, non-empty values
    const hasAtWill = termination?.atWill != null && termination.atWill !== '' && termination.atWill !== 'null';
    const hasForCause = termination?.forCause != null && termination.forCause !== '' && termination.forCause !== 'null';
    const hasSeverance = termination?.severance != null && termination.severance !== '' && termination.severance !== 'null';
    const hasNoticeRequired = termination?.noticeRequired != null && termination.noticeRequired !== '' && termination.noticeRequired !== 'null';
    
    return hasAtWill || hasForCause || hasSeverance || hasNoticeRequired;
  });

  /**
   * Check if restrictions section has any data
   */
  hasRestrictionsData = computed(() => {
    const restrictions = this.summary()?.restrictions;
    
    // Check for non-null, non-empty values
    const hasConfidentiality = restrictions?.confidentiality != null && restrictions.confidentiality !== '';
    const hasNonCompete = restrictions?.nonCompete != null && restrictions.nonCompete !== '';
    const hasNonSolicitation = restrictions?.nonSolicitation != null && restrictions.nonSolicitation !== '';
    const hasIntellectualProperty = restrictions?.intellectualProperty != null && restrictions.intellectualProperty !== '';
    const hasOther = restrictions?.other != null && restrictions.other !== '';
    
    return hasConfidentiality || hasNonCompete || hasNonSolicitation || hasIntellectualProperty || hasOther;
  });

  /**
   * Format Quick Take text by splitting on asterisks and converting to HTML list
   * Preserves original text in localStorage, formats only for display
   */
  formatQuickTakeText(rawText: string): string {
    if (!rawText) return '';
    
    // Split on single or double asterisks (with optional whitespace)
    const items = rawText
      .split(/\s*\*+\s*/)
      .map(item => item.trim())
      .filter(item => item.length > 0);
    
    if (items.length <= 1) {
      // If no asterisks found or only one item, return as-is
      return rawText;
    }
    
    // Convert to HTML list
    const listItems = items.map(item => `<li>${item}</li>`).join('');
    return `<ul class="list-disc list-inside space-y-1">${listItems}</ul>`;
  }

  /**
   * Get formatted Quick Take for display
   */
  getFormattedQuickTake = computed(() => {
    const quickTake = this.summary()?.quickTake;
    return quickTake ? this.formatQuickTakeText(quickTake) : '';
  });
  
  // Icons
  ClipboardIcon = Clipboard;
  TriangleAlertIcon = TriangleAlert;
  UsersIcon = Users;
  BriefcaseIcon = Briefcase;
  DollarSignIcon = DollarSign;
  DoorOpenIcon = DoorOpen;
  ShieldIcon = Shield;
  FileXIcon = FileX;
  ViewIcon = View;
  ZapIcon = Zap;


  
}
