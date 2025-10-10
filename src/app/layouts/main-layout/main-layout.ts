import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterModule, Router, RouterLink, RouterOutlet } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { LanguageSelector } from '../../shared/components';
import { HowItWorksModal } from '../../shared/components/how-it-works-modal/how-it-works-modal';
import { PrivacyPolicyModal } from '../../shared/components/privacy-policy-modal/privacy-policy-modal';
import { TermsOfServiceModal } from '../../shared/components/terms-of-service-modal/terms-of-service-modal';
import { FileText, Bot, Shield, Menu } from '../../shared/icons/lucide-icons';

@Component({
  selector: 'app-main-layout',
  imports: [RouterLink, RouterOutlet, TranslateModule, LucideAngularModule, LanguageSelector, HowItWorksModal, PrivacyPolicyModal, TermsOfServiceModal],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayout {
  currentYear = new Date().getFullYear();
  
  // Lucide icons
  readonly FileTextIcon = FileText;
  readonly BotIcon = Bot;
  readonly ShieldIcon = Shield;
  readonly MenuIcon = Menu;

  // Modal states
  showHowItWorksModal = signal(false);
  showPrivacyPolicyModal = signal(false);
  showTermsOfServiceModal = signal(false);

  constructor(private router: Router) {}

  /**
   * Show how it works modal
   */
  showHowItWorks(): void {
    this.showHowItWorksModal.set(true);
  }

  /**
   * Close how it works modal
   */
  closeHowItWorksModal(): void {
    this.showHowItWorksModal.set(false);
  }

  /**
   * Show privacy policy modal
   */
  showPrivacyPolicy(): void {
    this.showPrivacyPolicyModal.set(true);
  }

  /**
   * Close privacy policy modal
   */
  closePrivacyPolicyModal(): void {
    this.showPrivacyPolicyModal.set(false);
  }

  /**
   * Show terms of service modal
   */
  showTermsOfService(): void {
    this.showTermsOfServiceModal.set(true);
  }

  /**
   * Close terms of service modal
   */
  closeTermsOfServiceModal(): void {
    this.showTermsOfServiceModal.set(false);
  }
}
