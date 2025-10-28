/**
 * Role Utility Functions
 * Pure utility functions for role mapping and translation utilities
 */

import { 
  Building2, 
  User, 
  Briefcase, 
  Wrench, 
  Home, 
  Key, 
  Handshake 
} from '../../shared/icons/lucide-icons';

/**
 * Role mapping configuration
 */
const ROLE_CONFIG = {
  // Role names as they come from AI analysis
  ROLES: {
    EMPLOYER: 'Employer',
    EMPLOYEE: 'Employee',
    CLIENT: 'Client',
    CONTRACTOR: 'Contractor',
    LANDLORD: 'Landlord',
    TENANT: 'Tenant',
    PARTNER: 'Partner',
    LESSOR: 'Lessor',
    LESSEE: 'Lessee',
  } as const,

  // Translation keys for roles
  TRANSLATION_KEYS: {
    'Employer': 'roles.employer',
    'Employee': 'roles.employee',
    'Client': 'roles.client',
    'Contractor': 'roles.contractor',
    'Landlord': 'roles.landlord',
    'Tenant': 'roles.tenant',
    'Partner': 'roles.partner',
    // Handle case variations
    'employer': 'roles.employer',
    'employee': 'roles.employee',
    'client': 'roles.client',
    'contractor': 'roles.contractor',
    'landlord': 'roles.landlord',
    'tenant': 'roles.tenant',
    'partner': 'roles.partner',
  } as const,

  // Icons for roles
  ICONS: {
    'Employer': Building2,
    'Employee': User,
    'Client': Briefcase,
    'Contractor': Wrench,
    'Landlord': Home,
    'Tenant': Key,
    'Partner': Handshake,
    // Handle case variations
    'employer': Building2,
    'employee': User,
    'client': Briefcase,
    'contractor': Wrench,
    'landlord': Home,
    'tenant': Key,
    'partner': Handshake,
  } as const,

  // Party role to user role mapping
  PARTY_TO_USER_ROLE: {
    'Landlord': 'landlord',
    'Tenant': 'tenant',
    'Employer': 'employer',
    'Employee': 'employee',
    'Client': 'client',
    'Contractor': 'contractor',
    'Partner': 'partner',
    'Lessor': 'landlord',
    'Lessee': 'tenant',
  } as const,
} as const;
/**
 * Normalize role name (trim and handle case)
 */
export function normalizeRole(role: string): string {
  if (!role) return role;
  return role.trim();
}

/**
 * Get role mapping for party role to user role
 */
export function mapPartyRoleToUserRole(partyRole: string): string {
  if (!partyRole) return partyRole;
  
  const normalizedRole = partyRole.trim();
  return ROLE_CONFIG.PARTY_TO_USER_ROLE[normalizedRole as keyof typeof ROLE_CONFIG.PARTY_TO_USER_ROLE] || partyRole.toLowerCase();
}

/**
 * Get icon for role
 */
export function getRoleIcon(role: string): any {
  if (!role) return null;
  
  const normalizedRole = role.trim();
  return ROLE_CONFIG.ICONS[normalizedRole as keyof typeof ROLE_CONFIG.ICONS] || null;
}

/**
 * Get translation key for role
 */
export function getRoleTranslationKey(role: string): string {
  if (!role) return role;
  
  const normalizedRole = role.trim();
  return ROLE_CONFIG.TRANSLATION_KEYS[normalizedRole as keyof typeof ROLE_CONFIG.TRANSLATION_KEYS] || role;
}
