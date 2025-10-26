import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { SkeletonLoader } from '../../../../shared/components/skeleton-loader';
import { 
  Clipboard, 
  AlertTriangle, 
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

// Use the actual ContractSummary type from the store
export interface SummaryData {
  // NEW: Quick overview from Summarizer API (optional)
  quickTake?: string;
  
  // Structured details from Prompt API (NO duplicates with metadata)
  summary: {
    keyResponsibilities: string[]; // Renamed from 'responsibilities'
    compensation: {
      baseSalary?: number | null;
      bonus?: string | null;
      equity?: string | null;
      other?: string | null;
    };
    benefits: string[];
    termination: {
      atWill?: string | null;
      forCause?: string | null;
      severance?: string | null;
      noticeRequired?: string | null; // NEW: Important detail
    };
    restrictions: {
      confidentiality?: string | null;
      nonCompete?: string | null;
      nonSolicitation?: string | null;
      intellectualProperty?: string | null; // NEW: IP assignment
      other?: string | null;
    };
  };
}

export interface PerspectiveContext {
  icon: any;
  titleKey: string;
  messageKey: string;
}

@Component({
  selector: 'app-summary-tab',
  imports: [TranslateModule, LucideAngularModule, SkeletonLoader, CurrencyPipe, TabHeader, Notice],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './summary-tab.component.html'
})
export class SummaryTabComponent {
  // Modern input signals
  summary = input<SummaryData | null>(null);
  isLoading = input<boolean>(false);
  retryCount = input<number>(0);
  isRetrying = input<boolean>(false);
  perspectiveContext = input<PerspectiveContext | null>(null);

  // Icons
  ClipboardIcon = Clipboard;
  AlertTriangleIcon = AlertTriangle;
  UsersIcon = Users;
  BriefcaseIcon = Briefcase;
  DollarSignIcon = DollarSign;
  DoorOpenIcon = DoorOpen;
  ShieldIcon = Shield;
  FileXIcon = FileX;
  ViewIcon = View;
  ZapIcon = Zap;

  /**
   * Format Quick Take text by cleaning up markdown formatting
   * Removes ** and * characters and converts to clean bullet points
   */
  formatQuickTake(text: string): string {
    if (!text) return '';
    
    // Split by lines and process each line
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    const bulletPoints = lines
      .map(line => {
        // Remove markdown formatting (** and *)
        let cleaned = line
          .replace(/\*\*/g, '') // Remove **
          .replace(/\*/g, '')   // Remove *
          .trim();
        
        // Remove existing bullet points and clean up
        cleaned = cleaned.replace(/^[•\-*]\s*/, '').trim();
        
        return cleaned;
      })
      .filter(line => line.length > 0);
    
    // Return as HTML with proper bullet points and line breaks
    return bulletPoints
      .map(point => `• ${point}`)
      .join('<br>');
  }
}
