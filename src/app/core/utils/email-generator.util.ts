/**
 * Email Generator Utilities
 * Professional email generation for contract negotiations
 */

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
  
  return `Subject: Clarification on Contract Agreement Terms

Dear ${recipientName} Team,

${opening}

Before I proceed with signing, I would appreciate clarification on the following points to ensure I fully understand the terms:

${questionsList}

I believe having clarity on these matters will help ensure we are aligned and will contribute to a successful working relationship.

I look forward to your response and appreciate your time in addressing these questions.

Best regards,
${senderName}`;
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
