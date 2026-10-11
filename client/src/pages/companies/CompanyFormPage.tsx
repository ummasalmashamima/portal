import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, ErrorState, LoadingState } from "@/components/ui/Primitives";
import { PageHeader } from "@/components/ui/Enterprise";
import { CompanyForm } from "@/features/companies/CompanyForm";
import { useCompany } from "@/hooks/useCompanies";

export function CompanyFormPage({ mode = "create" }: { mode?: "create" | "edit" }) { const { companyId } = useParams(); const navigate = useNavigate(); const edit = mode === "edit"; const { company, loading, error } = useCompany(edit ? companyId : undefined); if (edit && loading) return <LoadingState />; if (edit && (error || !company)) return <div className="mx-auto max-w-2xl"><ErrorState message={error ?? "Company not found."} /><Button className="mt-4" onClick={() => navigate("/companies")}><ArrowLeft className="h-4 w-4" />Back to companies</Button></div>; return <div className="mx-auto max-w-[1400px]"><PageHeader eyebrow={edit ? "Company registry · Edit" : "Company registry · New"} title={edit ? "Edit company" : "Add new company"} description={edit ? `Update the central record for ${company?.legalName}.` : "Create the company once, then reuse it across the entire certification lifecycle."} actions={<Button variant="outline" onClick={() => navigate(edit ? `/companies/${company?.id}` : "/companies")}><ArrowLeft className="h-4 w-4" />Back to companies</Button>} /><div className="mt-7"><CompanyForm company={company ?? undefined} /></div></div>; }
