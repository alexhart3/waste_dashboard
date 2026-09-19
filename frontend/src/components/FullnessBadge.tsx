function fullnessClass(percent: number) {
    if (percent < 50) return "f-lo";
    if (percent >= 85) return "f-hi";
    return "f-ok";
}

export default function FullnessBadge({ percent }: { percent: number }) {
    return (<span className={`fullpill ${fullnessClass(percent)}`}>{percent}%</span>);
}