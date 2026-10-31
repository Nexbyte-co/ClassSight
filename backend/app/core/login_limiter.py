"""In-memory throttle for failed logins.

Tracks recent failures per email and per client IP in a sliding window; once either
limit is reached, further logins are refused (even with the right password) until the
oldest failure leaves the window. State lives in this process only, so it resets on
restart and is not shared between workers; the API runs as a single uvicorn process.
"""

import threading
import time
from collections import defaultdict, deque

from app.core.config import get_settings

# Above this many tracked keys, keys with no recent failures are dropped.
_MAX_TRACKED_KEYS = 10_000


class LoginLimiter:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._by_email: dict[str, deque[float]] = defaultdict(deque)
        self._by_ip: dict[str, deque[float]] = defaultdict(deque)

    @staticmethod
    def _prune(failures: deque[float], now: float, window: int) -> None:
        while failures and now - failures[0] >= window:
            failures.popleft()

    def retry_after(self, email: str, ip: str) -> int:
        """Seconds until a login attempt is allowed again; 0 if allowed now."""
        settings = get_settings()
        window = settings.login_window_seconds
        now = time.monotonic()
        email = email.strip().lower()
        wait = 0
        with self._lock:
            for table, key, limit in (
                (self._by_email, email, settings.login_max_failures_per_email),
                (self._by_ip, ip, settings.login_max_failures_per_ip),
            ):
                failures = table.get(key)
                if not failures:
                    continue
                self._prune(failures, now, window)
                if len(failures) >= limit:
                    wait = max(wait, int(window - (now - failures[0])) + 1)
        return wait

    def record_failure(self, email: str, ip: str) -> None:
        window = get_settings().login_window_seconds
        now = time.monotonic()
        email = email.strip().lower()
        with self._lock:
            if len(self._by_email) + len(self._by_ip) > _MAX_TRACKED_KEYS:
                self._drop_stale(now, window)
            for table, key in ((self._by_email, email), (self._by_ip, ip)):
                failures = table[key]
                self._prune(failures, now, window)
                failures.append(now)

    def clear_email(self, email: str) -> None:
        """A successful login forgives that email's earlier failures."""
        with self._lock:
            self._by_email.pop(email.strip().lower(), None)

    def reset(self) -> None:
        with self._lock:
            self._by_email.clear()
            self._by_ip.clear()

    def _drop_stale(self, now: float, window: int) -> None:
        for table in (self._by_email, self._by_ip):
            for key in list(table):
                self._prune(table[key], now, window)
                if not table[key]:
                    del table[key]


login_limiter = LoginLimiter()
