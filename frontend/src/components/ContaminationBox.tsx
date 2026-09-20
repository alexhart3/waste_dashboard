type ContaminationBoxProps = {
    name: string;
    color: string;
    contaminated: number;
    pickups: number;
};

export default function ContaminationBox({ name, color, contaminated, pickups }: ContaminationBoxProps) {
  const percent = pickups > 0 ? Math.round((contaminated / pickups) * 100) : 0;

    return (
        <div className="cbox">
            <div className="top2">
                <span className="name">
                    <i className="sw" style={{ background: color }}></i>
                    {name}
                </span>
                <span className="pct">{percent}%</span>
            </div>

            <div className="bar" role="img" aria-label={`${name} contamination ${percent}%`}>
                <i style={{ width: `${percent}%`, background: color }}></i>
            </div>

            <div className="foot">
                {contaminated} of {pickups} pickups contaminated
            </div>
        </div>
    );
}