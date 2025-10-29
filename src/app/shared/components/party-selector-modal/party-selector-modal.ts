/**
 * Party Selector Modal Component
 * Allows user to select which party they represent in the contract
 */
import { Component, input, output, computed, inject } from '@angular/core';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LucideAngularModule, LucideIconData } from 'lucide-angular';
import { BaseModal, BaseModalConfig } from '../base-modal/base-modal';
import { 
  Building2, 
  User, 
  Briefcase, 
  Wrench, 
  Key, 
  Handshake, 
  FileText, 
  Sparkles, 
  Lightbulb, 
  Eye,
  X,
  Search,
  ChevronRight,
  House
} from '../../../shared/icons/lucide-icons';
import { Notice } from '../notice/notice';
import type { PartyDetectionResult, UserRole } from '../../../core/models/ai-analysis.model';
import { getRoleIcon, getRoleTranslationKey } from '../../../core/utils/role.util';

interface PartyOption {
  value: UserRole;
  label: string;
  icon: LucideIconData;
  description?: string;
}

interface PartySelectorData {
  detectedParties: PartyDetectionResult | null;
  isLoading?: boolean;
}

@Component({
  selector: 'app-party-selector-modal',
  imports: [TranslatePipe, LucideAngularModule, BaseModal, Notice],
  templateUrl: './party-selector-modal.html',
})
export class PartySelectorModal {
  private dialogRef = inject(DialogRef);
  private dialogData = inject<PartySelectorData>(DIALOG_DATA, { optional: true });
  private translate = inject(TranslateService);

  // Inputs
  detectedParties = input<PartyDetectionResult | null>(null);
  
  // Outputs
  selectRole = output<UserRole>();

  // Lucide icons
  readonly Building2Icon = Building2;
  readonly UserIcon = User;
  readonly BriefcaseIcon = Briefcase;
  readonly WrenchIcon = Wrench;
  readonly HouseIcon = House;
  readonly KeyIcon = Key;
  readonly HandshakeIcon = Handshake;
  readonly FileTextIcon = FileText;
  readonly SparklesIcon = Sparkles;
  readonly LightbulbIcon = Lightbulb;
  readonly EyeIcon = Eye;
  readonly XIcon = X;
  readonly SearchIcon = Search;
  readonly ChevronRightIcon = ChevronRight;

  // Computed properties for state management
  isLoading = computed(() => {
    return this.dialogData?.isLoading ?? false;
  });

  modalConfig = computed(() => {
    if (this.isLoading()) {
      return {
        titleKey: 'upload.analyzingParties',
        icon: this.SearchIcon,
        showFooter: false,
      } as BaseModalConfig;
    }
    
    return {
      titleKey: 'partySelector.title',
      icon: this.SparklesIcon,
      showFooter: false
    } as BaseModalConfig;
  });
  
  /**
   * Get party options based on detection confidence
   */
  partyOptions = computed(() => {
    // If loading, return empty array
    if (this.isLoading()) {
      return [];
    }

    // Use data from CDK Dialog if available, otherwise use input
    const detected = this.dialogData?.detectedParties || this.detectedParties();
    
    if (!detected) {
      return this.getGenericOptions();
    }
    
    // High confidence: Show extracted party names
    if (detected.confidence === 'high' && detected.parties) {
      return [
        {
          value: 'party1' as UserRole,
          label: detected.parties.party1.name,
          icon: this.getIconForRole(detected.parties.party1.role || 'Party 1'),
          description: this.translateRoleName(detected.parties.party1.role || 'Party 1'),
        },
        {
          value: 'party2' as UserRole,
          label: detected.parties.party2.name,
          icon: this.getIconForRole(detected.parties.party2.role || 'Party 2'),
          description: this.translateRoleName(detected.parties.party2.role || 'Party 2'),
        },
        {
          value: 'both_views' as UserRole,
          label: this.translate.instant('partySelector.bothPerspectives'),
          icon: this.EyeIcon,
          description: this.translate.instant('partySelector.seeBothViewpoints'),
        },
      ];
    }
    
    // Medium/Low confidence or multilateral: Show generic options
    return this.getGenericOptions();
  });
  
  /**
   * Handle role selection
   */
  onSelectRole(role: UserRole): void {
    this.selectRole.emit(role);
  }
  
  /**
   * Handle close
   */
  onClose(): void {
    this.dialogRef.close();
  }
  
  /**
   * Get generic role options (when confidence is low)
   */
  private getGenericOptions(): PartyOption[] {
    return [
      {
        value: 'employer',
        label: this.translate.instant('partySelector.employerCompany'),
        icon: this.Building2Icon,
        description: this.translate.instant('partySelector.hiringServices'),
      },
      {
        value: 'employee',
        label: this.translate.instant('partySelector.employeeWorker'),
        icon: this.UserIcon,
        description: this.translate.instant('partySelector.beingHired'),
      },
      {
        value: 'client',
        label: this.translate.instant('partySelector.client'),
        icon: this.BriefcaseIcon,
        description: this.translate.instant('partySelector.hiringContractor'),
      },
      {
        value: 'contractor',
        label: this.translate.instant('partySelector.contractorFreelancer'),
        icon: this.WrenchIcon,
        description: this.translate.instant('partySelector.providingServices'),
      },
      {
        value: 'landlord',
        label: this.translate.instant('partySelector.landlord'),
        icon: this.HouseIcon,
        description: this.translate.instant('partySelector.owningProperty'),
      },
      {
        value: 'tenant',
        label: this.translate.instant('partySelector.tenantRenter'),
        icon: this.KeyIcon,
        description: this.translate.instant('partySelector.rentingProperty'),
      },
      {
        value: 'both_views',
        label: this.translate.instant('partySelector.bothPerspectives'),
        icon: this.EyeIcon,
        description: this.translate.instant('partySelector.seeBothViewpoints'),
      },
    ];
  }
  
  /**
   * Translate role name from English to current language
   */
  private translateRoleName(role: string): string {
    if (!role) return role;
    
    const translationKey = getRoleTranslationKey(role);
    
    if (translationKey && translationKey !== role) {
      return this.translate.instant(translationKey);
    }
    
    // Debug logging to help identify issues
    const normalizedRole = role.trim();
    if (normalizedRole !== 'Party 1' && normalizedRole !== 'Party 2') {
      console.warn(`[PartySelector] Role not translated: "${role}" -> "${role}"`);
    }
    
    return role;
  }

  /**
   * Get icon for role
   */
  private getIconForRole(role: string): LucideIconData {
    return getRoleIcon(role) || this.FileTextIcon;
  }
}
