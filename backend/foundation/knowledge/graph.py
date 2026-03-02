"""Knowledge graph interface backed by Neo4j."""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


class KnowledgeGraph:
    """Thin wrapper around Neo4j for entity/relation CRUD and Cypher queries."""

    def __init__(self, uri: str = "", user: str = "", password: str = ""):
        self._uri = uri
        self._user = user
        self._password = password
        self._driver = None

    def _get_driver(self):
        if self._driver is None:
            try:
                from neo4j import GraphDatabase  # type: ignore[import-untyped]

                from backend.config.settings import settings

                uri = self._uri or settings.neo4j_url
                user = self._user or settings.neo4j_user
                password = self._password or settings.neo4j_password
                self._driver = GraphDatabase.driver(uri, auth=(user, password))
            except Exception as exc:
                logger.warning(f"Neo4j driver init failed: {exc}")
                return None
        return self._driver

    def close(self):
        if self._driver:
            self._driver.close()
            self._driver = None

    def query(self, query: str, industry_id: str, **params: Any) -> list[dict[str, Any]]:
        """Run a Cypher query scoped to an industry namespace and return records as dicts."""
        driver = self._get_driver()
        if driver is None:
            return []
        try:
            with driver.session() as session:
                result = session.run(query, industry_id=industry_id, **params)
                return [dict(record) for record in result]
        except Exception as exc:
            logger.error(f"Neo4j query failed: {exc}")
            return []

    def add_entity(self, entity: dict[str, Any], industry_id: str) -> bool:
        """Merge an entity node with label from entity['type'] and properties."""
        driver = self._get_driver()
        if driver is None:
            return False
        label = entity.get("type", "Entity")
        props = {k: v for k, v in entity.items() if k != "type"}
        props["industry_id"] = industry_id
        cypher = (
            f"MERGE (n:{label} {{id: $id, industry_id: $industry_id}}) "
            f"SET n += $props RETURN n"
        )
        try:
            with driver.session() as session:
                session.run(cypher, id=entity.get("id", ""), industry_id=industry_id, props=props)
            return True
        except Exception as exc:
            logger.error(f"Neo4j add_entity failed: {exc}")
            return False

    def add_relation(self, source: str, target: str, relation_type: str, industry_id: str) -> bool:
        """Create or merge a typed relationship between two entity ids."""
        driver = self._get_driver()
        if driver is None:
            return False
        cypher = (
            "MATCH (a {id: $source, industry_id: $ind}), (b {id: $target, industry_id: $ind}) "
            f"MERGE (a)-[r:{relation_type.upper().replace(' ', '_')}]->(b) "
            "RETURN type(r)"
        )
        try:
            with driver.session() as session:
                session.run(cypher, source=source, target=target, ind=industry_id)
            return True
        except Exception as exc:
            logger.error(f"Neo4j add_relation failed: {exc}")
            return False

    def get_subgraph(self, center_label: str, industry_id: str, depth: int = 2) -> dict[str, Any]:
        """Return nodes and edges within depth hops of nodes matching center_label."""
        cypher = (
            f"MATCH path = (n {{industry_id: $ind}})-[*0..{depth}]-(m {{industry_id: $ind}}) "
            f"WHERE ANY(lbl IN labels(n) WHERE lbl = $label) "
            "RETURN nodes(path) AS nodes, relationships(path) AS rels "
            "LIMIT 100"
        )
        rows = self.query(cypher, industry_id=industry_id, label=center_label)
        seen_nodes: dict[str, dict] = {}
        edges: list[dict] = []
        for row in rows:
            for node in row.get("nodes", []):
                nid = dict(node).get("id", str(node.id))
                if nid not in seen_nodes:
                    seen_nodes[nid] = {"id": nid, "label": dict(node).get("label", nid), "type": list(node.labels)[0] if node.labels else "Entity"}
            for rel in row.get("rels", []):
                edges.append({
                    "source": dict(rel.start_node).get("id", ""),
                    "target": dict(rel.end_node).get("id", ""),
                    "relation": rel.type,
                })
        return {"nodes": list(seen_nodes.values()), "edges": edges}
