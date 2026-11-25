// The teacher bell: updates on the requests this teacher sent to the admins (an admin started on
// one, or fixed it) over the last 14 days. "New" = changed since the bell was last opened.
import { useCallback, useEffect, useState } from "react";
import { listMyRequests, requestKindLabel } from "../api/requests";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/settings/SettingsContext";

const WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
const POLL_MS = 60000;
const seenKey = (id) => `cs-bell-seen-${id}`;

const ago = (iso) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.floor(m / 60)} h ago`;
  const d = Math.floor(m / 1440);
  return d === 1 ? "yesterday" : `${d} days ago`;
};

function toItems(rows) {
  const since = Date.now() - WINDOW_MS;
  return rows
    .map((r) => {
      const at = r.status === "fixed" ? r.resolved_at : r.status === "in_progress" ? r.claimed_at : null;
      if (!at || new Date(at).getTime() < since) return null;
      const what = `${requestKindLabel(r.kind)}${r.subject ? ` · ${r.subject}` : ""}`;
      return {
        id: `req-${r.id}-${r.status}`,
        at,
        title: r.status === "fixed" ? "Request fixed" : "Admin is working on your request",
        text: r.status === "fixed" ? `${what}, fixed by ${r.resolved_by_name || "an admin"}` : `${what}, picked up by ${r.claimed_by_name || "an admin"}`,
        time: ago(at),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.at.localeCompare(a.at));
}

export function useRequestNotifications() {
  const { session } = useAuth();
  const { notifyRequestUpdates } = useSettings();
  const userId = session?.id;
  const enabled = session?.apiRole === "teacher" && notifyRequestUpdates;
  const [items, setItems] = useState([]);
  const [seenAt, setSeenAt] = useState(() => {
    try {
      return localStorage.getItem(seenKey(userId)) || "";
    } catch {
      return "";
    }
  });

  useEffect(() => {
    if (!enabled) return undefined;
    let live = true;
    const load = () =>
      listMyRequests()
        .then((rows) => live && setItems(toItems(rows)))
        .catch(() => {}); // the bell just stays as it was
    load();
    const t = setInterval(() => document.visibilityState === "visible" && load(), POLL_MS);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [enabled]);

  const markSeen = useCallback(() => {
    const now = new Date().toISOString();
    setSeenAt(now);
    try {
      localStorage.setItem(seenKey(userId), now);
    } catch {
      /* storage blocked */
    }
  }, [userId]);

  const shown = enabled ? items : [];
  return { items: shown, hasNew: shown.some((n) => n.at > seenAt), markSeen };
}
