import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { LanguageSelector } from '../../shared/components';
import { FileText, Bot, Shield, Menu } from '../../shared/icons/lucide-icons';

@Component({
  selector: 'app-main-layout',
  imports: [RouterModule, TranslateModule, LucideAngularModule, LanguageSelector],
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
}
