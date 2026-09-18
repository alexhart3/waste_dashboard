import FilterSelect from "@/components/FilterSelect";

export default function FilterBar() {
  return (
    <section className="filters">
        <div className="fgroup">
            <span className="lbl">Date Range</span>
            <div className="daterange">
                <input type="date" className="ctl" defaultValue="2026-09-01" aria-label="From date" />
                <span>–</span>
                <input type="date" className="ctl" defaultValue="2026-09-18" aria-label="To date" />
            </div>
        </div>

        <FilterSelect
            id="size"
            label="Container size"
            options={["All sizes", "32 gal cart", "64 gal cart", "96 gal cart", "2 yd dumpster", "4 yd dumpster"]}
        />
        <FilterSelect
            id="driver"
            label="Driver"
            options={["All drivers", "Driver 1", "Driver 2", "Driver 3"]}
        />
        <FilterSelect
            id="location"
            label="Location"
            options={["All locations", "Building A", "Building B", "Building C"]}
        />
        <FilterSelect
            id="stream"
            label="Waste stream"
            options={["All streams", "Landfill", "Recycling", "Compost"]}
        />

        <span className="fnote">Filters currently do not work for sprint 1.</span>
    </section>
  );
}