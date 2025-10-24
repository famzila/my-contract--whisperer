/**
 * Language Store - NgRx SignalStore
 * Manages language preferences, detection, and translation state
 * Reference: https://ngrx.io/guide/signals/signal-store
 */
import { signalStore, withState, withComputed, withMethods, withHooks } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { patchState } from '@ngrx/signals';
import { TranslateService } from '@ngx-translate/core';
import { TranslatorService } from '../services/ai/translator.service';
import { LanguageDetectorService } from '../services/ai/language-detector.service';
import { LoggerService } from '../services/logger.service';
import { LANGUAGES, DEFAULT_LANGUAGE, isRTL, isAppLanguageSupported, isGeminiNanoSupported } from '../constants/languages';

/**
 * Supported languages for the app
 */
export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

/**
 * Translation cache entry
 */
interface TranslationCache {
  [key: string]: string; // key: `${text}-${targetLang}`, value: translated text
}

/**
 * Language store state
 */
interface LanguageState {
  // Detected contract language
  detectedContractLanguage: string | null;
  
  // User's preferred language for analysis
  preferredLanguage: string;
  
  // Available languages
  availableLanguages: Language[];
  
  // Translation states
  isTranslating: boolean;
  translationError: string | null;
  
  // Cache for translations (performance optimization)
  translationCache: TranslationCache;
  
  // Show language selector banner
  showLanguageBanner: boolean;
}

/**
 * Supported languages configuration
 */
const SUPPORTED_LANGUAGES: Language[] = [
  { code: LANGUAGES.ARABIC, name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: LANGUAGES.CHINESE, name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: LANGUAGES.ENGLISH, name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: LANGUAGES.FRENCH, name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: LANGUAGES.GERMAN, name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: LANGUAGES.JAPANESE, name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: LANGUAGES.SPANISH, name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
];

/**
 * LocalStorage key for language preference
 */
const LANGUAGE_STORAGE_KEY = 'contract-whisperer-language';

/**
 * Get saved language from localStorage
 */
function getSavedLanguage(): string {
  // try {
  //   const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  //   return saved && SUPPORTED_LANGUAGES.some(lang => lang.code === saved) ? saved : DEFAULT_LANGUAGE;
  // } catch {
  // }
  // Always return default English (until we fix RTL issues)
  return DEFAULT_LANGUAGE;
}

/**
 * Save language to localStorage
 */
function saveLanguage(languageCode: string): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, languageCode);
  } catch (error) {
      const logger = inject(LoggerService);
      logger.warn('Failed to save language preference to localStorage:', error);
  }
}

/**
 * Initial state
 */
const initialState: LanguageState = {
  detectedContractLanguage: null,
  preferredLanguage: getSavedLanguage(), // Load from localStorage
  availableLanguages: SUPPORTED_LANGUAGES,
  isTranslating: false,
  translationError: null,
  translationCache: {},
  showLanguageBanner: false,
};

/**
 * Language Store
 * Handles language detection, preference, and translation orchestration
 */
export const LanguageStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  
  // Computed values
  withComputed(({ detectedContractLanguage, preferredLanguage, availableLanguages }) => ({
    /**
     * Check if translation is needed
     */
    needsTranslation: computed(() => {
      const detected = detectedContractLanguage();
      const preferred = preferredLanguage();
      return detected && detected !== preferred;
    }),
    
    /**
     * Get detected language info
     */
    detectedLanguageInfo: computed(() => {
      const code = detectedContractLanguage();
      return availableLanguages().find(lang => lang.code === code) || null;
    }),
    
    /**
     * Get preferred language info
     */
    preferredLanguageInfo: computed(() => {
      const code = preferredLanguage();
      return availableLanguages().find(lang => lang.code === code) || null;
    }),
    
    /**
     * Check if current language is RTL (Right-to-Left)
     */
    isRTL: computed(() => {
      const code = preferredLanguage();
      return isRTL(code);
    }),
  })),
  
  // Methods
  withMethods((store, translatorService = inject(TranslatorService), translateService = inject(TranslateService), languageDetectorService = inject(LanguageDetectorService), logger = inject(LoggerService)) => ({
    /**
     * Detect contract language from text using Chrome Language Detector API
     */
    detectContractLanguage: async (contractText: string): Promise<string> => {
      try {
        // Use Chrome Language Detector API
        const detectedLang = await languageDetectorService.detect(contractText);
        const userLang = store.preferredLanguage();
        
        if (detectedLang) {
          const needsTranslation = detectedLang !== userLang;
          
          patchState(store, { 
            detectedContractLanguage: detectedLang,
            showLanguageBanner: needsTranslation,
          });
          
          logger.info(`🌍 [Language] Detected: ${detectedLang}${needsTranslation ? ` (user prefers ${userLang})` : ''}`);
          return detectedLang;
        }
        
        // Fallback if detection returns null
        logger.warn('⚠️ [Language] Detection returned null, using default');
        patchState(store, { 
          detectedContractLanguage: DEFAULT_LANGUAGE,
          showLanguageBanner: false,
        });
        return DEFAULT_LANGUAGE;
      } catch (error) {
        logger.error('❌ [Language] Detection error:', error);
        patchState(store, { 
          detectedContractLanguage: DEFAULT_LANGUAGE, // fallback to English
          showLanguageBanner: false,
        });
        return DEFAULT_LANGUAGE;
      }
    },
    
    /**
     * Check if a given language code is RTL (Right-to-Left)
     * This is a scalable method that can check any language, not just the current UI language
     * @param languageCode - The language code to check (e.g., 'ar', 'en', 'fr')
     * @returns true if the language is RTL, false otherwise
     */
    isRTLLanguage: (languageCode: string): boolean => {
      return isRTL(languageCode);
    },
    
    /**
     * Set user's preferred language
     */
    setPreferredLanguage: (languageCode: string) => {
      const isValid = store.availableLanguages().some(lang => lang.code === languageCode);
      
      if (!isValid) {
        logger.warn(`Invalid language code: ${languageCode}`);
        return;
      }
      
      patchState(store, { 
        preferredLanguage: languageCode,
        showLanguageBanner: false, // hide banner after selection
      });
      
      // Save to localStorage
      saveLanguage(languageCode);
      
      // Apply RTL if needed
      if (isRTL(languageCode)) {
        document.documentElement.setAttribute('dir', 'rtl');
      } else {
        document.documentElement.setAttribute('dir', 'ltr');
      }
      
      // Update translation service language
      translateService.use(languageCode);
      
      logger.info(`🗣️ Preferred language set to: ${languageCode} (saved to localStorage)`);
    },
    
    /**
     * Translate text to preferred language
     */
    translateText: async (text: string, sourceLanguage?: string): Promise<string> => {
      const targetLang = store.preferredLanguage();
      const sourceLang = sourceLanguage || store.detectedContractLanguage() || 'en';
      
      // No translation needed if same language
      if (sourceLang === targetLang) {
        return text;
      }
      
      // Check cache first
      const cacheKey = `${text.substring(0, 100)}-${targetLang}`;
      const cached = store.translationCache()[cacheKey];
      if (cached) {
        logger.info('📦 Using cached translation');
        return cached;
      }
      
      // Translate
      patchState(store, { isTranslating: true, translationError: null });
      
      try {
        const translated = await translatorService.translate(text, sourceLang, targetLang);
        
        // Cache the result
        patchState(store, { 
          translationCache: {
            ...store.translationCache(),
            [cacheKey]: translated,
          },
          isTranslating: false,
        });
        
        logger.info(`✅ Translation completed: ${sourceLang} → ${targetLang}`);
        return translated;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Translation failed';
        patchState(store, { 
          isTranslating: false,
          translationError: errorMsg,
        });
        
        logger.error('❌ Translation error:', errorMsg);
        
        // Return original text as fallback
        return text;
      }
    },
    
    /**
     * Translate multiple texts in batch (optimized)
     */
    translateBatch: async (texts: string[], sourceLanguage?: string): Promise<string[]> => {
      const targetLang = store.preferredLanguage();
      const sourceLang = sourceLanguage || store.detectedContractLanguage() || 'en';
      
      if (sourceLang === targetLang) {
        return texts;
      }
      
      patchState(store, { isTranslating: true, translationError: null });
      
      try {
        const translations = await Promise.all(
          texts.map(text => translatorService.translate(text, sourceLang, targetLang))
        );
        
        patchState(store, { isTranslating: false });
        logger.info(`✅ Batch translation completed: ${texts.length} items`);
        
        return translations;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Batch translation failed';
        patchState(store, { 
          isTranslating: false,
          translationError: errorMsg,
        });
        
        logger.error('❌ Batch translation error:', errorMsg);
        
        // Return original texts as fallback
        return texts;
      }
    },
    
    /**
     * Dismiss language banner
     */
    dismissLanguageBanner: () => {
      patchState(store, { showLanguageBanner: false });
    },
    
    /**
     * Clear translation cache
     */
    clearCache: () => {
      patchState(store, { translationCache: {} });
      logger.info('🗑️ Translation cache cleared');
    },
    
    /**
     * Get language by code
     */
    getLanguage: (code: string): Language | undefined => {
      return store.availableLanguages().find(lang => lang.code === code);
    },
    
    /**
     * Set analysis language and synchronize app UI language
     * CRITICAL: Ensures app UI language always matches analysis results language
     * 
     * @param languageCode - The language code for analysis
     * @returns The actual language that will be used (may fallback to English)
     */
    setAnalysisLanguage: (languageCode: string): string => {
      logger.info(`\n🌍 [Language Sync] Setting analysis language to: ${languageCode}`);
      
      // Check if language is supported for app UI
      if (isAppLanguageSupported(languageCode)) {
        logger.info(`✅ [Language Sync] ${languageCode} is supported for app UI`);
        
        // Switch app UI to this language
        translateService.use(languageCode);
        
        // Apply RTL if needed
        if (isRTL(languageCode)) {
          document.documentElement.setAttribute('dir', 'rtl');
        } else {
          document.documentElement.setAttribute('dir', 'ltr');
        }
                
        // Update language store
        patchState(store, { 
          preferredLanguage: languageCode,
          showLanguageBanner: false,
        });
        
        // Save to localStorage
        saveLanguage(languageCode);
        
        logger.info(`✅ [Language Sync] App UI switched to ${languageCode}\n`);
        return languageCode;
      } else {
        // Fallback to English
        logger.warn(`⚠️ [Language Sync] ${languageCode} not supported for app UI, falling back to English`);
        
        translateService.use(LANGUAGES.ENGLISH);
        
        patchState(store, { 
          preferredLanguage: LANGUAGES.ENGLISH,
          showLanguageBanner: false,
        });
        
        saveLanguage(LANGUAGES.ENGLISH);
        
        logger.info(`✅ [Language Sync] App UI set to English (fallback)\n`);
        return LANGUAGES.ENGLISH;
      }
    },
    
    /**
     * Check if translation is available between languages
     */
    async canTranslate(sourceLang: string, targetLang: string) {
      try {
        return await translatorService.canTranslate(sourceLang, targetLang);
      } catch (error) {
        logger.error('Failed to check translation availability', error);
        throw error;
      }
    },
    
    /**
     * Download language pack (requires user gesture)
     */
    async downloadLanguagePack(sourceLang: string, targetLang: string) {
      try {
        const capabilities = await translatorService.canTranslate(sourceLang, targetLang);
        
        if (capabilities.available === 'downloadable') {
          logger.info(`Downloading language pack: ${sourceLang} → ${targetLang}`);
          await translatorService.createTranslator({ 
            sourceLanguage: sourceLang, 
            targetLanguage: targetLang 
          });
          logger.info('Language pack downloaded successfully');
        }
        
        return capabilities;
      } catch (error) {
        logger.error(`Failed to download language pack: ${sourceLang} → ${targetLang}`, error);
        throw error;
      }
    },
    
    /**
     * Create translator session
     */
    async createTranslator(sourceLang: string, targetLang: string) {
      try {
        return await translatorService.createTranslator({
          sourceLanguage: sourceLang,
          targetLanguage: targetLang
        });
      } catch (error) {
        logger.error(`Failed to create translator: ${sourceLang} → ${targetLang}`, error);
        throw error;
      }
    },

    /**
     * Reset store to initial state
     */
    reset: () => {
      patchState(store, initialState);
      // Clear localStorage
      try {
        localStorage.removeItem(LANGUAGE_STORAGE_KEY);
      } catch (error) {
        logger.warn('Failed to clear language preference from localStorage:', error);
      }
    },
  })),
  
  // Lifecycle hooks
  withHooks({
    onDestroy(store) {
      // Cleanup translation cache if needed
      store.clearCache();
    }
  })
);

/**
 * Initialize the language store with saved language preference
 * This should be called when the app starts
 */
export function initializeLanguageStore(translateService: TranslateService): void {
  const savedLanguage = getSavedLanguage();
  // Set the initial language in TranslateService
  translateService.use(savedLanguage);
  
  // Apply RTL if needed
  if (isRTL(savedLanguage)) {
    document.documentElement.setAttribute('dir', 'rtl');
  } else {
    // remove dir attribute
    document.documentElement.removeAttribute('dir');
    // document.documentElement.setAttribute('dir', 'ltr');
  }
}

