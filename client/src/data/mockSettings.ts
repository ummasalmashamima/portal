import { demoUsers } from "@/data/mockAuth";
import type { ConfigValue, ManagedUser } from "@/types/settings";
export const mockManagedUsers: ManagedUser[] = demoUsers.map((user, index) => ({ ...user, status: "Active", phone: index === 7 ? "+880 1712 222 333" : "Not provided", createdAt: `2026-0${Math.min(index + 1, 9)}-01` }));
export const mockConfigValues: ConfigValue[] = [
  { id: "config-org", section: "Organization", label: "Organization name", value: "EcoAssurance Certification Services", description: "Display name used in the portal." },
  { id: "config-countries", section: "Countries", label: "Countries", value: "Bangladesh, Myanmar, China", description: "Countries already represented in the company fixtures.", systemProtected: true },
  { id: "config-standards", section: "Standards", label: "Standards", value: "ISO 9001, ISO 14001, ISO 45001, ISO 14064, HIGG FEM", description: "Standards already used by applications and certificates.", systemProtected: true },
  { id: "config-app-types", section: "Application Types", label: "Application Types", value: "Initial Certification, Renewal, Surveillance, Scope Extension", description: "Existing application type options.", systemProtected: true },
  { id: "config-statuses", section: "Statuses", label: "Workflow Statuses", value: "Draft, Submitted, Under Review, Pending Customer, Approved, Rejected, Active, Expired", description: "Existing workflow states; additions remain isolated from current fixtures.", systemProtected: true },
  { id: "config-templates", section: "Templates", label: "Document Templates", value: "Application checklist, Audit plan, CAP response, Certificate", description: "Mock template catalog; no files or emails are produced." },
  { id: "config-ref", section: "Reference Number Formats", label: "Reference Number Formats", value: "APP-{000000}, AUD-{000000}, FIND-{000000}, CERT-{000000}, DOC-{000000}", description: "Display-only format examples; existing IDs are never rewritten.", systemProtected: true },
  { id: "config-system", section: "System Configuration", label: "Environment", value: "Frontend mock repository", description: "API-ready interface; no Laravel backend or production file storage is connected." },
];
