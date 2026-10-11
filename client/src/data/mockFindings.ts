import type { FindingRecord } from "@/types/finding";

// Each record points to one of the existing audit fixtures; no company, application, or audit is duplicated.
export const mockFindings: FindingRecord[] = [
  {
    id: "FND-000001", findingNumber: "FND-000001", auditId: "audit-001", auditNumber: "AUD-000102", applicationId: "app-001", companyId: "company-001", standard: "ISO 14001",
    clause: "6.2", findingType: "Observation", description: "Environmental objectives are documented but need clearer ownership at site level.",
    objectiveEvidence: "Reviewed the environmental objectives register and interviewed the site compliance coordinator; ownership and review cadence were not stated for two objectives.",
    responsiblePersonId: "auditor-001", responsiblePerson: "Tariq Mahmud", correction: "", rootCause: "", correctiveAction: "Confirm an accountable owner and review cadence for each site objective.",
    targetDate: "2026-10-18", evidenceOfClosure: "", status: "Open", reviewerDecision: "Open", reviewerComments: "",
    createdBy: "Tariq Mahmud", createdDate: "28 Sep 2026", lastUpdated: "28 Sep 2026", documents: [],
  },
  {
    id: "FIND-000045", findingNumber: "FIND-000045", auditId: "audit-001", auditNumber: "AUD-000102", applicationId: "app-001", companyId: "company-001", standard: "ISO 14001",
    clause: "6.1.2", findingType: "Major Nonconformity", description: "The environmental aspect register does not include the current finishing-line chemical storage activities.",
    objectiveEvidence: "The aspect register dated 12 Aug 2026 was compared with the finishing-line chemical inventory and site walk-through; three active storage locations were absent.",
    responsiblePersonId: "auditor-004", responsiblePerson: "Jane Smith", correction: "", rootCause: "", correctiveAction: "", targetDate: "2026-10-15", evidenceOfClosure: "", status: "Open", reviewerDecision: "Open", reviewerComments: "",
    createdBy: "Tariq Mahmud", createdDate: "28 Sep 2026", lastUpdated: "28 Sep 2026", documents: [
      { id: "fd-045-v1", fileName: "Finishing-line-site-observation.pdf", documentType: "Objective Evidence", version: "v1.0", uploadedBy: "Tariq Mahmud", uploadDate: "28 Sep 2026", relatedFinding: "FIND-000045", description: "Site walk-through notes and register comparison." },
    ],
  },
  {
    id: "FIND-000046", findingNumber: "FIND-000046", auditId: "audit-003", auditNumber: "AUD-000108", applicationId: "app-005", companyId: "company-005", standard: "ISO 14064",
    clause: "6.3.1", findingType: "Major Nonconformity", description: "The quantified emissions inventory excludes refrigerant losses recorded in maintenance logs.",
    objectiveEvidence: "Refrigerant service logs for Q2 and Q3 were sampled against the greenhouse-gas inventory workbook; three service entries were not included in the calculation boundary.",
    responsiblePersonId: "auditor-003", responsiblePerson: "Priya Sen", correction: "The current inventory is being reconciled to the maintenance records.",
    rootCause: "The inventory preparation checklist did not require a review of refrigerant maintenance records.",
    correctiveAction: "Revise the inventory checklist, reconcile service records quarterly, and retain evidence of independent review.", targetDate: "2026-09-12", evidenceOfClosure: "", status: "Correction Required", reviewerDecision: "Correction Required", reviewer: "Tariq Mahmud", reviewerComments: "Provide the reconciled inventory and evidence that the control will be repeated each quarter.", decisionDate: "20 Sep 2026",
    createdBy: "Priya Sen", createdDate: "11 Sep 2026", lastUpdated: "20 Sep 2026", documents: [
      { id: "fd-046-v1", fileName: "Refrigerant-service-log.xlsx", documentType: "Objective Evidence", version: "v1.0", uploadedBy: "Priya Sen", uploadDate: "11 Sep 2026", relatedFinding: "FIND-000046", description: "Sampled service log used during fieldwork." },
      { id: "fd-046-v2", fileName: "CAP-response-draft.pdf", documentType: "Corrective Action Evidence", version: "v1.0", uploadedBy: "Chen Rong", uploadDate: "18 Sep 2026", relatedFinding: "FIND-000046", description: "Initial corrective action proposal; reviewer requested additional evidence." },
    ],
  },
  {
    id: "FIND-000047", findingNumber: "FIND-000047", auditId: "audit-004", auditNumber: "AUD-000097", applicationId: "app-002", companyId: "company-001", standard: "ISO 9001",
    clause: "7.1.5.2", findingType: "Minor Nonconformity", description: "One measuring device was used after its calibration interval had elapsed.",
    objectiveEvidence: "Calibration label and instrument register for device QI-44 showed a due date of 14 Aug 2026; production records confirmed use on 18 Aug 2026.",
    responsiblePersonId: "auditor-001", responsiblePerson: "Tariq Mahmud", correction: "Device QI-44 was removed from service and calibrated before release.",
    rootCause: "The monthly due-date review did not include instruments held at the finishing site.",
    correctiveAction: "Add the finishing site to the centralized calibration alert and verify the full instrument list monthly.", targetDate: "2026-09-05", evidenceOfClosure: "Updated calibration certificate and September instrument-list review were verified.", status: "Closed", reviewerDecision: "Closed", reviewer: "Tariq Mahmud", reviewerComments: "Correction and effectiveness evidence accepted.", decisionDate: "05 Sep 2026",
    createdBy: "Tariq Mahmud", createdDate: "18 Aug 2026", lastUpdated: "05 Sep 2026", documents: [
      { id: "fd-047-v1", fileName: "QI-44-calibration-certificate.pdf", documentType: "Closure Evidence", version: "v1.0", uploadedBy: "Rahim Ahmed", uploadDate: "03 Sep 2026", relatedFinding: "FIND-000047", description: "Current calibration certificate and closure verification." },
    ],
  },
  {
    id: "FIND-000048", findingNumber: "FIND-000048", auditId: "audit-002", auditNumber: "AUD-000104", applicationId: "app-003", companyId: "company-002", standard: "ISO 9001",
    clause: "8.5.1", findingType: "Minor Nonconformity", description: "The sewing-line work instruction displayed at station 4 did not show the current revision.",
    objectiveEvidence: "The displayed instruction was revision 02; the controlled document register identifies revision 03 as effective from 22 Sep 2026.",
    responsiblePersonId: "auditor-002", responsiblePerson: "Marcus Lee", correction: "", rootCause: "", correctiveAction: "", targetDate: "2026-10-20", evidenceOfClosure: "", status: "Accepted", reviewerDecision: "Accepted", reviewer: "Tariq Mahmud", reviewerComments: "Finding accepted. Submit evidence of the revised point-of-use control before closure.", decisionDate: "27 Sep 2026",
    createdBy: "Marcus Lee", createdDate: "27 Sep 2026", lastUpdated: "27 Sep 2026", documents: [],
  },
  {
    id: "FIND-000049", findingNumber: "FIND-000049", auditId: "audit-005", auditNumber: "AUD-000091", applicationId: "app-007", companyId: "company-004", standard: "ISO 9001",
    clause: "9.1.1", findingType: "Opportunity for Improvement", description: "Trend analysis of customer complaints could distinguish repeat causes by product family.",
    objectiveEvidence: "The sampled quarterly review reported complaint totals but did not segment recurring causes by product family.",
    responsiblePersonId: "auditor-002", responsiblePerson: "Marcus Lee", correction: "A draft product-family view has been added to the quarterly review.",
    rootCause: "The existing reporting template was designed around monthly totals only.",
    correctiveAction: "Include complaint cause and product-family trends in the next management review pack.", targetDate: "2026-10-25", evidenceOfClosure: "Draft trend chart and proposed review agenda uploaded for verification.", status: "CAP Submitted", reviewerDecision: "Open", reviewerComments: "", createdBy: "Marcus Lee", createdDate: "15 Jul 2026", lastUpdated: "26 Sep 2026", documents: [
      { id: "fd-049-v1", fileName: "Complaint-trend-chart.xlsx", documentType: "Corrective Action Evidence", version: "v1.0", uploadedBy: "Li Wei", uploadDate: "26 Sep 2026", relatedFinding: "FIND-000049", description: "First version of the product-family trend chart." },
    ],
  },
  {
    id: "FIND-000050", findingNumber: "FIND-000050", auditId: "audit-003", auditNumber: "AUD-000108", applicationId: "app-005", companyId: "company-005", standard: "ISO 14064",
    clause: "7.3", findingType: "Observation", description: "Evidence retention periods are not stated on the carbon data collection worksheet.",
    objectiveEvidence: "The site carbon data worksheet has no field or instruction for retention period and archive location.",
    responsiblePersonId: "auditor-005", responsiblePerson: "Nabil Hossain", correction: "The worksheet is being updated to include retention and archive-location fields.",
    rootCause: "The worksheet was adapted from an earlier operational template without the records-control section.",
    correctiveAction: "Approve and issue the revised worksheet and brief data owners on the record-retention expectations.", targetDate: "2026-09-22", evidenceOfClosure: "", status: "Open", reviewerDecision: "Open", reviewerComments: "", createdBy: "Priya Sen", createdDate: "12 Sep 2026", lastUpdated: "24 Sep 2026", documents: [],
  },
];
