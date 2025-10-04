import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { LanguageStore } from './language.store';
import { LANGUAGES, DEFAULT_LANGUAGE } from '../constants/languages';

describe('LanguageStore', () => {
  let store: LanguageStore;
  let translateService: jasmine.SpyObj<TranslateService>;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();

    const translateSpy = jasmine.createSpyObj('TranslateService', ['use', 'addLangs', 'setDefaultLang']);

    TestBed.configureTestingModule({
      providers: [
        LanguageStore,
        { provide: TranslateService, useValue: translateSpy }
      ]
    });

    store = TestBed.inject(LanguageStore);
    translateService = TestBed.inject(TranslateService) as jasmine.SpyObj<TranslateService>;
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create', () => {
    expect(store).toBeTruthy();
  });

  it('should initialize with default language when no saved preference', () => {
    expect(store.preferredLanguage()).toBe(DEFAULT_LANGUAGE);
  });

  it('should load saved language preference from localStorage', () => {
    // Save a language preference
    localStorage.setItem('contract-whisperer-language', LANGUAGES.FRENCH);
    
    // Create a new store instance to test initialization
    const newStore = TestBed.inject(LanguageStore);
    expect(newStore.preferredLanguage()).toBe(LANGUAGES.FRENCH);
  });

  it('should save language preference to localStorage when set', () => {
    store.setPreferredLanguage(LANGUAGES.SPANISH);
    
    expect(localStorage.getItem('contract-whisperer-language')).toBe(LANGUAGES.SPANISH);
    expect(translateService.use).toHaveBeenCalledWith(LANGUAGES.SPANISH);
  });

  it('should handle invalid language codes gracefully', () => {
    const consoleSpy = spyOn(console, 'warn');
    
    store.setPreferredLanguage('invalid-language');
    
    expect(consoleSpy).toHaveBeenCalledWith('Invalid language code: invalid-language');
    expect(localStorage.getItem('contract-whisperer-language')).toBeNull();
  });

  it('should apply RTL direction for RTL languages', () => {
    const documentSpy = spyOn(document.documentElement, 'setAttribute');
    
    store.setPreferredLanguage(LANGUAGES.ARABIC);
    
    expect(documentSpy).toHaveBeenCalledWith('dir', 'rtl');
  });

  it('should apply LTR direction for LTR languages', () => {
    const documentSpy = spyOn(document.documentElement, 'setAttribute');
    
    store.setPreferredLanguage(LANGUAGES.ENGLISH);
    
    expect(documentSpy).toHaveBeenCalledWith('dir', 'ltr');
  });

  it('should clear localStorage when reset', () => {
    // Set a language preference
    store.setPreferredLanguage(LANGUAGES.FRENCH);
    expect(localStorage.getItem('contract-whisperer-language')).toBe(LANGUAGES.FRENCH);
    
    // Reset the store
    store.reset();
    
    expect(localStorage.getItem('contract-whisperer-language')).toBeNull();
    expect(store.preferredLanguage()).toBe(DEFAULT_LANGUAGE);
  });

  it('should handle localStorage errors gracefully', () => {
    // Mock localStorage to throw an error
    spyOn(localStorage, 'getItem').and.throwError('localStorage error');
    const consoleSpy = spyOn(console, 'warn');
    
    // Create a new store instance
    const newStore = TestBed.inject(LanguageStore);
    
    // Should fallback to default language
    expect(newStore.preferredLanguage()).toBe(DEFAULT_LANGUAGE);
  });

  it('should detect RTL languages correctly', () => {
    expect(store.isRTL()).toBe(false); // Default is English (LTR)
    
    store.setPreferredLanguage(LANGUAGES.ARABIC);
    expect(store.isRTL()).toBe(true);
    
    store.setPreferredLanguage(LANGUAGES.HEBREW);
    expect(store.isRTL()).toBe(true);
    
    store.setPreferredLanguage(LANGUAGES.ENGLISH);
    expect(store.isRTL()).toBe(false);
  });
});
