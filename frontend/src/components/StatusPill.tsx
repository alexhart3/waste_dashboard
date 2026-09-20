import { ServiceStatus } from "../types/pickup";

export default function StatusPill({ status }: { status: ServiceStatus }) {
    return <span className={`pill s-${status}`}>{status}</span>;
}