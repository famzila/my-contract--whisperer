import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { LANGUAGES, DEFAULT_LANGUAGE } from './core/constants/languages';
import { initializeLanguageStore } from './core/stores/language.store';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
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
    
    // Initialize language from localStorage
    initializeLanguageStore(this.translate);
  }
}
