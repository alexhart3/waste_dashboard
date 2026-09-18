type FilterSelectProps = {
    id: string;
    label: string;
    options: string[];
}

export default function FilterSelect({id, label, options}: FilterSelectProps) {
    return (
        <div className="fgroup">
            <label className="lbl" htmlFor={id}>{label}</label>
            <select className="ctl" id={id}>
                {options.map((option) => (
                    <option key={option}>{option}</option>
                ))}
            </select>
        </div>
    )
}