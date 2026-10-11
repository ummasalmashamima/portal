import { getSession } from "@/data/mockAuth";
import { mockCompanies } from "@/data/mockCompanies";

/**
 * Resolve the demo Customer account to its canonical Company Master record.
 * An unmapped Customer returns null (deny), while non-Customer roles return
 * undefined so their normal permission rules remain unchanged.
 */
export function getCustomerCompanyIdForEmail(email: string): string | null {
  const normalizedEmail = email.trim().toLocaleLowerCase();
  if (!normalizedEmail) return null;
  return mockCompanies.find((company) =>
    company.contacts.some((contact) => contact.email.trim().toLocaleLowerCase() === normalizedEmail),
  )?.id ?? null;
}

export function getCurrentCustomerCompanyId(): string | null | undefined {
  const session = getSession();
  if (session?.user.role !== "Customer") return undefined;

  return getCustomerCompanyIdForEmail(session.user.email);
}

/** Apply tenant scoping to mock-repository reads for the authenticated Customer. */
export function isWithinCurrentCompanyScope(companyId: string | undefined): boolean {
  const customerCompanyId = getCurrentCustomerCompanyId();
  if (customerCompanyId === undefined) return true;
  return customerCompanyId !== null && companyId === customerCompanyId;
}
