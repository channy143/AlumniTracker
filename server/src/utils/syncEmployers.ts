import { supabase } from '../services/supabase';
import { toTitleCaseCompanyName } from './validateJobTitle';

function normalizeName(value?: string | null): string {
  return String(value || '').trim().toLowerCase();
}

/**
 * Ensures a corresponding row exists in the `employers` table for a given company name.
 * Non-fatal: returns null if the table does not exist or insertion fails.
 */
export async function ensureEmployerRecord(params: {
  companyName?: string | null;
  industry?: string | null;
  contactPerson?: string | null;
  contactEmail?: string | null;
}): Promise<{ id: string; company_name: string; industry: string | null } | null> {
  const cleanName = toTitleCaseCompanyName(params.companyName);
  const norm = normalizeName(cleanName);
  if (!norm) return null;

  try {
    const { data: existingList, error: fetchError } = await supabase
      .from('employers')
      .select('id, company_name, industry');
    if (fetchError) return null;

    const existing = (existingList || []).find((row: any) => normalizeName(row.company_name) === norm);
    if (existing) return existing;

    const { data: created, error: insertError } = await supabase
      .from('employers')
      .insert({
        company_name: cleanName,
        industry: params.industry || null,
        contact_person: params.contactPerson || null,
        contact_email: params.contactEmail || null,
      })
      .select('id, company_name, industry')
      .single();

    if (insertError) return null;
    return created;
  } catch {
    return null;
  }
}

/**
 * Ensures a corresponding row exists in the `companies` table for a given employer name.
 * Non-fatal: returns null if the table does not exist or insertion fails.
 */
export async function ensureCompanyRecord(params: {
  name?: string | null;
  industry?: string | null;
  contactEmail?: string | null;
}): Promise<{ id: string; name: string; industry: string | null } | null> {
  const cleanName = toTitleCaseCompanyName(params.name);
  const norm = normalizeName(cleanName);
  if (!norm) return null;

  try {
    const { data: existingList, error: fetchError } = await supabase
      .from('companies')
      .select('id, name, industry');
    if (fetchError) return null;

    const existing = (existingList || []).find((row: any) => normalizeName(row.name) === norm);
    if (existing) return existing;

    const { data: created, error: insertError } = await supabase
      .from('companies')
      .insert({
        name: cleanName,
        industry: params.industry || null,
        contact_email: params.contactEmail || null,
        employer_type: 'regular',
        partnership_status: 'non-partner',
        agreement_verification_status: 'none',
        is_verified: false,
        is_active: true,
      })
      .select('id, name, industry')
      .single();

    if (insertError) return null;
    return created;
  } catch {
    return null;
  }
}

/**
 * Resolves company_id, employer_id, company_name, and industry for admin job creation/update,
 * supporting selections sourced from either `employers` or `companies`.
 */
export async function resolveJobCompanyAndEmployer(params: {
  employerId?: string | null;
  companyId?: string | null;
  companyName?: string | null;
  industry?: string | null;
}): Promise<{
  employerId: string | null;
  companyId: string | null;
  companyName: string;
  industry: string | null;
}> {
  let resolvedEmployerId = params.employerId || null;
  let resolvedCompanyId = params.companyId || null;
  let resolvedCompanyName = params.companyName ? toTitleCaseCompanyName(params.companyName) : '';
  let resolvedIndustry = params.industry || null;

  if (resolvedEmployerId) {
    const { data: emp } = await supabase
      .from('employers')
      .select('id, company_name, industry, contact_email')
      .eq('id', resolvedEmployerId)
      .maybeSingle();

    if (emp) {
      resolvedEmployerId = emp.id;
      resolvedCompanyName = emp.company_name;
      if (!resolvedIndustry && emp.industry) resolvedIndustry = emp.industry;
      if (!resolvedCompanyId) {
        const company = await ensureCompanyRecord({
          name: emp.company_name,
          industry: emp.industry,
          contactEmail: emp.contact_email,
        });
        if (company) resolvedCompanyId = company.id;
      }
      return {
        employerId: resolvedEmployerId,
        companyId: resolvedCompanyId,
        companyName: resolvedCompanyName,
        industry: resolvedIndustry,
      };
    }

    // Fallback: dropdown item may have come from `companies` (e.g. added via Partner Companies).
    const { data: compFromEmpId } = await supabase
      .from('companies')
      .select('id, name, industry, contact_email')
      .eq('id', resolvedEmployerId)
      .maybeSingle();

    resolvedEmployerId = null;

    if (compFromEmpId) {
      resolvedCompanyId = compFromEmpId.id;
      resolvedCompanyName = compFromEmpId.name;
      if (!resolvedIndustry && compFromEmpId.industry) resolvedIndustry = compFromEmpId.industry;
      const ensuredEmp = await ensureEmployerRecord({
        companyName: compFromEmpId.name,
        industry: compFromEmpId.industry,
        contactEmail: compFromEmpId.contact_email,
      });
      if (ensuredEmp) resolvedEmployerId = ensuredEmp.id;
    }
  } else if (resolvedCompanyId) {
    const { data: comp } = await supabase
      .from('companies')
      .select('id, name, industry, contact_email')
      .eq('id', resolvedCompanyId)
      .maybeSingle();

    if (comp) {
      resolvedCompanyId = comp.id;
      resolvedCompanyName = comp.name;
      if (!resolvedIndustry && comp.industry) resolvedIndustry = comp.industry;
      const ensuredEmp = await ensureEmployerRecord({
        companyName: comp.name,
        industry: comp.industry,
        contactEmail: comp.contact_email,
      });
      if (ensuredEmp) resolvedEmployerId = ensuredEmp.id;
    }
  }

  return {
    employerId: resolvedEmployerId,
    companyId: resolvedCompanyId,
    companyName: resolvedCompanyName,
    industry: resolvedIndustry,
  };
}
