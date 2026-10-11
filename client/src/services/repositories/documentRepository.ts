import { mockDocuments } from "@/data/mockDocuments";
import { mockCompanies } from "@/data/mockCompanies";
import { mockApplications } from "@/data/mockApplications";
import { mockAudits } from "@/data/mockAudits";
import { mockFindings } from "@/data/mockFindings";
import { mockCertifications } from "@/data/mockCertifications";
import { mockTechnicalReviews } from "@/data/mockTechnicalReviews";
import { mockCertificates } from "@/data/mockCertificates";
import { mockAuditors } from "@/data/mockAuditors";
import { rolePermissions } from "@/data/navigation";
import { activityRepository } from "@/services/repositories/activityRepository";
import { notificationRepository } from "@/services/repositories/notificationRepository";
import type { DocumentActor, DocumentEntityType, DocumentFilters, DocumentRecord, DocumentUploadInput, DocumentVersionRecord, PaginatedDocuments } from "@/types/document";
import type { UserRole } from "@/types/auth";
import { paginate, nextReference, normalizedIncludes } from "./repositoryUtils";
import { getCurrentCustomerCompanyId } from "./customerScope";

const store = mockDocuments as DocumentRecord[];
function can(actor: DocumentActor, permission: string) { return Boolean(actor.role && rolePermissions[actor.role].includes(permission as never)); }
function assertPermission(actor: DocumentActor, permission: string) { if (!can(actor, permission)) throw new Error(`Permission required: ${permission}`); }
function todayISO() { return new Date().toISOString().slice(0, 10); }
function isoNow() { return new Date().toISOString(); }
function resolveParent(type: DocumentEntityType, id: string): { companyId?: string; label: string } | null {
  if (type === "company") { const x = mockCompanies.find((v) => v.id === id || v.companyId === id); return x ? { companyId: x.id, label: `${x.companyId} · ${x.legalName}` } : null; }
  if (type === "application") { const x = mockApplications.find((v) => v.id === id || v.applicationNumber === id); const c = x && mockCompanies.find((v) => v.id === x.companyId); return x ? { companyId: x.companyId, label: `${x.applicationNumber} · ${c?.legalName ?? x.companyId}` } : null; }
  if (type === "audit") { const x = mockAudits.find((v) => v.id === id || v.auditNumber === id); const c = x && mockCompanies.find((v) => v.id === x.companyId); return x ? { companyId: x.companyId, label: `${x.auditNumber} · ${c?.legalName ?? x.companyId}` } : null; }
  if (type === "finding") { const x = mockFindings.find((v) => v.id === id || v.findingNumber === id); const c = x && mockCompanies.find((v) => v.id === x.companyId); return x ? { companyId: x.companyId, label: `${x.findingNumber} · ${c?.legalName ?? x.companyId}` } : null; }
  if (type === "technical_review") { const x = mockTechnicalReviews.find((v) => v.id === id || v.reference === id); const c = x && mockCompanies.find((v) => v.id === x.companyId); return x ? { companyId: x.companyId, label: `${x.reference} · ${c?.legalName ?? x.companyId}` } : null; }
  if (type === "certification") { const x = mockCertifications.find((v) => v.id === id || v.certificationNumber === id); const c = x && mockCompanies.find((v) => v.id === x.companyId); return x ? { companyId: x.companyId, label: `${x.certificationNumber} · ${c?.legalName ?? x.companyId}` } : null; }
  const x = mockCertificates.find((v) => v.id === id || v.certificateNumber === id); const c = x && mockCompanies.find((v) => v.id === x.companyId); return x ? { companyId: x.companyId, label: `${x.certificateNumber} · ${c?.legalName ?? x.companyId}` } : null;
}
function canSeeRecord(record: DocumentRecord, actor: DocumentActor): boolean {
  if (!actor.role) return false;
  const role = actor.role;
  if (role === "Super Admin" || role === "Director / Management") return true;
  if (role === "Customer") {
    const companyId = getCurrentCustomerCompanyId();
    return Boolean(companyId && record.companyId === companyId && ["application", "finding", "certificate"].includes(record.relatedEntityType));
  }
  if (role === "Application Officer") return ["company", "application"].includes(record.relatedEntityType);
  if (role === "Auditor") {
    if (!["audit", "finding"].includes(record.relatedEntityType)) return false;
    const auditId = record.relatedEntityType === "audit" ? record.relatedEntityId : mockFindings.find((f) => f.id === record.relatedEntityId)?.auditId;
    const audit = mockAudits.find((item) => item.id === auditId);
    const assigned = mockAuditors.find((item) => item.name === actor.name)?.id;
    return Boolean(audit && assigned && (audit.leadAuditorId === assigned || audit.supportingAuditorIds.includes(assigned)));
  }
  if (role === "Audit Manager") return ["company", "application", "audit", "finding"].includes(record.relatedEntityType);
  if (role === "Technical Reviewer") {
    const assigned = mockTechnicalReviews.filter((review) => review.reviewerId === actor.id);
    if (record.relatedEntityType === "technical_review") return assigned.some((review) => [review.id, review.reference].includes(record.relatedEntityId));
    const auditId = record.relatedEntityType === "audit" ? record.relatedEntityId : record.relatedEntityType === "finding" ? mockFindings.find((finding) => [finding.id, finding.findingNumber].includes(record.relatedEntityId))?.auditId : undefined;
    if (auditId) return assigned.some((review) => review.auditId === auditId || mockAudits.find((audit) => audit.auditNumber === review.auditId)?.id === auditId);
    if (record.relatedEntityType === "certification") return mockCertifications.some((certification) => certification.id === record.relatedEntityId && assigned.some((review) => certification.technicalReviewId === review.id));
    return false;
  }
  if (role === "Certification Manager") return ["technical_review", "certification", "certificate"].includes(record.relatedEntityType);
  return false;
}
function canUploadLink(actor: DocumentActor, type: DocumentEntityType, category: DocumentUploadInput["category"], companyId: string) {
  if (actor.role === "Super Admin") return true;
  if (actor.role === "Customer") {
    const customerCompanyId = getCurrentCustomerCompanyId();
    return Boolean(customerCompanyId && companyId === customerCompanyId && ((type === "application" && category === "Application") || (type === "finding" && category === "CAP")));
  }
  if (actor.role === "Application Officer") return type === "application" && category === "Application";
  if (actor.role === "Auditor") return ["audit", "finding"].includes(type) && ["Evidence", "Audit Plan", "Checklist", "Audit Report", "CAP"].includes(category);
  if (actor.role === "Technical Reviewer") return type === "technical_review" && category === "Technical Review";
  return false;
}
function clone(record: DocumentRecord): DocumentRecord { return { ...record, versions: record.versions.map((item) => ({ ...item })) }; }
async function event(record: DocumentRecord, activityType: "document_uploaded" | "document_version_uploaded" | "document_downloaded" | "document_archived" | "document_linked" | "document_unlinked" | "document_updated", description: string, actor: DocumentActor, extra: Record<string, string | number | boolean | undefined> = {}) {
  await activityRepository.create({ entityType: "document", entityId: record.id, activityType, description, performedBy: actor.id, performedByName: actor.name, role: actor.role, metadata: { reference: record.documentNumber, companyId: record.companyId, relatedEntityType: record.relatedEntityType, relatedEntityId: record.relatedEntityId, relatedEntity: record.relatedRecord, ...extra } });
}
function minor(version: string) { const [major = 1, min = 0] = version.split(".").map(Number); return `${major}.${min + 1}`; }
function scoped(actor: DocumentActor) { return store.filter((record) => canSeeRecord(record, actor)); }
export interface DocumentRelatedOption { id: string; label: string; companyId?: string; }

export const documentRepository = {
  async list(filters: DocumentFilters = {}, actor: DocumentActor): Promise<PaginatedDocuments> {
    assertPermission(actor, "documents.view");
    const rows = scoped(actor).filter((record) => {
      const current = record.versions[record.versions.length - 1];
      const text = [record.documentNumber, record.name, record.documentType, record.category, record.relatedRecord, current?.fileName, current?.uploadedBy, record.description].join(" ");
      const uploadedAt = current?.uploadedAt.slice(0, 10) ?? "";
      return normalizedIncludes(text, filters.search)
        && (!filters.category || filters.category === "All" || record.category === filters.category)
        && (!filters.documentType || filters.documentType === "All" || record.documentType === filters.documentType)
        && (!filters.relatedEntityType || filters.relatedEntityType === "All" || record.relatedEntityType === filters.relatedEntityType)
        && (!filters.relatedEntityId || (filters.relatedEntityType === "company" ? record.companyId === filters.relatedEntityId : record.relatedEntityId === filters.relatedEntityId))
        && (!filters.companyId || record.companyId === filters.companyId)
        && (!filters.status || filters.status === "All" || record.status === filters.status)
        && (!filters.uploadedBy || filters.uploadedBy === "All" || current?.uploadedBy === filters.uploadedBy)
        && (!filters.dateFrom || uploadedAt >= filters.dateFrom)
        && (!filters.dateTo || uploadedAt <= filters.dateTo);
    }).sort((a, b) => filters.sort === "oldest" ? a.updatedAt.localeCompare(b.updatedAt) : filters.sort === "name" ? a.name.localeCompare(b.name) : b.updatedAt.localeCompare(a.updatedAt));
    return paginate(rows.map(clone), filters.page, filters.pageSize);
  },
  async getById(id: string, actor: DocumentActor): Promise<DocumentRecord | null> {
    assertPermission(actor, "documents.view");
    const record = scoped(actor).find((item) => item.id === id || item.documentNumber === id);
    return record ? clone(record) : null;
  },
  async versions(id: string, actor: DocumentActor): Promise<DocumentVersionRecord[]> { const doc = await this.getById(id, actor); return doc?.versions.map((item) => ({ ...item })) ?? []; },
  async relatedOptions(type: DocumentEntityType, actor: DocumentActor): Promise<DocumentRelatedOption[]> {
    assertPermission(actor, "documents.view");
    const rows: DocumentRelatedOption[] = type === "company" ? mockCompanies.map((x) => ({ id: x.id, label: `${x.companyId} · ${x.legalName}`, companyId: x.id }))
      : type === "application" ? mockApplications.map((x) => ({ id: x.id, label: `${x.applicationNumber} · ${mockCompanies.find((c) => c.id === x.companyId)?.legalName ?? x.companyId}`, companyId: x.companyId }))
      : type === "audit" ? mockAudits.map((x) => ({ id: x.id, label: `${x.auditNumber} · ${mockCompanies.find((c) => c.id === x.companyId)?.legalName ?? x.companyId}`, companyId: x.companyId }))
      : type === "finding" ? mockFindings.map((x) => ({ id: x.id, label: `${x.findingNumber} · ${mockCompanies.find((c) => c.id === x.companyId)?.legalName ?? x.companyId}`, companyId: x.companyId }))
      : type === "technical_review" ? mockTechnicalReviews.map((x) => ({ id: x.id, label: `${x.reference} · ${mockCompanies.find((c) => c.id === x.companyId)?.legalName ?? x.companyId}`, companyId: x.companyId }))
      : type === "certification" ? mockCertifications.map((x) => ({ id: x.id, label: `${x.certificationNumber} · ${mockCompanies.find((c) => c.id === x.companyId)?.legalName ?? x.companyId}`, companyId: x.companyId }))
      : mockCertificates.map((x) => ({ id: x.id, label: `${x.certificateNumber} · ${mockCompanies.find((c) => c.id === x.companyId)?.legalName ?? x.companyId}`, companyId: x.companyId }));
    return rows.filter((x) => (actor.role !== "Customer" || ["application", "finding"].includes(type)) && canSeeRecord({ id: "option", documentNumber: "", name: "", category: "Evidence", documentType: "", relatedEntityType: type, relatedEntityId: x.id, relatedRecord: x.label, companyId: x.companyId, description: "", status: "Uploaded", versions: [], createdAt: "", updatedAt: "" }, actor));
  },
  relatedRoute(type: DocumentEntityType, id: string): string {
    if (type === "company") return `/companies/${id}`;
    if (type === "application") return `/applications/${id}`;
    if (type === "audit") return `/audits/${id}`;
    if (type === "finding") return `/findings/${id}`;
    if (type === "technical_review") { const review = mockTechnicalReviews.find((x) => x.id === id || x.reference === id); return review ? `/technical-reviews/${review.id}` : "/technical-reviews"; }
    if (type === "certification") return `/certifications/${id}`;
    return `/certificates/${id}`;
  },
  canUploadTo(record: DocumentRecord, actor: DocumentActor) { return can(actor, "documents.upload") && canUploadLink(actor, record.relatedEntityType, record.category, record.companyId ?? ""); },
  async upload(input: DocumentUploadInput, actor: DocumentActor): Promise<DocumentRecord> {
    assertPermission(actor, "documents.upload");
    if (!input.fileName.trim() || input.fileSizeBytes <= 0 || input.fileSizeBytes > 25 * 1024 * 1024) throw new Error("Choose a supported file between 1 byte and 25 MB.");
    const supported = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "image/jpeg", "image/png"];
    if (!supported.includes(input.fileType)) throw new Error("Supported types: PDF, DOC/DOCX, XLS/XLSX, JPG and PNG.");
    const parent = resolveParent(input.relatedEntityType, input.relatedEntityId);
    if (!parent) throw new Error("Choose an existing related record.");
    const companyId = input.companyId ?? parent.companyId;
    if (parent.companyId && companyId !== parent.companyId) throw new Error("The related record and company must match.");
    if (!canUploadLink(actor, input.relatedEntityType, input.category, companyId ?? "")) throw new Error("Your role cannot upload this document category to the selected record.");
    if (actor.role === "Auditor") {
      const record = input.relatedEntityType === "audit" ? mockAudits.find((item) => item.id === input.relatedEntityId) : mockAudits.find((audit) => audit.id === mockFindings.find((f) => f.id === input.relatedEntityId)?.auditId);
      const auditorId = mockAuditors.find((item) => item.name === actor.name)?.id;
      if (!record || !auditorId || (record.leadAuditorId !== auditorId && !record.supportingAuditorIds.includes(auditorId))) throw new Error("You can upload only to audits assigned to you.");
    }
    const now = isoNow();
    const record: DocumentRecord = { id: `document-${String(store.length + 1).padStart(3, "0")}`, documentNumber: nextReference("DOC", store.map((item) => item.documentNumber), 6), name: input.name.trim() || input.fileName, category: input.category, documentType: input.documentType, relatedEntityType: input.relatedEntityType, relatedEntityId: input.relatedEntityId, relatedRecord: parent.label, companyId, description: input.description.trim(), status: "Uploaded", versions: [{ id: `${Date.now()}-v1`, version: "1.0", fileName: input.fileName, uploadedBy: actor.name ?? "Demo user", uploadedById: actor.id ?? "user-unknown", uploadedAt: now, changeDescription: input.changeDescription.trim() || "Initial upload", fileSizeBytes: input.fileSizeBytes, fileType: input.fileType, status: "Uploaded", downloadCount: 0 }], createdAt: now, updatedAt: now };
    store.unshift(record);
    await event(record, "document_uploaded", `Document Uploaded: ${record.name}`, actor);
    await event(record, "document_linked", `Document Linked to ${record.relatedRecord}`, actor);
    const recipientRoles: UserRole[] = actor.role === "Customer" ? ["Application Officer", "Super Admin"] : actor.role === "Auditor" ? ["Technical Reviewer", "Audit Manager", "Super Admin"] : ["Customer", "Audit Manager", "Super Admin"];
    await notificationRepository.create({ title: "Document uploaded", description: `${record.name} was linked to ${record.relatedRecord}.`, category: "Document", priority: "Low", relatedEntityType: "document", relatedEntityId: record.id, relatedRecord: `${record.documentNumber} · ${record.relatedRecord}`, route: `/documents/${record.id}`, companyId: record.companyId, triggeredBy: actor.name ?? "Document workflow", createdAt: now, recipientRoles, recipientUserIds: actor.role === "Customer" ? ["user-ayesha", "user-jisan"] : undefined }, actor);
    return clone(record);
  },
  async uploadVersion(id: string, input: Pick<DocumentUploadInput, "fileName" | "fileSizeBytes" | "fileType" | "changeDescription">, actor: DocumentActor): Promise<DocumentRecord> {
    assertPermission(actor, "documents.upload");
    const record = scoped(actor).find((item) => item.id === id);
    if (!record || record.status === "Archived") throw new Error("An accessible, non-archived document is required.");
    if (input.fileSizeBytes <= 0 || input.fileSizeBytes > 25 * 1024 * 1024) throw new Error("Choose a supported file between 1 byte and 25 MB.");
    if (!["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "image/jpeg", "image/png"].includes(input.fileType)) throw new Error("Supported types: PDF, DOC/DOCX, XLS/XLSX, JPG and PNG.");
    const current = record.versions[record.versions.length - 1];
    const updated: DocumentRecord = { ...record, status: "Uploaded", updatedAt: isoNow(), versions: [...record.versions.map((v) => ({ ...v })), { id: `${Date.now()}-v${record.versions.length + 1}`, version: minor(current.version), fileName: input.fileName, uploadedBy: actor.name ?? "Demo user", uploadedById: actor.id ?? "user-unknown", uploadedAt: isoNow(), changeDescription: input.changeDescription.trim() || "New version uploaded", fileSizeBytes: input.fileSizeBytes, fileType: input.fileType, status: "Uploaded", downloadCount: 0 }] };
    store[store.indexOf(record)] = updated;
    await event(updated, "document_version_uploaded", `New Version Uploaded: ${updated.name} v${updated.versions.at(-1)?.version}`, actor, { version: updated.versions.at(-1)?.version });
    return clone(updated);
  },
  async approve(id: string, actor: DocumentActor): Promise<DocumentRecord> {
    assertPermission(actor, "documents.approve");
    const record = scoped(actor).find((item) => item.id === id);
    if (!record || record.status === "Archived") throw new Error("Document is not available for approval.");
    const versions = record.versions.map((v, i) => i === record.versions.length - 1 ? { ...v, status: "Accepted" as const } : { ...v });
    const updated = { ...record, versions, status: "Accepted" as const, updatedAt: isoNow() };
    store[store.indexOf(record)] = updated;
    await event(updated, "document_updated", `Document Updated: ${updated.name} accepted`, actor, { status: "Accepted" });
    return clone(updated);
  },
  async download(id: string, actor: DocumentActor): Promise<DocumentRecord> {
    const record = scoped(actor).find((item) => item.id === id);
    if (!record) throw new Error("Document is not available to this role.");
    const index = record.versions.length - 1;
    const versions = record.versions.map((v, i) => i === index ? { ...v, downloadCount: v.downloadCount + 1 } : { ...v });
    const updated = { ...record, versions };
    store[store.indexOf(record)] = updated;
    await event(updated, "document_downloaded", `Document Downloaded: ${record.name} v${versions[index].version}`, actor, { version: versions[index].version });
    return clone(updated);
  },
  async archive(id: string, actor: DocumentActor): Promise<DocumentRecord> {
    assertPermission(actor, "documents.archive");
    const record = scoped(actor).find((item) => item.id === id);
    if (!record) throw new Error("Document not found or not accessible.");
    const updated = { ...record, status: "Archived" as const, updatedAt: isoNow(), versions: record.versions.map((v) => ({ ...v })) };
    store[store.indexOf(record)] = updated;
    await event(updated, "document_archived", `Document Archived: ${record.name}`, actor);
    return clone(updated);
  },
  async unlink(id: string, actor: DocumentActor): Promise<void> {
    assertPermission(actor, "documents.archive");
    const record = scoped(actor).find((item) => item.id === id);
    if (!record) throw new Error("Document not found or not accessible.");
    await event(record, "document_unlinked", `Document Unlinked from ${record.relatedRecord}`, actor);
  },
};

export const documentAccess = {
  can(actor: DocumentActor, permission: "documents.view" | "documents.upload" | "documents.approve" | "documents.archive") { return can(actor, permission); },
  roles: ["Super Admin", "Director / Management", "Application Officer", "Audit Manager", "Auditor", "Technical Reviewer", "Certification Manager", "Customer"] as UserRole[],
};
