import ChartCard from "@/components/ChartCard"
import RecordsTable from "@/components/RecordsTable"

export default function RecordsPage() {
    return (
        <div className="grid">
            <ChartCard
                title="Collection records"
                subtitle="Every pickup submission, newest first"
                wide
            >
                <RecordsTable />
            </ChartCard>
        </div>
    )
}