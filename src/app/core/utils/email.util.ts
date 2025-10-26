/**
 * Email Utilities
 * Consolidated email-related utilities following Angular best practices
 * 
 * Pure functions: No dependencies, can be used anywhere
 */

// ============================================================================
// EMAIL GENERATION UTILITIES
// ============================================================================

/**
 * Generate mock email when Writer API is not available
 */
export function generateMockEmail(
  recipientName: string, 
  senderName: string,
  senderRole: string,
  recipientRole: string,
  questions: string[],
  contractLanguage: string = 'en'
): string {
  const questionsList = questions
    .slice(0, 5) // Limit to first 5 questions for readability
    .map((q, i) => `${i + 1}. ${q}`)
    .join('\n\n');
  
  // Context-aware opening based on roles
  const opening = getMockEmailOpening(senderRole, recipientRole, recipientName);
  
  // Generate language-specific email template
  const emailTemplate = getEmailTemplate(contractLanguage);
  
  return emailTemplate
    .replace('{{recipientName}}', recipientName)
    .replace('{{opening}}', opening)
    .replace('{{questionsList}}', questionsList)
    .replace('{{senderName}}', senderName);
}

/**
 * Get email template based on language
 */
function getEmailTemplate(language: string): string {
  const templates: Record<string, string> = {
    'en': `Subject: Clarification on Contract Agreement Terms

Dear {{recipientName}} Team,

{{opening}}

Before I proceed with signing, I would appreciate clarification on the following points to ensure I fully understand the terms:

{{questionsList}}

I believe having clarity on these matters will help ensure we are aligned and will contribute to a successful working relationship.

I look forward to your response and appreciate your time in addressing these questions.

Best regards,
{{senderName}}`,

    'es': `Asunto: Aclaración sobre los Términos del Contrato

Estimado Equipo de {{recipientName}},

{{opening}}

Antes de proceder con la firma, me gustaría aclarar los siguientes puntos para asegurarme de que entiendo completamente los términos:

{{questionsList}}

Creo que tener claridad sobre estos asuntos nos ayudará a estar alineados y contribuirá a una relación de trabajo exitosa.

Espero su respuesta y agradezco su tiempo para abordar estas preguntas.

Saludos cordiales,
{{senderName}}`,

    'fr': `Objet: Clarification sur les Termes du Contrat

Cher Équipe {{recipientName}},

{{opening}}

Avant de procéder à la signature, j'aimerais clarifier les points suivants pour m'assurer que je comprends pleinement les termes:

{{questionsList}}

Je crois qu'avoir de la clarté sur ces questions nous aidera à être alignés et contribuera à une relation de travail réussie.

J'attends votre réponse et j'apprécie votre temps pour répondre à ces questions.

Cordialement,
{{senderName}}`,

    'ar': `الموضوع: توضيح بشأن شروط العقد

عزيزي {{recipientName}}،

{{opening}}

قبل المتابعة مع التوقيع، أود توضيح النقاط التالية للتأكد من أنني أفهم الشروط بالكامل:

{{questionsList}}

أعتقد أن الوضوح حول هذه الأمور سيساعدنا على أن نكون متوافقين وسيساهم في علاقة عمل ناجحة.

أتطلع إلى ردكم وأقدر وقتكم في معالجة هذه الأسئلة.

مع أطيب التحيات،
{{senderName}}`,
  };

  // Fallback to English if language not supported
  return templates[language] || templates['en'];
}

/**
 * Get context-aware email opening based on roles
 */
export function getMockEmailOpening(senderRole: string, recipientRole: string, recipientName: string): string {
  const rolePair = `${senderRole.toLowerCase()}-${recipientRole.toLowerCase()}`;
  
  const openings: Record<string, string> = {
    'tenant-landlord': `Thank you for providing the lease agreement for the property. I have carefully reviewed the terms and am excited about the opportunity to rent from you.`,
    'landlord-tenant': `Thank you for your interest in the property. I have reviewed your application and would like to clarify a few terms in the lease agreement.`,
    'employee-employer': `Thank you for the employment offer at ${recipientName}. I am excited about the opportunity to join your team and have carefully reviewed the employment agreement.`,
    'employer-employee': `We are pleased to offer you a position with our organization. Before finalizing the agreement, I would like to clarify a few terms.`,
    'contractor-client': `Thank you for the opportunity to work on this project. I have reviewed the service agreement and would like to clarify a few points.`,
    'client-contractor': `We appreciate your proposal and are interested in moving forward. Before finalizing the agreement, I have a few questions about the terms.`,
  };
  
  return openings[rolePair] || `Thank you for the contract agreement. I have carefully reviewed the document and would like to clarify a few points.`;
}

// ============================================================================
// EMAIL API MAPPING UTILITIES
// ============================================================================

/**
 * Map user-friendly tone to Rewriter API tone
 */
export function mapToneToRewriterAPI(tone: 'formal' | 'neutral' | 'casual'): 'more-formal' | 'as-is' | 'more-casual' {
  switch (tone) {
    case 'formal':
      return 'more-formal';
    case 'neutral':
      return 'as-is';
    case 'casual':
      return 'more-casual';
  }
}

/**
 * Map user-friendly length to Rewriter API length
 */
export function mapLengthToRewriterAPI(length: 'short' | 'medium' | 'long'): 'shorter' | 'as-is' | 'longer' {
  switch (length) {
    case 'short':
      return 'shorter';
    case 'medium':
      return 'as-is';
    case 'long':
      return 'longer';
  }
}
