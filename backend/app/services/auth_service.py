"""Local accounts and session tokens for the campaign desk.

Passwords are stored as PBKDF2 hashes. Session tokens are random and only
their hashes are kept, so a copied database cannot be used to sign in.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

from app.core.exceptions import AuthError

PASSWORD_ITERATIONS = 210_000
SESSION_DAYS = 14


@dataclass(frozen=True)
class Account:
    id: str
    name: str
    email: str


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), PASSWORD_ITERATIONS)
    return f"pbkdf2_sha256${PASSWORD_ITERATIONS}${salt}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algorithm, iterations, salt, digest = stored.split("$")
        rounds = int(iterations)
    except ValueError:
        return False
    if algorithm != "pbkdf2_sha256" or rounds < 1:
        return False
    candidate = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), rounds).hex()
    return hmac.compare_digest(candidate, digest)


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class AuthService:
    def __init__(self, database_path: Path) -> None:
        self.database_path = database_path

    def initialize(self) -> None:
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as connection:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT NOT NULL UNIQUE,
                    password_hash TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS sessions (
                    token_hash TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                );
                """
            )

    def sign_up(self, name: str, email: str, password: str) -> tuple[Account, str]:
        account = Account(id=str(uuid4()), name=name, email=email)
        now = _now()
        try:
            with self._connect() as connection:
                connection.execute(
                    "INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
                    (account.id, account.name, account.email, hash_password(password), now),
                )
        except sqlite3.IntegrityError as exc:
            raise AuthError(
                "An account with this email already exists.",
                status_code=409,
                code="account_exists",
            ) from exc
        return account, self._create_session(account.id)

    def sign_in(self, email: str, password: str) -> tuple[Account, str]:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT id, name, email, password_hash FROM users WHERE email = ?",
                (email,),
            ).fetchone()
        if row is None or not verify_password(password, row["password_hash"]):
            raise AuthError("The email or password is incorrect.", status_code=401, code="unauthorized")
        account = Account(id=row["id"], name=row["name"], email=row["email"])
        return account, self._create_session(account.id)

    def sign_out(self, token: str | None) -> None:
        if not token:
            return
        with self._connect() as connection:
            connection.execute("DELETE FROM sessions WHERE token_hash = ?", (_token_hash(token),))

    def account_for_token(self, token: str) -> Account | None:
        if not token:
            return None
        with self._connect() as connection:
            row = connection.execute(
                """
                SELECT users.id, users.name, users.email, sessions.expires_at
                FROM sessions
                JOIN users ON users.id = sessions.user_id
                WHERE sessions.token_hash = ?
                """,
                (_token_hash(token),),
            ).fetchone()
            if row is None:
                return None
            if row["expires_at"] <= _now():
                connection.execute("DELETE FROM sessions WHERE token_hash = ?", (_token_hash(token),))
                return None
        return Account(id=row["id"], name=row["name"], email=row["email"])

    def _create_session(self, user_id: str) -> str:
        token = secrets.token_urlsafe(32)
        expires = (datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS)).isoformat()
        with self._connect() as connection:
            connection.execute(
                "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
                (_token_hash(token), user_id, expires),
            )
        return token

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.database_path)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        return connection


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()
