"""Persistent storage helpers for the Orbsurv backend."""
from __future__ import annotations

import json
import os
from datetime import datetime
from threading import Lock
from typing import Any, Dict, List


class JsonStore:
    """A minimal thread-safe JSON line store."""

    def __init__(self, file_path: str) -> None:
        self.file_path = file_path
        self._lock = Lock()
        directory = os.path.dirname(self.file_path)
        if directory:
            os.makedirs(directory, exist_ok=True)
        if not os.path.exists(self.file_path):
            self._write([])

    def append(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Append a payload, adding a UTC timestamp, and return the stored record."""
        record = {**payload, "stored_at": datetime.utcnow().isoformat() + "Z"}
        with self._lock:
            entries = self._read()
            entries.append(record)
            self._write(entries)
        return record

    def all(self) -> List[Dict[str, Any]]:
        """Return a copy of stored entries."""
        with self._lock:
            return list(self._read())

    def _read(self) -> List[Dict[str, Any]]:
        with open(self.file_path, "r", encoding="utf-8") as fh:
            return json.load(fh)

    def _write(self, entries: List[Dict[str, Any]]) -> None:
        with open(self.file_path, "w", encoding="utf-8") as fh:
            json.dump(entries, fh, ensure_ascii=False, indent=2)
