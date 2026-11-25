// src/pages/Reports/WeeklyBreakdownCard.jsx — week-wise attendance, change from the previous week,
// and lectures / labs held, for the selected batch (or all batches) and date range
import { Icon } from "./icons";
import { BATCHES, formatRange, weeklyBreakdown } from "./reportsMock";

function Change({ value }) {
  if (value === null) return <span className="rp-wchg">–</span>;
  if (value === 0) return <span className="rp-wchg">0%</span>;
  const up = value > 0;
  return (
    <span className={`rp-wchg ${up ? "up" : "dn"}`}>
      <Icon name={up ? "arrowUp" : "arrowDown"} size={12} strokeWidth={2.6} />
      {Math.abs(value)}%
      <span className="sr-only">{up ? " up" : " down"} from the previous week</span>
    </span>
  );
}

function WeeklyBreakdownCard({ batchIndex, allMode, from, to }) {
  const rows = weeklyBreakdown(batchIndex, allMode, from, to);
  const scope = allMode ? "All batches" : BATCHES[batchIndex].group;

  return (
    <section className="rp-card rp-weekcard" aria-label="Weekly breakdown">
      <h4>Weekly breakdown</h4>
      <div className="rp-rs">
        {scope} · {formatRange(from, to)}
      </div>
      {rows.length ? (
        <div className="rp-wscr">
          <table className="rp-wtab">
            <thead>
              <tr>
                <th scope="col">Week</th>
                <th scope="col">Attendance</th>
                <th scope="col">Change</th>
                <th scope="col">Lec / Lab</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.week}>
                  <th scope="row">
                    W{r.week}
                    {r.best && <span className="rp-wtag best">Best</span>}
                    {r.lowest && <span className="rp-wtag low">Low</span>}
                  </th>
                  <td>
                    <span className="rp-wpct">{r.v}%</span>
                  </td>
                  <td>
                    <Change value={r.change} />
                  </td>
                  <td className="rp-wses">
                    {r.lecs} / {r.labs}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rp-empty">No classes in this date range.</div>
      )}
    </section>
  );
}

export default WeeklyBreakdownCard;
