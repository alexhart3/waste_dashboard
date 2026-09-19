import KpiRow from "@/components/KpiRow";
import PickupsByLocation from "@/components/PickupsByLocation";


export default function Home() {
  return (
    <>
      <KpiRow />
      <div className="grid">
        <PickupsByLocation />
      </div>
    </>
  );
}
