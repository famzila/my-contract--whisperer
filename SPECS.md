# 📜 Contract Whisperer  
*AI-Powered Contract Companion (Chrome Extension + Web App)*

---

## 🌍 Overview  

**Contract Whisperer** is an AI-powered Chrome Extension + Web App designed to help users **understand, analyze, and interact with contracts** directly in their browser.  

It extracts key insights, identifies risks, explains complex legal jargon in plain language, and allows users to **chat with their contract** to ask specific questions.  

Built with **Chrome Built-in AI APIs** (Gemini Nano, Prompt API, Summarizer API, Translator API, Writer/Rewriter API), the solution works **locally, offline, and securely**, making it ideal for sensitive documents.  

---

## 🏆 Hackathon Fit  

- **Most Helpful (Extension + Web)** → Simplifies a painful process: understanding contracts.  
- **Best Multimodal AI Application** → Handles text + voice input/output.  
- **All AI processing is done locally** → using Chrome’s built-in AI APIs powered by Gemini Nano. This ensures privacy, offline functionality, and zero server cost.
- **Privacy-first** → AI runs client-side, no contract data leaves the user’s device.  
- **Scalable UX** → Lightweight popup for quick checks (extension), full interactive workspace (web).  

---

## ⚙️ Core Features  

### 1. 🔍 Smart Clause Extraction  
- Identifies important clauses:  
  - Termination  
  - Payment obligations  
  - Renewal/expiry  
  - Liability and indemnity  
  - Governing law  
  - Confidentiality  
- Visual highlights + plain language explanations.  
- **APIs**: Summarizer API + Prompt API.  

---

### 2. 📊 Risk & Obligation Dashboard  
- Color-coded trust/risk scoring.  
- Checklist of user’s obligations (e.g., "Pay within 30 days").  
- Alerts on missing/ambiguous clauses.  

---

### 3. 🗣️ Plain Language Summaries + Voice Playback  
- Converts legalese → everyday language.  
- Text-to-Speech playback in **English, Arabic, French, Darija**.  
- Perfect for accessibility and illiterate users.  
- **APIs**: Summarizer API + Translator API.  

---

### 4. ✏️ Rewrite & Suggest Improvements  
- Select a clause → “Rewrite more clearly” or “Suggest fairer terms.”  
- **APIs**: Writer API + Rewriter API.  

---

### 5. 🌐 Multi-Language Contracts  
- Detects contract language automatically.  
- Real-time translation of clauses/summaries.  
- **APIs**: Translator API.  

---

### 6. 💾 Local-First Privacy  
- All analysis runs on-device with Gemini Nano. 
- Contract data never leaves the device unless explicitly exported.  

---

### 7. 💬 Conversational Q&A with Contracts  
- Users can **chat with the contract** in natural language.  
- Example questions:  
  - “Does this contract auto-renew?”  
  - “What happens if I terminate early?”  
  - “Which clauses mention penalties?”  
- AI responds with **clause reference + plain explanation**.  
- Voice input supported for accessibility.  
- **APIs**: Prompt API + Summarizer API.  

---

## 🎨 UI/UX  

- **Chrome Extension Popup** → Minimalist, lightweight:  
  - Upload/Select contract.  
  - Quick analysis highlights.  
  - Chat tab for Q&A.  
- **Full Web App** → Rich dashboard:  
  - Risk scoring + obligations checklist.  
  - Clause-by-clause summaries.  
  - Voice-enabled Q&A chat.  
- Design principles:  
  - Clean, modern, **Tailwind CSS v4**.  
  - Clear typography for readability.  
  - Smooth micro-animations (Use built-in Angular animation's directives: https://angular.dev/guide/animations ).  

---

## 🛠️ Tech Stack  

- **Frontend**: Angular (zoneless, standalone components, TailwindCSS v4).  
- **Extension Packaging**: Lightweight Angular build → Chrome Extension (MV3).  
- **Web App**: Same Angular codebase
- **AI**:  
  - Chrome Built-in AI APIs (Nano, Summarizer, Translator, Prompt, Writer/Rewriter).  
  - Hybrid fallback (optional): Gemini 1.5 Pro (via Firebase Cloud Functions).  
- **Persistence**: LocalStorage (for 100% privacy)
- **Export**: PDF export.  

---

## 📅 The plan 

### 🔧 Development Environment Setup

**Before starting development, enable Chrome Built-in AI:**

1. **Use Chrome Canary or Dev Channel** (131+)
   - Download from: https://www.google.com/chrome/canary/

2. **Enable Gemini Nano Flags:**
   - Navigate to `chrome://flags/#optimization-guide-on-device-model`
   - Set to "Enabled BypassPerfRequirement"
   - Navigate to `chrome://flags/#prompt-api-for-gemini-nano`
   - Set to "Enabled"
   - Navigate to `chrome://flags/#summarization-api-for-gemini-nano`
   - Set to "Enabled"

3. **Restart Chrome** and wait for Gemini Nano to download

4. **Verify Installation:**
   - Open DevTools Console
   - Type: `await window.ai.languageModel.capabilities()`
   - Should return `{ available: "readily" }` (after model downloads)
   - Check download status: `chrome://on-device-internals`

5. **For Early Preview Program APIs:**
   - Join EPP: https://developer.chrome.com/docs/ai/built-in#join-the-epp
   - Access Prompt API and other experimental features

6. **Origin Trial Tokens (for production):**
   - Register at: https://developer.chrome.com/origintrials/
   - Add tokens to HTML `<meta>` tags or HTTP headers

---

### 🎯 Development Phases

This project will be built in **4 iterative phases** over **3 weeks**, focusing on core functionality first, then progressively adding advanced features. Each phase delivers a working, testable increment.

---

### **Phase 1: Foundation & Core Infrastructure** (Week 1 - Days 1-3)

#### 🎯 Goals
- Set up project architecture following Angular best practices
- Implement Chrome Built-in AI API wrappers
- Create basic contract input/upload functionality
- Build core UI shell with Tailwind CSS v4

#### 📦 Deliverables

**1.1 Project Architecture**
- Configure Angular workspace with zoneless API
- Install dependencies:
  - `@ngrx/signals` for state management
  - Tailwind CSS v4 for styling
- Set up Tailwind CSS v4 with design tokens
- Create modular folder structure:
  ```
  src/
  ├── app/
  │   ├── core/                    # Singleton services, guards, interceptors
  │   │   ├── services/
  │   │   │   ├── ai/             # Chrome AI API wrappers
  │   │   │   │   ├── prompt.service.ts
  │   │   │   │   ├── summarizer.service.ts
  │   │   │   │   ├── translator.service.ts
  │   │   │   │   ├── writer.service.ts
  │   │   │   │   └── ai-orchestrator.service.ts
  │   │   │   ├── storage/        # LocalStorage abstraction
  │   │   │   └── contract-parser.service.ts
  │   │   ├── stores/             # NgRx SignalStores
  │   │   │   ├── contract.store.ts
  │   │   │   ├── ui.store.ts
  │   │   │   └── chat.store.ts
  │   │   └── models/             # TypeScript interfaces & types
  │   ├── shared/                  # Reusable components, directives, pipes
  │   │   ├── components/
  │   │   │   ├── button/
  │   │   │   ├── card/
  │   │   │   ├── loading-spinner/
  │   │   │   └── modal/
  │   │   ├── directives/
  │   │   └── pipes/
  │   ├── features/                # Features components
  │   │   ├── contract-upload/
  │   │   ├── analysis-dashboard/
  │   │   ├── chat/
  │   │   ├── clause-viewer/
  │   │   └── settings/
  │   └── layouts/                 # Layout components
  │       ├── main-layout/
  │       └── extension-popup-layout/
  ```

**1.2 AI Service Layer**
- Create abstraction layer for Chrome Built-in AI APIs:
  - `PromptApiService` - Handles Q&A and clause extraction
  - `SummarizerApiService` - Contract summarization
  - `TranslatorApiService` - Multi-language support
  - `WriterApiService` - Clause rewriting
  - `AiOrchestratorService` - Coordinates AI operations
- Implement capability detection (check if APIs are available)
- Add fallback messaging when APIs unavailable
- Create TypeScript interfaces for AI responses

**⚠️ Important API Availability Notes:**
- **Prompt API**: Currently EPP-only, works in Chrome Extensions (Windows/macOS/Linux)
- **Other APIs**: Available via Origin Trials (Summarizer, Writer, Rewriter, Translator)
- **Gemini Nano**: Auto-downloads when enabled in `chrome://flags`
- **Development Setup**: Enable "Prompt API for Gemini Nano" and "Summarization API for Gemini Nano" in `chrome://flags/#optimization-guide-on-device-model`
- **Hybrid Strategy**: Implement server-side fallback for production (Firebase + Gemini API)

**1.3 Contract Input Module**
- File upload component (PDF, TXT, DOCX support)
- Text paste/input textarea
- Contract parsing service (extract text from various formats)
- Basic validation & error handling
- Loading states with shimmer effects

**1.4 UI Foundation**
- Install and configure Tailwind CSS v4 (doc: https://tailwindcss.com/docs/installation/framework-guides/angular )
- Create design system:
  - Color palette (primary, secondary, risk colors: red/yellow/green)
  - Typography scale
  - Spacing tokens
  - Animation utilities (don't use Angular animations module, it's deprecated, use native CSS with Angular built-in animations directives)
- Build layout components (header, sidebar, main content area)
- Responsive design (mobile-first approach)

#### ✅ Success Metrics
- [ ] AI services successfully detect and use Chrome APIs
- [ ] Users can upload/paste contract text
- [ ] Basic UI shell responsive on all screen sizes
- [ ] All TypeScript types properly defined (no `any` types)

---

### **Phase 2: Core Analysis Features** (Week 1-2 - Days 4-8)

#### 🎯 Goals
- Implement smart clause extraction
- Build risk & obligation dashboard
- Create plain language summaries
- Add basic accessibility features

#### 📦 Deliverables

**2.1 Smart Clause Extraction**
- Clause detection algorithm using Prompt API:
  - Termination clauses
  - Payment obligations
  - Renewal/expiry dates
  - Liability & indemnity
  - Governing law
  - Confidentiality agreements
- Visual highlighting in contract text
- Plain language explanations for each clause
- Confidence scoring (high/medium/low)

**2.2 Analysis Dashboard**
- Risk scoring visualization:
  - Color-coded risk indicators (🟥 High, 🟨 Medium, 🟩 Low)
  - Risk category breakdown chart
  - Overall contract health score
- Obligations checklist component:
  - Extracted action items
  - Due dates with countdown
  - Checkbox to mark as completed
  - Timeline view (chronological display)
- Missing/ambiguous clause alerts

**2.3 Summary Generation**
- Multi-level summaries using Summarizer API:
  - Executive summary (3-5 sentences)
  - Section-by-section breakdown
  - Key points extraction
- "Explain Like I'm 5" toggle for ultra-simple explanations
- Summary export functionality (copy to clipboard)

**2.4 State Management with NgRx SignalStore**
- Install `@ngrx/signals` package: `pnpm add @ngrx/signals`
- Create signal-based stores using official NgRx SignalStore pattern:
  - `ContractStore` - Current contract data, analysis results, loading states
  - `UiStore` - UI state (modals, toasts, theme)
  - `ChatStore` - Chat history and messages (for Phase 3)
- Use `withState()` for state definition
- Use `withComputed()` for derived states
- Use `withMethods()` for state mutations with `patchState()`
- All stores provided at root level: `{ providedIn: 'root' }`
- Reference: https://ngrx.io/guide/signals/signal-store

**2.5 Accessibility Foundation**
- Semantic HTML structure
- ARIA labels and roles
- Keyboard navigation support
- Focus management
- High contrast mode support

#### ✅ Success Metrics
- [ ] Successfully extracts 6+ clause types with 80%+ accuracy
- [ ] Risk dashboard displays meaningful insights
- [ ] Summaries are clear and concise
- [ ] All components accessible via keyboard
- [ ] State management reactive and performant

---

### **Phase 3: Advanced Features & Multimodal** (Week 2 - Days 9-14)

#### 🎯 Goals
- Implement conversational Q&A chat
- Add voice input/output capabilities
- Enable clause rewriting
- Multi-language support

#### 📦 Deliverables

**3.1 Conversational Q&A Chat**
- Chat interface component with message history
- Natural language query processing using Prompt API
- Context-aware responses with clause references
- Chat features:
  - Suggested questions based on contract content
  - Follow-up question suggestions
  - Export chat history
  - Clear conversation
- Streaming responses for better UX
- Citation system (highlight referenced clauses)

**3.2 Voice Features**
- Voice input (Speech Recognition API):
  - Microphone button in chat
  - Visual feedback (waveform animation)
  - Multi-language voice recognition
- Voice output (Text-to-Speech):
  - Play button for summaries and responses
  - Language selection (English, Arabic, French, Darija)
  - Playback controls (play, pause, stop, speed)
  - Auto-play option in settings

**3.3 Clause Rewriter**
- Select-to-rewrite functionality:
  - User highlights clause text
  - Context menu with options:
    - "Rewrite more clearly"
    - "Suggest fairer terms"
    - "Make more specific"
    - "Simplify language"
- Side-by-side comparison (original vs. rewritten)
- Accept/reject changes
- Export revised contract

**3.4 Multi-Language Support**
- Automatic language detection
- Real-time translation using Translator API
- Supported languages:
  - English
  - Arabic (right-to-left support)
  - French
  - More later
- Language switcher in header
- Preserve formatting in translations

**3.5 Advanced UI/Animations**
- Implement animations with native CSS :
  - Smooth page transitions
  - Clause highlight animations
  - Modal enter/exit animations
  - Loading state transitions
  - Risk score counting animation
- Micro-interactions:
  - Button hover effects
  - Card hover shadows
  - Tooltip animations
  - Success/error toast notifications

#### ✅ Success Metrics
- [ ] Chat responds accurately to contract questions
- [ ] Voice input/output works in 4 languages
- [ ] Clause rewriter produces improved text
- [ ] Translations maintain meaning and context
- [ ] Animations smooth and performant (60fps)

---

### **Phase 4: Chrome Extension & Polish** (Week 3 - Days 15-21)

#### 🎯 Goals
- Package as Chrome Extension (Manifest V3)
- Optimize performance
- Add export features
- Final polish and testing

#### 📦 Deliverables

**4.1 Chrome Extension Packaging**
- Create Manifest V3 configuration:
  ```json
  {
    "manifest_version": 3,
    "name": "Contract Whisperer",
    "version": "1.0.0",
    "description": "AI-powered contract analysis tool",
    "permissions": ["storage", "activeTab"],
    "action": {
      "default_popup": "index.html"
    },
    "background": {
      "service_worker": "background.js"
    },
    "content_security_policy": {
      "extension_pages": "script-src 'self'; object-src 'self'"
    }
  }
  ```
- Build configuration for extension:
  - Minimize bundle size
  - Inline critical CSS
  - Tree-shake unused code
- Extension-specific features:
  - Context menu (right-click to analyze selected text)
  - Browser action icon with badge (shows analysis status)
  - Options page for settings
- Test extension loading and functionality

**4.2 Web App Deployment**
- Configure production build
- Set up hosting (Firebase Hosting/Netlify/Vercel)
- Progressive Web App (PWA) features:
  - Service worker for offline support
  - App manifest
  - Install prompt
- SEO optimization

**4.3 Performance Optimization**
- Lazy load routes and heavy components
- Virtual scrolling for long contracts
- Implement caching strategy:
  - Cache analysis results in LocalStorage
  - Avoid re-analyzing same contract
- Code splitting by route
- Image optimization (if any)
- Bundle size analysis and reduction
- Lighthouse performance audit (target: 90+ score)

**4.4 Export & Sharing**
- PDF export with analysis highlights:
  - Include risk scores
  - Embedded summaries
  - Annotations and notes
- JSON export for data portability
- Print-friendly view

**4.5 Settings & Preferences**
- User preferences panel:
  - Default language
  - Voice settings (speed, pitch)
  - Theme selection (light/dark/auto)
  - Analysis depth (quick/detailed)
  - Privacy settings (enable/disable AI features - for later (out of MVP) when we fallback to Gemini)
- LocalStorage persistence
- Reset to defaults option

**4.6 Error Handling & Edge Cases**
- Comprehensive error boundaries
- Graceful degradation when AI APIs unavailable
- Offline detection and messaging
- Input validation and sanitization
- Rate limiting for API calls
- User-friendly error messages
- Recovery mechanisms

**4.7 Testing & Quality Assurance**
- Unit tests (Jasmine/Karma):
  - Service layer tests
  - Component tests
  - Pipe tests
  - 80%+ code coverage target
- E2E tests (Cypress/Playwright) - For later (out of MVP):
  - Contract upload flow
  - Analysis generation
  - Chat interaction
  - Export functionality
- Accessibility testing (axe-core) - For later (out of MVP):
- Cross-browser testing (Chrome, Edge, Brave)
- Performance testing
- Security audit

**4.8 Documentation**
- User guide (in-app):
  - Getting started tutorial
  - Feature walkthroughs
  - FAQs
  - Privacy policy
- Developer documentation:
  - Architecture overview
  - API documentation
  - Contributing guide
  - Deployment instructions
- Demo video (2-3 minutes):
  - Show key features
  - Highlight innovation
  - Demonstrate value proposition

**4.9 Final Polish**
- UI/UX review and refinement
- Consistency check (spacing, colors, typography)
- Copy review (clear, concise messaging)
- Loading states for all async operations
- Empty states with helpful guidance
- Success confirmations
- Micro-copy improvements
- Bug fixes from testing phase

#### ✅ Success Metrics
- [ ] Extension loads and works in Chrome
- [ ] Lighthouse score 90+ (performance, accessibility, best practices)
- [ ] All tests passing (unit)
- [ ] Zero critical bugs
- [ ] Documentation complete
- [ ] Demo video ready
- [ ] Bundle size < 500KB (gzipped)

---

### 🔧 Technical Implementation Notes

**Chrome Built-in AI API Integration Strategy:**
```typescript
// Check API availability with fallback
async function checkAICapabilities() {
  const capabilities = {
    prompt: await ai.languageModel.capabilities(),
    summarizer: await ai.summarizer.capabilities(),
    writer: await ai.writer.capabilities(),
    translator: await translation.canTranslate(),
  };
  
  return capabilities;
}
```

**State Management Pattern (NgRx SignalStore):**
```typescript
// Reference: https://ngrx.io/guide/signals/signal-store
import { signalStore, withState, withComputed, withMethods } from '@ngrx/signals';
import { computed } from '@angular/core';
import { patchState } from '@ngrx/signals';

// Define state shape
interface ContractState {
  contract: Contract | null;
  analysis: Analysis | null;
  loading: boolean;
  error: string | null;
}

const initialState: ContractState = {
  contract: null,
  analysis: null,
  loading: false,
  error: null,
};

// Create SignalStore with state, computed values, and methods
export const ContractStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  
  // Computed values derived from state
  withComputed(({ analysis }) => ({
    riskScore: computed(() => analysis()?.calculateRiskScore() ?? 0),
    hasHighRiskClauses: computed(() => {
      const score = analysis()?.calculateRiskScore() ?? 0;
      return score > 70;
    }),
    hasContract: computed(() => analysis() !== null),
  })),
  
  // Methods to update state
  withMethods((store) => ({
    setContract: (contract: Contract) => {
      patchState(store, { contract, loading: false, error: null });
    },
    setAnalysis: (analysis: Analysis) => {
      patchState(store, { analysis, loading: false, error: null });
    },
    setLoading: (loading: boolean) => {
      patchState(store, { loading });
    },
    setError: (error: string) => {
      patchState(store, { error, loading: false });
    },
    reset: () => {
      patchState(store, initialState);
    },
  }))
);

// Usage in component:
// contractStore = inject(ContractStore);
// contract = contractStore.contract(); // Read signal
// contractStore.setContract(newContract); // Update state
```

**Routing Strategy:**
```typescript
// Lazy-loaded routes
export const routes: Routes = [
  { path: '', redirectTo: '/upload', pathMatch: 'full' },
  { 
    path: 'upload', 
    loadComponent: () => import('./features/contract-upload/contract-upload.component')
  },
  { 
    path: 'analysis/:id', 
    loadComponent: () => import('./features/analysis-dashboard/analysis-dashboard.component')
  },
  { 
    path: 'chat/:id', 
    loadComponent: () => import('./features/chat/chat.component')
  },
];
```

---

### 📊 Project Timeline (3 Weeks)

| Week | Phase | Focus | Deliverables |
|------|-------|-------|--------------|
| **Week 1** | Phase 1 + 2 | Foundation + Core Features | AI services, Upload, Extraction, Dashboard |
| **Week 2** | Phase 3 | Advanced Features | Chat, Voice, Rewriter, Translations, Animations |
| **Week 3** | Phase 4 | Extension + Polish | Chrome Extension, Optimization, Testing, Docs |

---

### 🎯 Daily Standup Structure

**Each Day:**
1. **Morning (30min):** Review yesterday's progress, plan today's tasks
2. **Development (6-8hrs):** Implementation with frequent commits
3. **Testing (1hr):** Test new features, fix bugs
4. **Evening (30min):** Document progress, update plan if needed

**Key Milestones:**
- **Day 3:** Core infrastructure complete
- **Day 8:** Analysis features working
- **Day 14:** All features implemented
- **Day 21:** Launch-ready product

---

### 🚀 Launch Checklist

**Pre-Launch:**
- [ ] All features tested and working
- [ ] Performance optimized (Lighthouse 90+)
- [ ] Accessibility compliant (WCAG 2.1 AA)
- [ ] Security audit complete
- [ ] Browser extension published to Chrome Web Store
- [ ] Web app deployed and accessible
- [ ] Documentation complete
- [ ] Demo video produced
- [ ] Hackathon submission prepared

**Launch Day:**
- [ ] Submit to hackathon platform
- [ ] Share demo video
- [ ] Post on social media
- [ ] Gather initial feedback
- [ ] Monitor for critical issues

---

### 🔄 Post-Launch Iteration (Optional)

**Future Enhancements:**
- Multi-contract comparison tool
- Contract templates library
- Collaborative annotations
- Integration with DocuSign, HelloSign
- Mobile app (Ionic/Capacitor)
- Advanced analytics dashboard
- AI-powered negotiation suggestions
- Blockchain-based contract verification

---

## 🔑 Success Criteria  

- Works fully **offline** (Nano).  
- Delivers **clear value**: legal contracts made simple.  
- **Beautiful UI** → polished, Google-grade design.  
- **Innovative** → Conversational contract analysis + multimodal features.  
- **Scalable** → Extension for quick insights, Web App for deep analysis.  

---

## 🧠 **PERSPECTIVE-AWARE ANALYSIS STRATEGY** (NEW)

### **Problem Statement**
Traditional contract analysis assumes one perspective (usually the "weaker party" like employee, tenant). However:
- 🏢 **Employers** need to understand THEIR risks when hiring
- 🏠 **Landlords** need to know THEIR obligations in leases
- 💼 **Clients** need clarity on THEIR protections in service contracts

**Solution**: Smart, context-aware analysis that adapts to user's role.

---

### **🎯 Smart Onboarding Flow**

```
User Journey:
┌──────────────────────────────────────────┐
│ 1. UPLOAD CONTRACT                       │
└─────────────┬────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────┐
│ 2. CONTRACT VALIDATION                   │
│    AI checks: "Is this a contract?"      │
│    - Yes → Continue                      │
│    - No → Show friendly error            │
└─────────────┬────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────┐
│ 3. LANGUAGE DETECTION                    │
│    Detect contract language (EN/FR/AR)   │
└─────────────┬────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────┐
│ 4. LANGUAGE PREFERENCE MODAL             │
│    "Contract in EN, analyze in AR?"      │
│    User choice: Keep or change           │
└─────────────┬────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────┐
│ 5. PARTY DETECTION (NER + Rules)         │
│    Auto-extract party names & roles      │
└─────────────┬────────────────────────────┘
              │
         ┌────┴─────┐
         │          │
    HIGH CONF   LOW CONF
         │          │
         ▼          ▼
   ┌─────────┐  ┌──────────┐
   │ Show    │  │ Show     │
   │ Names   │  │ Generic  │
   │ + Both  │  │ Roles    │
   └────┬────┘  └─────┬────┘
        │             │
        └──────┬──────┘
               │
               ▼
┌──────────────────────────────────────────┐
│ 6. PARTY ROLE SELECTOR                   │
│    "Who are you in this contract?"       │
│    - 🏢 Acme Corp (Employer)             │
│    - 🧑‍💻 Jane Doe (Employee)             │
│    - 👀 Compare Both Perspectives        │
└─────────────┬────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────┐
│ 7. CONTEXT EXTRACTION (Auto)             │
│    - Jurisdiction (from contract)        │
│    - Cross-border detection              │
│    - Industry context                    │
└─────────────┬────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────┐
│ 8. PERSPECTIVE-AWARE ANALYSIS            │
│    AI analyzes with:                     │
│    - User's role context                 │
│    - Language preference                 │
│    - Jurisdiction awareness              │
└─────────────┬────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────┐
│ 9. SMART RESULTS DISPLAY                 │
│    - Analysis in preferred language      │
│    - Risks tailored to user's role       │
│    - Context-aware warnings              │
│    - [Show Original] for verification    │
└──────────────────────────────────────────┘
```

---

### **🤖 AI Techniques**

#### **1. Contract Validation (Is this a contract?)**
```typescript
Algorithm:
1. Use Prompt API to classify document type
2. Check for contract indicators:
   - Keywords: "agreement", "parties", "obligations", "termination"
   - Structure: Whereas clauses, signatures, dates
   - Legal language patterns
3. Return confidence score (0-100%)

If NOT a contract:
- Show friendly message: "This looks like a [essay/email/recipe]"
- Suggest contract types we support
- Don't analyze
```

#### **2. Party Detection (NER + Rule-Based)**
```typescript
Algorithm:
1. Named Entity Recognition (via Prompt API):
   - Extract organization names
   - Extract person names
   - Identify addresses
   
2. Relationship Inference:
   - Pattern matching: "Employer-Employee", "Landlord-Tenant"
   - Context clues: Job titles, property addresses
   - Contract type keywords
   
3. Confidence Scoring:
   - High (90%+): Clear parties, roles identified
   - Medium (60-89%): Parties found, roles unclear
   - Low (<60%): Complex/multi-party contract

Output:
{
  confidence: 'high',
  parties: {
    party1: { name: 'Acme Corp', role: 'Employer' },
    party2: { name: 'Jane Doe', role: 'Employee' }
  },
  contractType: 'bilateral' | 'multilateral'
}
```

#### **3. Context Extraction (Auto-detected)**
```typescript
Automatically extract without asking user:
- Jurisdiction: "California, USA" (from "Governing Law" clause)
- Party locations: From addresses
- Cross-border: party1Country !== party2Country
- Industry: Keywords (tech, healthcare, real estate)
- Contract date: Effective date
- Currency: USD, EUR, etc.

Use context for smart warnings:
- California non-compete → "Likely unenforceable"
- Cross-border → "Tax implications in both countries"
- Remote work → "Visa/work permit considerations"
```

#### **4. Perspective-Aware Prompts**
```typescript
Dynamic system prompts based on user role:

For EMPLOYER:
"Analyze from employer's perspective. Focus on:
- Employer's obligations & costs
- Employee performance commitments
- Termination rights for employer
- IP ownership protections
- Risks: Employee leaves with IP, litigation"

For EMPLOYEE:
"Analyze from employee's perspective. Focus on:
- Compensation fairness
- Job security (at-will vs. cause)
- Career restrictions (non-compete)
- Work-life balance
- Risks: Underpayment, sudden termination"

For BOTH VIEWS:
"Show dual perspectives:
- Party 1 risks vs Party 2 risks
- Party 1 obligations vs Party 2 obligations
- Fairness balance assessment"
```

---

### **🌍 Translation Strategy**

#### **Approach: Translate OUTPUT, Not Contract**

**Why This is Best**:
- ✅ Preserves legal accuracy (AI analyzes original)
- ✅ User gets results in their language
- ✅ Simple UX (one language shown)
- ✅ Fast (translate once after analysis)

**Implementation**:
```typescript
Flow:
1. Detect contract language: English
2. User selects: Arabic
3. AI analyzes in English (preserves legal nuance)
4. Translate analysis results to Arabic
5. Show results in Arabic
6. [Show Original] button → Expand to see English

Note: App language (header/buttons) ≠ Analysis language
- User sets app to Arabic → UI is RTL, Arabic nav
- But if they choose English analysis → Results in English
- Layout stays RTL (app preference)
```

**UI Pattern**:
```
┌──────────────────────────────────────┐
│ 🚨 RISK: At-Will Employment         │
│ ⚠️ High Severity                     │
│                                      │
│ [Arabic translation of analysis]     │
│                                      │
│ 💡 Analyzed from English, shown in  │
│ Arabic for clarity.                  │
│                                      │
│ [🔍 Show Original English] ←Click   │
└──────────────────────────────────────┘
```

---

### **📊 Enhanced JSON Schema**

```json
{
  "metadata": {
    "contractType": "Employment Agreement",
    "detectedLanguage": "en",
    "analyzedForRole": "employee",        // 👈 NEW
    "analyzedInLanguage": "ar",           // 👈 NEW
    "effectiveDate": "October 1, 2025",
    "endDate": "September 30, 2026",      // 👈 NEW (Contract expiration/termination date)
    "duration": "12 months",              // 👈 NEW (Human-readable duration)
    "autoRenew": false,                   // 👈 NEW (Critical for user awareness)
    "jurisdiction": "California, USA",
    "parties": {
      "party1": {
        "name": "Acme Technologies, Inc.",
        "role": "Employer",
        "location": "San Francisco, CA"
      },
      "party2": {
        "name": "Jane Doe",
        "role": "Employee",
        "location": "San Jose, CA"
      }
    },
    "context": {                          // 👈 NEW
      "isCrossBorder": false,
      "governingLaw": "Laws of California",
      "currency": "USD",
      "industryContext": "Technology"
    }
  },
  "summary": {
    "fromYourPerspective": "...",         // 👈 NEW: Role-specific
    "keyBenefits": [...],                 // 👈 What's GOOD for you
    "keyConcerns": [...],                 // 👈 What's RISKY for you
    "parties": "...",
    "role": "...",
    "compensation": {...}
  },
  "risks": [
    {
      "title": "At-Will Employment",
      "severity": "High",
      "impactOn": "employee",             // 👈 NEW: Who is affected
      "description": "You can be fired anytime",
      "contextWarning": null              // 👈 NEW: Jurisdiction-specific
    }
  ],
  "contextWarnings": [                    // 👈 NEW
    {
      "type": "cross-border",
      "severity": "High",
      "message": "Employee in France, Employer in US → conflicting labor laws"
    },
    {
      "type": "jurisdiction",
      "severity": "Medium",
      "message": "California law prohibits non-compete clauses"
    }
  ],
  "obligations": {
    "yours": [...],                       // 👈 Based on role
    "theirs": [...]                       // 👈 Other party
  }
}
```

---

### **🎯 IMPLEMENTATION ROADMAP (2 Weeks)**

#### **Week 1: Foundation (Days 1-7)**

**Day 1-2: Smart Onboarding Infrastructure**
- [ ] Create `OnboardingStore` (NgRx SignalStore)
  - State: `step`, `contractLanguage`, `userLanguage`, `userRole`, `parties`
- [ ] Implement contract validation service
  - `validateContract(text): Promise<boolean>`
  - Use Prompt API for classification
- [ ] Build non-contract error UI component
  - Friendly message with suggestions

**Day 3-4: Party Detection & NER**
- [ ] Implement party extraction algorithm
  - `extractParties(text): Promise<PartyDetectionResult>`
  - Use Prompt API for NER
  - Rule-based relationship inference
- [ ] Create party selector modal component
  - High confidence: Show extracted names
  - Low confidence: Show generic roles
  - Always include "Compare Both Views" option
- [ ] Integrate with onboarding flow

**Day 5-6: Perspective-Aware Analysis**
- [ ] Update `prompt.service.ts` with dynamic system prompts
  - `buildPerspectivePrompt(role: UserRole): string`
  - Different prompts for employer/employee/landlord/etc.
- [ ] Enhance analysis service to accept context
  - `analyzeContract(text, context: AnalysisContext)`
- [ ] Update JSON schema parsers for new fields

**Day 7: Context Extraction**
- [ ] Implement auto-context extraction
  - `extractContext(text): Promise<ContractContext>`
  - Jurisdiction, addresses, currency, industry
- [ ] Add context-aware warning system
  - Cross-border detection
  - Jurisdiction-specific rules (California non-compete)
- [ ] Display context warnings in UI

#### **Week 2: Translation & Polish (Days 8-14)**

**Day 8-9: Translation Implementation**
- [ ] Implement "Translate OUTPUT" strategy
  - Analyze in original language
  - Translate results to user preference
- [ ] Create expandable "Show Original" component
  - Click to see original text
  - Side-by-side comparison
- [ ] Add first-time user tooltip explaining approach

**Day 10-11: Language Independence**
- [ ] Separate app language from analysis language
  - App language → UI (header, buttons)
  - Analysis language → Content
- [ ] Fix RTL layout logic
  - App direction based on app language
  - Analysis content direction independent
- [ ] Test edge cases (Arabic app, English analysis)

**Day 12: Integration & Testing**
- [ ] Connect all onboarding steps in sequence
- [ ] Test full flow: Upload → Validate → Detect → Select → Analyze
- [ ] Handle error cases gracefully
- [ ] Performance optimization (caching, lazy loading)

**Day 13: UI/UX Polish**
- [ ] Smooth animations between onboarding steps
- [ ] Loading states for each phase
- [ ] Progress indicator (Step X of 6)
- [ ] Skip options where appropriate
- [ ] Accessibility review (keyboard nav, ARIA)

**Day 14: Documentation & Demo**
- [ ] Update user guide with new flow
- [ ] Create demo video showing:
  - Upload contract
  - Auto-detection (language, parties)
  - Role selection
  - Perspective-aware results
  - Translation verification
- [ ] Final bug fixes

---

### **✅ Success Metrics**

**Contract Validation**:
- [ ] 95%+ accuracy in contract detection
- [ ] Clear, friendly error messages for non-contracts

**Party Detection**:
- [ ] 85%+ accuracy in party extraction
- [ ] Smart fallback to generic roles when uncertain

**Perspective Analysis**:
- [ ] Analysis clearly tailored to selected role
- [ ] Risks/obligations match user's perspective
- [ ] "Both views" comparison is balanced

**Translation**:
- [ ] Original legal text preserved
- [ ] Analysis readable in user's language
- [ ] "Show Original" works for verification

**User Experience**:
- [ ] Onboarding takes <60 seconds
- [ ] Each step is clear and purposeful
- [ ] No unnecessary friction
- [ ] Users feel app "understands them"

---

### **🔮 Post-MVP Enhancements**

**Phase 2 (After Hackathon)**:
- [ ] Voice input for party role selection
- [ ] Machine learning for party detection (improve accuracy)
- [ ] Jurisdiction rules database (20+ countries)
- [ ] Industry-specific analysis templates
- [ ] Multi-contract comparison (employer comparing offers)
- [ ] Negotiation suggestions based on perspective
- [ ] Cultural context warnings (US vs. EU labor norms)

---

## 📝 **API NOTES**

**Rewriter vs Writer API Tone Values**:
- **Rewriter API**: `'more-formal'` | `'as-is'` | `'more-casual'`
- **Writer API**: `'formal'` | `'neutral'` | `'casual'`

**Mapping Strategy**:
```typescript
// When calling Rewriter
tone: 'formal' → 'more-formal'
tone: 'neutral' → 'as-is'
tone: 'casual' → 'more-casual'

// When calling Writer
Use: 'formal' | 'neutral' | 'casual' directly
```

---

## 🎯 **CURRENT FOCUS**

**Next Implementation**: Start Week 1, Day 1-2
1. Create OnboardingStore
2. Implement contract validation
3. Build non-contract error UI

**Estimated Time**: 3-4 hours

Ready to begin! 🚀