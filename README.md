#  📜 My Contract Whisperer
## *AI-Powered Contract Analysis That Works Completely Offline*

<div align="center">

**Transform complex legal documents into clear, actionable insights—all processed locally on your device Chrome's revolutionary built-in AI.**

[![Built with Angular](https://img.shields.io/badge/Angular-20.2-red?style=flat&logo=angular)](https://angular.dev)
[![Chrome AI APIs](https://img.shields.io/badge/Chrome%20AI-Gemini%20Nano-blue?style=flat&logo=googlechrome)](https://developer.chrome.com/docs/ai)
[![Privacy First](https://img.shields.io/badge/Privacy-100%25%20Local-green?style=flat)](https://developer.chrome.com/docs/ai/built-in)
[![MIT License](https://img.shields.io/badge/License-MIT-yellow?style=flat)](LICENSE)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-Try%20Now-brightgreen?style=flat)](https://my-contract-whisperer.com/)

</div>

### 🎥 **Demo Video**

<!-- Add your demo video here -->
<div align="center">

[![Watch the Demo](https://img.youtube.com/vi/VIDEO_ID_HERE/maxresdefault.jpg)](https://youtu.be/XUv_oC2fmj0?si=_Fv-1-x9PaDjkWzL)

*Click the image above to watch the full demo video*

</div>

---

## 🌟 **Why Contract Whisperer Stands Out**

My Contract Whisperer is a **groundbreaking AI-powered application** that leverages **Chrome's cutting-edge Built-in AI APIs** to analyze contracts **100% locally and offline**. Unlike traditional solutions that send sensitive documents to remote servers, every AI operation—from summarization to translation—happens **directly on your device** using the powerful Google's Gemini Nano model.

### **🎯 The Problem We Solve**

Legal contracts are complex, intimidating, and full of jargon that most people can't understand. Traditional contract analysis requires expensive lawyers or risky cloud-based AI services that compromise privacy. Many people sign contracts without truly understanding what they're agreeing to.

### **💡 Our Solution**

Contract Whisperer brings enterprise-grade contract analysis to everyone, powered entirely by **Chrome's revolutionary Built-in AI APIs**. Process contracts offline, maintain complete privacy, and get instant insights—no internet required after initial setup.

---

## 🚀 **Key Innovations**

### **1. Fully Offline AI Processing**
- ✅ **Zero server costs** - All AI runs on-device using Gemini Nano
- ✅ **Complete privacy** - Your contracts never leave your device
- ✅ **Works anywhere** - Analyze contracts even without internet connection
- ✅ **Enterprise security** - No data transmission, no cloud storage

### **2. Chrome Built-in AI API Integration**
Contract Whisperer leverages **6 powerful Chrome AI APIs** powered by Gemini Nano working in harmony:

| API | Purpose | Usage in Contract Whisperer |
|-----|---------|---------------------------|
| **💬 Prompt API** | Advanced contract analysis | Extracts risks, omissions, obligations, and questions from contracts |
| **📝 Summarizer API** | Contract summarization | Generates the "Quick Take" summary in the Summary tab |
| **🌍 Translator API** | Multi-language support | Translates analysis results across multiple languages in real-time |
| **✏️ Writer/Rewriter API** | Professional email generation | Drafts professional emails with suggested questions. Rewriter API allows customization of tone and length |
| **🔍 Language Detector API** | Contract language detection | Detects contract language and compares with user's preferred language |

> **Note**: All APIs are powered by Gemini Nano, running entirely on-device with zero cloud dependency.

### **3. Advanced Features**

#### 📊 **Intelligent Risk Analysis**
- Color-coded risk scoring (High/Medium/Low) extracted using Prompt API - [View Risk Analysis Screenshot](public/screenshots/risks.png)
- Missing clause detection (Omissions tab) - [View Omissions Screenshot](public/screenshots/omissions.png)
- Obligations tab with perspective-based filtering - [View Obligations Screenshot](public/screenshots/obligations.png)
- Liability and indemnity analysis
- Termination condition extraction
- All analysis powered by Prompt API for comprehensive contract parsing

#### 🎯 **Perspective-Based Analysis**
- **Party-specific insights**: View obligations from your perspective (employee, employer, tenant, etc.)
- **Dual-perspective mode**: See both parties' obligations side-by-side
- **Smart role detection**: Automatically identifies parties from contract text - [View Parties Detection Screenshot](public/screenshots/parties-detection.png)

#### 🌐 **Multi-Language Support**
- Automatic language detection using Language Detector API
- Compares contract language with user's preferred language - [View Language Mismatch Detection Screenshot](public/screenshots/language-mismatch-detection.png)
- Support for multiple languages (English, Arabic, French, Spanish, German, Japanese, Chinese, Korean, and more)
- Real-time translation of analysis results using Translator API
- RTL (Right-to-Left) layout support for Arabic

#### 📋 **Smart Question Generation**
- Automatically generates relevant questions to ask about the contract - [View Questions Screenshot](public/screenshots/questions.png)
- Professional email drafting with suggested questions - [View Questions Drafting Screenshot](public/screenshots/questions-drafting.png)
- Context-aware questions based on contract content and user perspective
- Summary tab with comprehensive contract overview - [View Summary Screenshot](public/screenshots/summary.png)

#### ✏️ **Email Drafting & Communication**
- Generate professional emails with suggested questions for contract negotiation - [View Email Screenshot](public/screenshots/email.png)
- Automatically drafts questions based on detected omissions and risks
- Customize email tone (formal, friendly, assertive) using Rewriter API - [View Email Rewriting Screenshot](public/screenshots/rewrite-email.png)
- Adjust email length (concise, detailed) to match your communication style
- Helps users communicate effectively with contract providers

---

## 🏗️ **Technical Architecture**

### **Modern Tech Stack**

```typescript
Frontend Framework:    Angular 20.2 (Standalone Components, Signals, Zoneless)
State Management:      Signal-based Store
Styling:              Tailwind CSS v4
AI Engine:            Chrome Built-in AI APIs (powered by Gemini Nano)
Service Worker:       Angular Service Worker (Offline Support)
```

### **Core Services Architecture**

```
┌────────────────────────────────────────────────────────┐
│              Contract Whisperer Architecture           │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────────┐    ┌──────────────┐                  │
│  │  UI Layer    │───▶│  Store Layer │                  │
│  │  (Angular)   │    │ (NgRx Signals)│                 │
│  └──────────────┘    └──────────────┘                  │
│         │                    │                         │
│         │                    ▼                         │
│         │         ┌──────────────────────┐             │
│         │         │  Service Layer       │             │
│         │         │  - Contract Parser   │             │
│         │         │  - AI Orchestrator   │             │
│         │         │  - Translation Cache │             │
│         │         └──────────────────────┘             │
│         │                    │                         │
│         │                    ▼                         │
│         │    ┌──────────────────────────────┐          │
│         │    │   Chrome Built-in AI APIs    │          │
│         └───▶│  - Prompt API (Risks,        │          │
│              │    Obligations, Omissions,..)│          │
│              │  - Summarizer API            │          │
│              │    (Quick Take Summary)      │          │
│              │  - Translator API            │          │
│              │  - Writer/Rewriter API       │          │
│              │    (Email Drafting)          │          │
│              │  - Language Detector API     │          │
│              └──────────────────────────────┘          │
│                                                        │
│  All processing happens locally on-device              │
│  No external API calls, complete privacy               │
└────────────────────────────────────────────────────────┘
```

### **Smart Progressive Loading**
- **Streaming Analysis**: Get results incrementally as AI processes the contract
- **Caching Strategy**: Translated results cached locally for instant switching and improved performance
- **Error Recovery**: Automatic retry with exponential backoff
- **Optimistic UI**: Immediate feedback while processing in background

### **Intuitive Interface**
- 🎯 **Progressive disclosure** - Information revealed as needed
- ⚡ **Instant feedback** - Real-time loading states and animations - [View Model Download Screenshot](public/screenshots/model-download.jpeg)
- 📊 **Visual insights** - Color-coded risks, interactive dashboards
- 🗂️ **Tabbed navigation** - Summary, Risks, Obligations, Omissions, Questions

---

## 📦 **Getting Started**

### **Prerequisites**
- Chrome 141+ (or Chrome Canary/Dev Channel)
- Node.js 20+ and pnpm

> **Note**: Chrome Built-in AI features are automatically enabled via origin trial tokens—no manual configuration needed!
> 
> **System Requirements**: If Chrome AI is not available on your system, Contract Whisperer will display a helpful requirements notice with detailed system specifications (Chrome version, storage, GPU/CPU requirements, OS compatibility). [View AI Not Supported Screenshot](public/screenshots/ai-not-supported.png)

### **Installation & Development**

```bash
# Clone the repository
git clone https://github.com/famzila/my-contract--whisperer.git
cd my-contract-whisperer

# Install dependencies
pnpm install

# Start development server
pnpm start

# Build for production
pnpm run build --configuration production
```

> **📸 Screenshots**: All screenshots referenced in this README are located in the `public/screenshots/` directory. Check out the screenshots below for a visual overview of key features:

### 📷 **Feature Screenshots**

| Feature | Screenshot Link | Description |
|---------|----------------|-------------|
| **Summary** | [View Screenshot](public/screenshots/summary.png) | Comprehensive contract overview with key details |
| **Risk Analysis** | [View Screenshot](public/screenshots/risks.png) | Color-coded risk assessment (High/Medium/Low) |
| **Obligations** | [View Screenshot](public/screenshots/obligations.png) | Party-specific obligations and responsibilities |
| **Omissions** | [View Screenshot](public/screenshots/omissions.png) | Missing clauses and potential contract gaps |
| **Questions** | [View Screenshot](public/screenshots/questions.png) | AI-generated questions for contract negotiation |
| **Questions Drafting** | [View Screenshot](public/screenshots/questions-drafting.png) | Interactive question selection and customization |
| **Parties Detection** | [View Screenshot](public/screenshots/parties-detection.png) | Automatic identification of contract parties |
| **Language Mismatch** | [View Screenshot](public/screenshots/language-mismatch-detection.png) | Detection when contract language differs from user preference |
| **Email Drafting** | [View Screenshot](public/screenshots/email.png) | Professional email generation with suggested questions |
| **Email Rewriting** | [View Screenshot](public/screenshots/rewrite-email.png) | Customize email tone and length with Rewriter API |
| **Model Download** | [View Screenshot](public/screenshots/model-download.jpeg) | First-time model download progress indicator |
| **AI Not Supported** | [View Screenshot](public/screenshots/ai-not-supported.png) | System requirements notice when Chrome AI is not available |

### **Try It Live**

🌐 **Live Demo**: [https://my-contract-whisperer.com/](https://my-contract-whisperer.com/)

Experience Contract Whisperer with full offline AI capabilities powered by Chrome Built-in AI APIs!

---

## 🔒 **Privacy & Security**

- ✅ **100% Local Processing** - All AI operations run on-device
- ✅ **No Data Transmission** - Contracts never sent to external servers
- ✅ **Offline Capable** - Full functionality without internet (first time requires internet to load the model)
- ✅ **No Tracking** - Zero analytics or user tracking
- ✅ **Open Source** - Transparent codebase (MIT License)

---

## 🎯 **Use Cases**

- 📄 **Employment Contracts** - Understand your rights and obligations
- 🏠 **Rental Agreements** - Identify hidden clauses and risks
- 💼 **Freelance Contracts** - Negotiate better terms
- 📋 **Service Agreements** - Verify what you're signing
- 🌐 **Multi-language Contracts** - Analyze contracts in a wide range of languages with automatic translation

---

## ℹ️ **Additional Resources**

Contract Whisperer includes comprehensive resources to help you get the most out of the application:

- 📖 **How It Works** - Step-by-step guide explaining how Contract Whisperer analyzes your contracts using Chrome's Built-in AI
- 🔒 **Privacy Policy** - Detailed information about how we protect your privacy and ensure your contracts remain completely private
- ❓ **FAQ (Frequently Asked Questions)** - Answers to common questions about features, compatibility, and usage
- 📄 **Sample Contracts** - Try the app with pre-loaded sample contracts to see how it works before uploading your own
- 📜 **Terms of Service** - Legal terms and conditions for using Contract Whisperer
- 📧 **Contact Us** - Get in touch with our team for support, feedback, or questions

All these resources are accessible directly from within the application, ensuring you have all the information you need right at your fingertips.

---

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ using Chrome Built-in AI APIs**

*Empowering everyone to understand their contracts—privately, securely, and completely offline.*

</div>
