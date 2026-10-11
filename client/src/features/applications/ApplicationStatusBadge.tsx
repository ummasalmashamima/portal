import { StatusBadge } from "@/components/ui/Primitives";
import type { ApplicationStatus } from "@/types/application";
export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) { return <StatusBadge status={status} />; }
