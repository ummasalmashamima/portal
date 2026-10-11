# EcoAssurance Portal — Step 10 Technical Review Verification

**Verification date:** 2026-10-01  
**Scope:** Complete the Technical Review module on the verified Step 8 project baseline. Step 9 (Responsive Polish) was **not started**.

## 14-point status report

1. **Baseline and architecture preserved — PASS.** Work continued from the existing EcoAssurance project; it was not rebuilt from scratch. React, TypeScript, Vite, React Router, Tailwind, Lucide icons, repository services, mock fixtures, and the existing application shell remain in use.
2. **Existing design system and navigation — PASS.** The portal shell and dark-green sidebar (#1A3C34) remain intact. Technical Review is integrated into the existing permission-filtered navigation rather than replacing it.
3. **Technical Review register — PASS.** A searchable/filterable register lists linked Company, Application, Audit, reviewer, priority, status, and workflow information.
4. **Technical Review details — PASS.** Detail views show canonical related records, assessment, decisions, workflow history, linked findings, and existing documents with navigation back to their source records.
5. **Create/edit workflow — PASS.** Users select existing Company, Application, and Audit IDs. The form derives linked data; it does not duplicate upstream records.
6. **Audit Package Review preview — PASS.** The form displays a live read-only package view of the selected audit/report, audit team, findings/CAP closure state, and linked documents.
7. **Lifecycle transitions — PASS.** Browser QA exercised a demo review through Pending Review → In Review → Approved → Completed using the supported Start, Decide, and Complete actions.
8. **Assessment and approval validation — PASS.** Approval validation checks completion of every assessment field and requires all linked findings to be closed. Reviewer Comments initially exposed a mismatch between the UI’s optional marker and the repository gate; it is now visibly and natively required like the other assessment sections.
9. **Certification readiness integration — PASS.** Certification cases can link only to a canonical Technical Review for the selected Application and Audit. The case detail reads the linked review’s actual status and decision; repository checks block submission/decision while required readiness items are incomplete.
10. **Decision-gate browser test — PASS.** A demo-only case, EC-CERT-000007, was created using existing APP-000098, AUD-000097, and completed TR-000029. All five readiness checks showed complete. After Start Review, Submit for Decision was enabled; the case was advanced to Decision Pending. **No certification outcome was recorded.**
11. **Technical Reviewer scoping — PASS.** The Technical Reviewer session showed its assigned queue and available review workflow rather than unrestricted review management.
12. **Customer access controls — PASS.** Customer navigation omits Technical Review; direct attempts to open both the register and TR-000032 returned an access-denied state, not internal details. Customer Activity History was limited to seven company-related events and exposed no Technical Review events.
13. **Build and browser QA — PASS.** `pnpm check` and `pnpm build` both succeeded. Browser QA covered Technical Review creation, workflow transitions, certification readiness, and Customer restrictions. Build output contained non-fatal warnings: the existing pnpm configuration warning about ignored `pnpm.patchedDependencies`/`pnpm.overrides` and Vite’s large-chunk advisory.
14. **Delivery and remaining scope — PASS.** A new complete project archive is supplied separately. Source fixtures remain unchanged by the demo mutations; the mock repositories are in-memory, so QA-created records are not durable across reloads. Responsive Polish (Step 9) remains untouched.

## Windows instructions

1. Install **Node.js 22 LTS** on Windows. The project pins **pnpm 10.4.1** in `package.json`.
2. Extract `ecoassurance-portal-step10-complete.zip` to a writable folder, for example `C:\Users\<YourName>\ecoassurance-portal-step10-complete`.
3. Open PowerShell in the extracted project root (the directory containing `package.json` and `pnpm-lock.yaml`).
4. Enable Corepack and activate the pinned pnpm version:

   ```powershell
   corepack enable
   corepack prepare pnpm@10.4.1 --activate
   ```

   If Corepack is unavailable, use the fallback:

   ```powershell
   npm install --global pnpm@10.4.1
   ```

5. Install dependencies and verify the source/build:

   ```powershell
   pnpm install
   pnpm check
   pnpm build
   ```

6. Start the development server:

   ```powershell
   pnpm dev
   ```

7. Open **http://localhost:5173**. Use the demo role selector on the login page; the demo password is **`demo123`**.
8. Stop the server with **Ctrl+C** in PowerShell.

## Notes

- The demo login is frontend/mock authentication, not a production identity service.
- The demo Technical Review TR-000032 and certification case EC-CERT-000007 were created only in the running in-memory mock store for QA. The certification case was deliberately left at **Decision Pending**; no approval, rejection, or conditional certification decision was entered.
- The ZIP excludes `node_modules` and sandbox-only browser logs. The lockfile and built `dist` output are included.
