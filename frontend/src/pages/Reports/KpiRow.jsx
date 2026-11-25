import { Icon } from "./icons";
import { useReports } from "./useReports";

function Half({ icon, label, value }) {
  return (
    <div className="rp-half">
      <div className="rp-kico"><Icon name={icon} size={22} /></div>
      <div>
        <div className="rp-k">{label}</div>
        <div className="rp-n">{value}</div>
      </div>
    </div>
  );
}

function KpiRow() {
  const { KPIS } = useReports();
  return (
    <div className="rp-kpis">
      <div className="rp-kpi rp-kpi-wide">
        <Half icon="book" label="Lectures held" value={KPIS.lecturesHeld} />
        <Half icon="monitor" label="Labs held" value={KPIS.labsHeld} />
      </div>
      <div className="rp-kpi">
        <Half icon="users" label="Total batches" value={KPIS.totalBatches} />
      </div>
    </div>
  );
}

export default KpiRow;
