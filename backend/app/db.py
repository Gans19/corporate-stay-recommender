"""Neo4j / CognoDB driver lifecycle and query helpers.

The driver is created once and reused (it is a connection pool). All queries
run through :func:`run_read` / :func:`run_write` which use *parameterised*
Cypher only — no string concatenation of user input into queries.
"""
from __future__ import annotations

import logging
from contextlib import contextmanager
from typing import Any, Iterator

from neo4j import Driver, GraphDatabase, Session
from neo4j.exceptions import AuthError, Neo4jError, ServiceUnavailable

from .config import get_settings

logger = logging.getLogger("app.db")


class DatabaseUnavailable(Exception):
    """Raised when the graph database cannot be reached or authenticated."""


_driver: Driver | None = None


def get_driver() -> Driver:
    """Return the shared driver, creating it lazily on first use."""
    global _driver
    if _driver is None:
        settings = get_settings()
        logger.info("Creating Neo4j driver for %s", settings.neo4j_uri)
        _driver = GraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password),
            # Keep the pool small: the CognoDB free tier allows up to 200
            # connections but only has 256 MB RAM, so we stay conservative.
            max_connection_pool_size=20,
            connection_acquisition_timeout=30,
        )
    return _driver


def close_driver() -> None:
    global _driver
    if _driver is not None:
        _driver.close()
        _driver = None


def verify_connectivity() -> bool:
    """Ping the database. Returns True if reachable, False otherwise."""
    try:
        get_driver().verify_connectivity()
        return True
    except (ServiceUnavailable, AuthError, Neo4jError, OSError) as exc:
        logger.warning("Database connectivity check failed: %s", exc)
        return False


@contextmanager
def _session() -> Iterator[Session]:
    settings = get_settings()
    driver = get_driver()
    try:
        with driver.session(database=settings.neo4j_database) as session:
            yield session
    except (ServiceUnavailable, AuthError, OSError) as exc:
        raise DatabaseUnavailable(str(exc)) from exc


def run_read(query: str, **params: Any) -> list[dict[str, Any]]:
    """Execute a read query with parameters and return a list of dict rows."""
    try:
        with _session() as session:
            result = session.execute_read(
                lambda tx: [record.data() for record in tx.run(query, **params)]
            )
        return result
    except (ServiceUnavailable, AuthError, OSError) as exc:
        raise DatabaseUnavailable(str(exc)) from exc


def run_write(query: str, **params: Any) -> list[dict[str, Any]]:
    """Execute a write query with parameters and return a list of dict rows."""
    try:
        with _session() as session:
            result = session.execute_write(
                lambda tx: [record.data() for record in tx.run(query, **params)]
            )
        return result
    except (ServiceUnavailable, AuthError, OSError) as exc:
        raise DatabaseUnavailable(str(exc)) from exc
