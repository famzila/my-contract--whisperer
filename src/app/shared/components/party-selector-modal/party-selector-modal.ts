/**
 * Party Selector Modal Component
 * Allows user to select which party they represent in the contract
 */
import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import type { PartyDetectionResult, UserRole } from '../../../core/stores/onboarding.store';

interface PartyOption {
  value: UserRole;
  label: string;
  icon: string;
  description?: string;
}

@Component({
  selector: 'app-party-selector-modal',
  imports: [CommonModule, TranslateModule],
  templateUrl: './party-selector-modal.html',
  styleUrl: './party-selector-modal.css',
})
export class PartySelectorModal {
  // Inputs
  isOpen = input<boolean>(false);
  detectedParties = input<PartyDetectionResult | null>(null);
  
  // Outputs
  selectRole = output<UserRole>();
  close = output<void>();
  
  /**
   * Get party options based on detection confidence
   */
  partyOptions = computed(() => {
    const detected = this.detectedParties();
    
    if (!detected) {
      return this.getGenericOptions();
    }
    
    // High confidence: Show extracted party names
    if (detected.confidence === 'high' && detected.parties) {
      return [
        {
          value: 'party1' as UserRole,
          label: detected.parties.party1.name,
          icon: this.getIconForRole(detected.parties.party1.role),
          description: detected.parties.party1.role,
        },
        {
          value: 'party2' as UserRole,
          label: detected.parties.party2.name,
          icon: this.getIconForRole(detected.parties.party2.role),
          description: detected.parties.party2.role,
        },
        {
          value: 'both_views' as UserRole,
          label: 'Compare Both Perspectives',
          icon: '👀',
          description: 'See analysis from both parties\' viewpoints',
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
    this.close.emit();
  }
  
  /**
   * Get generic role options (when confidence is low)
   */
  private getGenericOptions(): PartyOption[] {
    return [
      {
        value: 'employer',
        label: 'Employer / Company',
        icon: '🏢',
        description: 'I\'m hiring or engaging services',
      },
      {
        value: 'employee',
        label: 'Employee / Worker',
        icon: '🧑‍💻',
        description: 'I\'m being hired for employment',
      },
      {
        value: 'client',
        label: 'Client',
        icon: '💼',
        description: 'I\'m hiring a contractor or service',
      },
      {
        value: 'contractor',
        label: 'Contractor / Freelancer',
        icon: '🔧',
        description: 'I\'m providing services',
      },
      {
        value: 'landlord',
        label: 'Landlord / Property Owner',
        icon: '🏠',
        description: 'I\'m renting out property',
      },
      {
        value: 'tenant',
        label: 'Tenant / Renter',
        icon: '🔑',
        description: 'I\'m renting property',
      },
      {
        value: 'both_views',
        label: 'Compare Both Perspectives',
        icon: '👀',
        description: 'See analysis from both parties\' viewpoints',
      },
    ];
  }
  
  /**
   * Get icon for role
   */
  private getIconForRole(role: string): string {
    const roleMap: Record<string, string> = {
      'Employer': '🏢',
      'Employee': '🧑‍💻',
      'Client': '💼',
      'Contractor': '🔧',
      'Landlord': '🏠',
      'Tenant': '🔑',
      'Partner': '🤝',
    };
    
    return roleMap[role] || '📄';
  }
}
