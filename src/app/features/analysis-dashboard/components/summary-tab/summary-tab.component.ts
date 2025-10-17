import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
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
  View
} from '../../../../shared/icons/lucide-icons';
import { Alert } from "../../../../shared/components/alert/alert";
import { TabHeader } from "../../../../shared/components/tab-header/tab-header";
import { Notice } from "../../../../shared/components/notice/notice";

// Use the actual ContractSummary type from the store
export interface SummaryData {
  parties?: string;
  role?: string;
  responsibilities?: string[];
  compensation?: {
    baseSalary?: number | null;
    bonus?: string | null;
    equity?: string | null;
    other?: string | null;
  };
  benefits?: string[];
  termination?: {
    atWill?: string | null;
    forCause?: string | null;
    severance?: string | null;
  };
  restrictions?: {
    confidentiality?: string | null;
    nonCompete?: string | null;
    nonSolicitation?: string | null;
    other?: string | null;
  };
}

export interface PerspectiveContext {
  icon: any;
  title: string;
  message: string;
}

@Component({
  selector: 'app-summary-tab',
  imports: [TranslateModule, LucideAngularModule, SkeletonLoader, DecimalPipe, Alert, TabHeader, Notice],
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
}
