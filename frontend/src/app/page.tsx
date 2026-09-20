import KpiRow from "@/components/KpiRow";
import OverflowByBin from "@/components/OverflowByBin";
import PickupsByLocation from "@/components/PickupsByLocation";


export default function Home() {
  return (
    <>
      <KpiRow />
      <div className="grid">
        <PickupsByLocation />
        <OverflowByBin />
      </div>
    </>
  );
}
