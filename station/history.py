from contextlib import closing
from datetime import datetime, timezone
import sqlite3


class History:
    def __init__(self, path):
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with closing(self.connect()) as connection:
            connection.execute("""
                CREATE TABLE IF NOT EXISTS scans (
                    id INTEGER PRIMARY KEY,
                    created_at TEXT NOT NULL,
                    mode TEXT NOT NULL,
                    model_source TEXT NOT NULL,
                    label TEXT NOT NULL,
                    destination TEXT NOT NULL,
                    score REAL NOT NULL,
                    inference_ms INTEGER NOT NULL,
                    elapsed_ms INTEGER NOT NULL,
                    hardware TEXT NOT NULL
                )
            """)
            connection.commit()

    def connect(self):
        connection = sqlite3.connect(self.path, timeout=0.5)
        connection.row_factory = sqlite3.Row
        return connection

    def record(self, result):
        values = {**result, "created_at": datetime.now(timezone.utc).isoformat(timespec="milliseconds")}
        with closing(self.connect()) as connection, connection:
            connection.execute("""
                INSERT INTO scans
                (created_at, mode, model_source, label, destination, score, inference_ms, elapsed_ms, hardware)
                VALUES (:created_at, :mode, :model_source, :label, :destination,
                        :score, :inference_ms, :elapsed_ms, :hardware)
            """, values)

    def snapshot(self):
        with closing(self.connect()) as connection:
            connection.execute("BEGIN")
            summary = connection.execute("""
                SELECT count(*) AS total,
                       count(CASE WHEN mode = 'preview' THEN 1 END) AS previews,
                       count(CASE WHEN destination = 'reject' THEN 1 END) AS rejected,
                       count(CASE WHEN hardware = 'unconfirmed' THEN 1 END) AS unconfirmed,
                       count(CASE WHEN hardware = 'acknowledged' THEN 1 END) AS acknowledged
                FROM scans
            """).fetchone()
            rows = connection.execute("SELECT * FROM scans ORDER BY id DESC LIMIT 50").fetchall()
        return {"summary": dict(summary), "events": [dict(row) for row in rows]}
