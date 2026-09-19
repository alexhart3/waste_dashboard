type KpiCardProps = {
    label: string;
    value: string;
    unit?: string;
    sub: string;
    color: string;
}

export default function KpiCard({ label, value, unit, sub, color }: KpiCardProps) {
    return (
        <div className="kpi">
            <span className="lbl">
                <i className="dot" style={{ background: color }}></i>
                {label}
            </span>
            <span className="v">
                {value}
                {unit && <small>{unit}</small>}
            </span>
            <span className="sub">{sub}</span>
        </div>
    );
}