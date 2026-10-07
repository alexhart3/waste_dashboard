type FilterSelectProps = {
    id: string;
    label: string;
    options: string[];
    value?: string;
    onChange?: (value: string) => void;
}

export default function FilterSelect({id, label, options, value = "", onChange}: FilterSelectProps) {
    return (
        <div className="fgroup">
            <label className="lbl" htmlFor={id}>{label}</label>
            <select className="ctl" id={id} value={value} onChange={(event) => onChange?.(event.target.value)}>
                <option value="">{options[0]}</option>
                {options.slice(1).map((option) => (
                    <option key={option} value={option}>{option}</option>
                ))}
            </select>
        </div>
    )
}
