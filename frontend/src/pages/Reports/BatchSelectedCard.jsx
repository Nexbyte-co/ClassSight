import { Icon } from "./icons";
import { formatRange } from "./reportsUtil";
import { useReports } from "./useReports";
import Dropdown from "../Classes/Dropdown";

function BatchSelectedCard({ subject, batchIndex, allMode, from, to, onSubjectChange, onBatchChange, onToggleAll }) {
  const { BATCHES, SUBJECTS, batchesOfSubject, batchStats } = useReports();
  const batch = BATCHES[batchIndex];
  const siblings = batchesOfSubject(subject);
  const stats = batchStats(batchIndex, from, to);

  return (
    <section className={`rp-card rp-batch ${allMode ? "off" : ""}`} aria-label="Batch selected">
      <div className="rp-bl">
        <div className="rp-rt">
          <span className="rp-ri"><Icon name="users" size={20} /></span>
          <div>
            <h2>Batch selected</h2>
            <div className="rp-rs rp-rs-tight">{batch.group} · {SUBJECTS[subject].name}</div>
          </div>
        </div>
        <div className="rp-sels">
          <div className="rp-sel-f">
            <span aria-hidden="true">Subject</span>
            <Dropdown ariaLabel="Subject" value={subject} onChange={onSubjectChange} options={SUBJECTS.map((s, i) => ({ value: i, label: s.name }))} />
          </div>
          <div className="rp-sel-f">
            <span aria-hidden="true">Batch</span>
            <Dropdown ariaLabel="Batch" value={batchIndex} onChange={onBatchChange} options={siblings.map((b) => ({ value: b.index, label: b.group }))} />
          </div>
        </div>
      </div>

      <div className="rp-brt">
        <div className="rp-brh"><span className="rp-abl">Average attendance · {formatRange(from, to)}</span></div>
        <div className="rp-bout">
          {stats ? (
            <div className="rp-bw">
              <div className="rp-bwl">
                <div className="rp-abn">{stats.avg}%</div>
                <span className={`rp-abd ${stats.delta < 0 ? "dn" : ""}`}>
                  {stats.delta >= 0 ? `▲ +${stats.delta}` : `▼ ${stats.delta}`}% vs subject avg
                </span>
              </div>
              <div className="rp-abst">
                <div className="rp-abox">
                  <div><b>Lecs held</b><span>{stats.lecsHeld}</span></div>
                  <div><b>Labs held</b><span>{stats.labsHeld}</span></div>
                </div>
                <div className="rp-abox">
                  <div><b>Best week</b><span>W{stats.best.week} · {stats.best.v}%</span></div>
                  <div><b>Lowest week</b><span>W{stats.lowest.week} · {stats.lowest.v}%</span></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rp-empty">No classes in this date range.</div>
          )}
        </div>
        <button type="button" className={`rp-all ${allMode ? "on" : ""}`} aria-pressed={allMode} onClick={onToggleAll}>
          <Icon name="users" size={15} />
          All classes average
        </button>
      </div>
    </section>
  );
}

export default BatchSelectedCard;
