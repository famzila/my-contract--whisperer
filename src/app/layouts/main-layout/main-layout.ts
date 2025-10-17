import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterModule, Router, RouterLink, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { LanguageSelector } from '../../shared/components';
import { UiStore } from '../../core/stores/ui.store';
import { FileText, Bot, Shield, Menu } from '../../shared/icons/lucide-icons';

@Component({
  selector: 'app-main-layout',
  imports: [RouterLink, RouterOutlet, TranslatePipe, LucideAngularModule, LanguageSelector],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayout {
  private uiStore = inject(UiStore);
  
  // Lucide icons
  readonly FileTextIcon = FileText;
  readonly BotIcon = Bot;
  readonly ShieldIcon = Shield;
  readonly MenuIcon = Menu;
  
  currentYear = new Date().getFullYear();

  /**
   * Show how it works modal
   */
  showHowItWorks(): void {
    this.uiStore.openHowItWorks();
  }

  /**
   * Show privacy policy modal
   */
  showPrivacyPolicy(): void {
    this.uiStore.openPrivacyPolicy();
  }

  /**
   * Show terms of service modal
   */
  showTermsOfService(): void {
    this.uiStore.openTermsOfService();
  }
}
