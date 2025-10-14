import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { Card } from '../../../../shared/components/card/card';
import { SkeletonLoader } from '../../../../shared/components/skeleton-loader';
import { 
  Clipboard, 
  AlertTriangle, 
  Users, 
  Briefcase, 
  DollarSign, 
  DoorOpen, 
  Shield 
} from '../../../../shared/icons/lucide-icons';

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
  imports: [CommonModule, TranslateModule, LucideAngularModule, Card, SkeletonLoader, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './summary-tab.component.html'
})
export class SummaryTabComponent {
  // Modern input signals
  summary = input<SummaryData | null>(null);
  isLoading = input<boolean>(false);
  perspectiveContext = input<PerspectiveContext | null>(null);

  // Icons
  ClipboardIcon = Clipboard;
  AlertTriangleIcon = AlertTriangle;
  UsersIcon = Users;
  BriefcaseIcon = Briefcase;
  DollarSignIcon = DollarSign;
  DoorOpenIcon = DoorOpen;
  ShieldIcon = Shield;
}
