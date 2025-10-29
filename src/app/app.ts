import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { LANGUAGES } from './core/config/application.config';
import { OfflineIndicatorComponent } from "./shared/components";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, OfflineIndicatorComponent],
  templateUrl: './app.html'
})
export class App {
  protected readonly title = signal('my-contract-whisperer');
  private translate = inject(TranslateService);

  constructor() {
    // Add all available languages
    this.translate.addLangs([
      LANGUAGES.ENGLISH,
      LANGUAGES.FRENCH,
      LANGUAGES.SPANISH,
      LANGUAGES.ARABIC,
      LANGUAGES.GERMAN,
      LANGUAGES.JAPANESE,
      LANGUAGES.CHINESE
    ]);
    
  }
}
