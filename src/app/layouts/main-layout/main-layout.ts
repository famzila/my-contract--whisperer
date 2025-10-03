import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LanguageSelector } from '../../shared/components';

@Component({
  selector: 'app-main-layout',
  imports: [RouterModule, LanguageSelector],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayout {
  currentYear = new Date().getFullYear();
}
