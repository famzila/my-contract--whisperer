/**
 * Obligation Mapper Utility
 * Maps party1/party2 obligations to perspective-based view (yours/theirs)
 * 
 * Following Angular best practices:
 * - Pure functions for transformation logic
 * - Clear separation of concerns
 * - Type-safe with explicit interfaces
 */

import { ContractMetadata, Obligations, StructuredObligation } from '../schemas/analysis-schemas';

/**
 * Perspective-based obligations interface
 * Transforms generic party1/party2 into user-centric yours/theirs
 */
export interface PerspectiveObligations {
  yours: StructuredObligation[];
  theirs: StructuredObligation[];
  yourPartyName: string;
  theirPartyName: string;
  yourPartyRole: string;
  theirPartyRole: string;
}

/**
 * Map party1/party2 obligations to perspective-based view
 * 
 * @param obligations - Raw obligations with party1/party2 structure
 * @param metadata - Contract metadata containing party information
 * @param selectedRole - User's selected role (e.g., 'employee', 'tenant')
 * @returns Perspective-based obligations (yours/theirs)
 * 
 * @example
 * const perspective = mapObligationsToPerspective(
 *   obligations,
 *   metadata,
 *   'employee'
 * );
 * // Returns { yours: [...], theirs: [...], yourPartyName: 'John Doe', ... }
 */
export function mapObligationsToPerspective(
  obligations: Obligations,
  metadata: ContractMetadata,
  selectedRole: string | null
): PerspectiveObligations {
  const party1 = metadata.parties.party1;
  const party2 = metadata.parties.party2;
  // Determine which party the user is viewing as
  // Compare selected role with party roles (case-insensitive)
  const isViewingAsParty1 = selectedRole?.toLowerCase() === party1.role?.toLowerCase();
  
  
  const result = {
    yours: isViewingAsParty1 ? obligations.party1 : obligations.party2,
    theirs: isViewingAsParty1 ? obligations.party2 : obligations.party1,
    yourPartyName: isViewingAsParty1 ? party1.name : party2.name,
    theirPartyName: isViewingAsParty1 ? party2.name : party1.name,
    yourPartyRole: isViewingAsParty1 ? (party1.role || 'Party 1') : (party2.role || 'Party 2'),
    theirPartyRole: isViewingAsParty1 ? (party2.role || 'Party 2') : (party1.role || 'Party 1'),
  };
    
  return result;
}

