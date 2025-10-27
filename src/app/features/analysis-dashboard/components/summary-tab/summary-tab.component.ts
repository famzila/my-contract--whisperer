import { Component, input, ChangeDetectionStrategy, computed } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
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
    const compensation = this.summary()?.summary?.compensation;
    const benefits = this.summary()?.summary?.benefits;
    
    return !!(
      compensation?.baseSalary ||
      compensation?.bonus ||
      compensation?.equity ||
      compensation?.other ||
      (benefits && benefits.length > 0)
    );
  });

  /**
   * Check if termination section has any data
   */
  hasTerminationData = computed(() => {
    const termination = this.summary()?.summary?.termination;
    
    return !!(
      termination?.atWill ||
      termination?.forCause ||
      termination?.severance ||
      termination?.noticeRequired
    );
  });

  /**
   * Check if restrictions section has any data
   */
  hasRestrictionsData = computed(() => {
    const restrictions = this.summary()?.summary?.restrictions;
    
    return !!(
      restrictions?.confidentiality ||
      restrictions?.nonCompete ||
      restrictions?.nonSolicitation ||
      restrictions?.intellectualProperty ||
      restrictions?.other
    );
  });
  
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


  
}
