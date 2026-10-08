"use client";

import FilterSelect from "@/components/FilterSelect";
import { useDashboardData } from "@/components/DashboardDataProvider";

export default function FilterBar() {
  const { filters, setFilters, resetFilters, options, filteredPickups, filteredSchedule } = useDashboardData();

  return (
    <section className="filters" aria-label="Dashboard filters">
      <div className="fgroup">
        <span className="lbl">Date range</span>
        <div className="daterange">
          <input
            type="date"
            className="ctl"
            value={filters.startDate}
            onChange={(event) => setFilters({ ...filters, startDate: event.target.value })}
            aria-label="From date"
          />
          <span aria-hidden="true">–</span>
          <input
            type="date"
            className="ctl"
            value={filters.endDate}
            onChange={(event) => setFilters({ ...filters, endDate: event.target.value })}
            aria-label="To date"
          />
        </div>
      </div>

      <FilterSelect
        id="size"
        label="Container size"
        options={["All sizes", ...options.containerSizes]}
        value={filters.containerSize}
        onChange={(containerSize) => setFilters({ ...filters, containerSize })}
      />
      <FilterSelect
        id="driver"
        label="Driver"
        options={["All drivers", ...options.drivers]}
        value={filters.driver}
        onChange={(driver) => setFilters({ ...filters, driver })}
      />
      <FilterSelect
        id="location"
        label="Location"
        options={["All locations", ...options.buildings]}
        value={filters.building}
        onChange={(building) => setFilters({ ...filters, building })}
      />
      <FilterSelect
        id="stream"
        label="Waste stream"
        options={["All streams", ...options.streams]}
        value={filters.stream}
        onChange={(stream) => setFilters({ ...filters, stream })}
      />

      <span className="filter-summary" aria-live="polite">
        {filteredPickups.length} pickups · {filteredSchedule.length} scheduled services
      </span>
      <button className="filter-reset" type="button" onClick={resetFilters}>Reset filters</button>
    </section>
  );
}
