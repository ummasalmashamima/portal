# EcoAssurance Portal — Project Inspection Report

**Scope:** Read-only inspection of `ecoassurance-portal(3).zip`. The archive was extracted to a temporary review directory; no application source was changed. Validation dependencies were installed in that extracted copy only.

## Executive summary

The archive contains a sizeable React/TypeScript/Vite frontend with substantial page implementations for applications and audits, a Company detail screen, a custom green design system, mock fixtures, and entity-level activity UI. Its overall intended data relationship is Company → Application → Audit.

**However, this ZIP is incomplete as a runnable project.** Eleven imported modules are absent, including the repository implementations, mock authentication data, protected-route and sidebar components, the Company list/form feature, and audit feature components. The production build stops at the missing `ProtectedRoute`; TypeScript reports **31 errors in 16 files**, mostly missing imports plus implicit-`any` errors caused by those missing types. Therefore, several visible page implementations cannot currently load or persist their workflows from the delivered archive.

---

## 1. Current folder structure

The archive’s project root contains configuration and build files (`package.json`, `pnpm-lock.yaml`, `vite.config.ts`, TypeScript configs, `template.json`), plus `client/`, `server/`, `shared/`, `patches/`, and a prebuilt `dist/index.js`.

Relevant application source under `client/src/`:

- `App.tsx`, `main.tsx`, `index.css`, `const.ts`
- `components/` — shared UI, topbar, dialogs, map, error boundary
- `contexts/` — auth, theme, toast
- `data/` — mock companies, applications, audits, auditors, activities, navigation
- `features/applications/` — application helper components and status badge
- `hooks/` — company, application, audit data hooks and general hooks
- `layouts/` — app shell and auth layout
- `pages/` — dashboard, auth, companies, applications, audits, coming-soon and fallback pages
- `types/` — company, application, audit, activity and auth types

Notably absent from the archive are `client/src/services/`, `client/src/routes/`, `client/src/components/brand/`, `client/src/features/companies/`, and `client/src/features/audits/`. The application imports modules from all of these locations.

## 2. Existing routes

`App.tsx` uses React Router and divides public auth pages from routes nested under `ProtectedRoute` and `AppShell`.

- **Public:** `/login`, `/forgot-password`, `/reset-password`
- **Protected core:** `/dashboard`
- **Company:** `/companies`, `/companies/new`, `/companies/:companyId`, `/companies/:companyId/edit`
- **Applications:** `/applications`, `/applications/new`, `/applications/:applicationId`, `/applications/:applicationId/edit`, `/applications/:applicationId/review`
- **Audits:** `/audits`, `/audits/new`, `/audits/:auditId`, `/audits/:auditId/edit`
- **Staged pages:** `/findings/*`, `/technical-reviews/*`, `/certifications/*`, `/certificates/*`, `/documents/*`, `/reports/*`, `/notifications/*`, `/settings/*`, `/profile/*`
- `/` and the catch-all route redirect to `/dashboard` or `/login`, depending on the session.

Although Company routes are declared, the Company list page is missing. `NotFound.tsx` exists but the catch-all route redirects instead of rendering it. The audit, Company, and auth route trees cannot compile because their required imports are missing.

## 3. Implemented modules

- **Authentication UI:** login, forgot-password, and reset-password screens. Login offers demo role selection. These screens are frontend-only; auth data and session helpers are missing, and password reset only changes local component state.
- **Application Management:** list/search/filter/pagination/KPI UI; create/edit form; detail page with overview/company/site/documents/activity tabs; checklist-based review with approve/request/reject actions; status timeline and document uploader helpers.
- **Audit Management:** list/filter/KPIs; create/edit planning form; detail page with overview, linked records, audit plan, auditors, documents, findings, report and activity sections; status actions are wired to an imported repository interface. Audit feature components needed by the pages are absent.
- **Company Master:** a detailed Company relationship page with overview, contacts, sites, applications, audits, findings, certificates, documents and activity tabs. Company list and the `CompanyForm` feature are absent, so create/edit/list flows are incomplete.
- **Dashboard:** a styled workspace overview with workflow metrics, audit, certificate, pending-action and activity sections. The displayed information is hard-coded in the page rather than derived from the entity fixtures.
- **Other modules:** findings/CAP, technical reviews, certification, certificates, documents, reports, notifications, settings and profile currently route to `ComingSoonPage`.

## 4. Reusable components

- `components/ui/Primitives.tsx`: buttons, fields, inputs, cards, KPI cards, badges, empty/loading/error states, toast and search elements.
- `components/ui/Enterprise.tsx`: page header, filters, tabs, tables, pagination, timelines and mini-bars.
- `components/ui/ActivityTimeline.tsx`: generic renderer for the typed activity-event model.
- `features/applications/ApplicationComponents.tsx`: application status timeline, mock document uploader and activity timeline wrapper.
- `components/navigation/Topbar.tsx`, `layouts/AppShell.tsx`, and `layouts/AuthLayout.tsx` compose the main and auth shells, but the imported `Sidebar` and `Wordmark` are missing.
- `components/ui/` also contains a broad set of Radix/shadcn-style UI primitives. Lucide icons are used throughout; Recharts is declared as a dependency but no Recharts usage was found in the reviewed feature pages.

`features/audits/AuditComponents.tsx`, referenced for audit status, timeline, activity, findings, and document UI, is not present in the archive.

## 5. Mock data structure

The delivered typed fixtures include **6 companies, 8 applications, 5 audits, 5 auditors, and 11 activity events**. Company records contain nested contacts, sites, standards, and denormalized related-application/audit/finding/certificate/document/activity summaries. Application records separately contain `companyId`, `siteId`, certification details, documents, status and creator metadata. Audit records contain `applicationId`, `companyId`, `siteId`, auditor IDs, schedule, documents, findings and report data.

The dashboard also keeps its own inline arrays and fixed aggregate numbers. It is not a live summary of the fixture data, so its totals and rows can diverge from the lists.

## 6. Service/repository/API architecture

The hooks and pages are written against imported `mockCompanyRepository`, `mockApplicationRepository`, `mockAuditRepository`, and `activityRepository` modules. Hooks call methods such as `list`, `getById`, `create`, `update`, `transition`, `assign`, `addFinding`, and `listByEntity`, which indicates a repository abstraction intended to be replaceable with API-backed implementations.

**The repository files themselves are not included.** There is no `services/` directory in the ZIP, and no API client or usable backend endpoint is present in the reviewed source. Axios is listed as a dependency, but the reviewed application source does not establish a working API integration. The server entry serves the static frontend; it does not implement business APIs. In practice, the API-ready/repository layer cannot currently be exercised from this archive.

## 7. Company → Application → Audit relationships

The intended normalized chain is clear in the feature code:

1. An application stores a `companyId` and optional `siteId`; application hooks resolve its company.
2. An audit stores an `applicationId` and `companyId`; `useAudit` resolves the audit, then its application, then the company, and loads audit activity by audit entity ID.
3. Forms guide users to select an existing Company for an application, then an existing Application for an audit. Site and company details are derived from those selections.

There is also a second, nested set of relationship summaries inside each Company fixture. These duplicate records are not reliably synchronized with the top-level fixtures. Examples: nested audit IDs use forms such as `aud-001`, while the actual audit fixture uses `audit-001`; some Company summary lists are empty despite a matching top-level audit; some nested audit reference numbers do not match the top-level audit records.

There are also concrete navigation-key mismatches: the application detail uses the audit **reference number** (for example, `AUD-000102`) as the `/audits/:auditId` route key, while the audit detail hook expects an audit **ID** such as `audit-001`. Company detail similarly links using nested IDs such as `aud-001`, not the top-level audit IDs. Those links will not resolve if the repository lookup is keyed by the IDs used in the audit fixtures.

## 8. Activity History implementation

A generalized `ActivityRecord` type is present, including entity type/ID, event type, description, actor/name/role, timestamp and metadata. `mockActivities.ts` contains 11 seeded **application** events. Application detail calls `activityRepository.listByEntity("application", id)` and renders results with the shared `ActivityTimeline` component.

This is evidence of a centralized, entity-scoped activity architecture in the consumer code, but the activity repository is missing. There is no central “all activity” route/page in `App.tsx`. Company detail still uses a separate legacy `CompanyActivity` shape embedded inside the company fixture and renders it with the generic older `Timeline` component. The delivered shared activity fixture contains no audit/company events.

## 9. Audit History implementation

`useAudit` is intended to fetch events with `activityRepository.listByEntity("audit", audit.id)`. `AuditDetailPage` provides an Activity tab and imports `AuditActivityTimeline` as part of `AuditComponents.tsx`. The audit page also imports an `AuditStatusTimeline`, indicating a separate audit-state progression component. The audit record type includes current status, while the audit detail UI exposes workflow actions such as assign, schedule, start, complete, and prepare/submit report.

The implementation of the audit activity repository and the `AuditComponents` module are absent, and the activity fixtures contain only application events. Therefore the code shows the intended Audit History/status-timeline design, but the archive does not contain enough source to verify or run those parts.

## 10. Incomplete or broken parts

### Build-blocking missing imports

The following **11 distinct module targets** are imported but absent:

- `routes/ProtectedRoute`
- `pages/companies/CompanyListPage`
- `data/mockAuth`
- `services/repositories/applicationRepository`
- `services/repositories/activityRepository`
- `services/repositories/companyRepository`
- `services/repositories/auditRepository`
- `components/navigation/Sidebar`
- `components/brand/Wordmark`
- `features/audits/AuditComponents`
- `features/companies/CompanyForm`

These account for 23 missing-import references across the source files. The TypeScript check reports 31 errors in 16 files; several implicit-`any` diagnostics are downstream of the missing repository/component types.

### Other observed limitations

- **Build validation:** `pnpm build` fails immediately while Vite tries to load missing `routes/ProtectedRoute`.
- **Company actions:** contact/site add buttons and company document uploads show toast messages rather than performing edits/uploads. The Company create/edit wrapper depends on the missing `CompanyForm`.
- **Application upload/export:** the uploader records mock file metadata, not an uploaded file; application export is staged. Application review transitions are explicitly labeled mock-mode/frontend-only.
- **Audit history/reporting:** audit detail code contains extensive controls, but execution depends on missing audit repository/components. Finding/CAP itself is explicitly staged as a future module.
- **Scaffolding residue:** `Home.tsx` remains a generic “Example Page” and is not connected to the route tree. `template.json` embeds a different starter app definition from the current EcoAssurance `App.tsx`, so it appears stale relative to the source.
- **Tests:** no test files or test script were found in the archive, despite Vitest being a dependency.

## Validation performed

- Extracted and inventoried all archive files.
- Read route, layout, page, component, type, mock-data and configuration sources relevant to the requested areas.
- Scanned local imports and identified missing module targets.
- Ran `pnpm check`: **failed — 31 TypeScript errors in 16 files**.
- Ran `pnpm build`: **failed — first unresolved import is `@/routes/ProtectedRoute`**.

**No new module has been implemented.**