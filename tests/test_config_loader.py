"""Tests for LayeredConfigLoader."""

from __future__ import annotations

import pytest

from src.utils.config_loader import LayeredConfigLoader, _deep_merge


class TestDeepMerge:
    """Test the default deep merge strategy."""

    def test_dict_merge(self):
        base = {"a": 1, "b": {"c": 2}}
        override = {"b": {"d": 3}}
        result = _deep_merge(base, override)
        assert result == {"a": 1, "b": {"c": 2, "d": 3}}

    def test_list_merge_dedup(self):
        base = ["a", "b"]
        override = ["b", "c"]
        result = _deep_merge(base, override)
        assert result == ["a", "b", "c"]

    def test_scalar_override(self):
        base = {"key": "old"}
        override = {"key": "new"}
        result = _deep_merge(base, override)
        assert result == {"key": "new"}

    def test_nested_deep_merge(self):
        base = {"l1": {"l2": {"a": 1}}}
        override = {"l1": {"l2": {"b": 2}}}
        result = _deep_merge(base, override)
        assert result == {"l1": {"l2": {"a": 1, "b": 2}}}


class TestLayeredConfigLoader:
    """Test configuration loading."""

    def test_defaults_only(self):
        loader = LayeredConfigLoader(
            defaults={"key": "value"},
            paths=[],
        )
        config = loader.load()
        assert config == {"key": "value"}

    def test_load_single_file(self, tmp_path):
        config_path = tmp_path / "config.json"
        config_path.write_text('{"key": "override", "new_key": "new"}')

        loader = LayeredConfigLoader(
            defaults={"key": "default", "other": "remains"},
            paths=[config_path],
        )
        config = loader.load()
        assert config["key"] == "override"
        assert config["new_key"] == "new"
        assert config["other"] == "remains"

    def test_merge_lists(self, tmp_path):
        config_path = tmp_path / "config.json"
        config_path.write_text('{"items": ["c", "d"]}')

        loader = LayeredConfigLoader(
            defaults={"items": ["a", "b"]},
            paths=[config_path],
        )
        config = loader.load()
        assert "a" in config["items"]
        assert "b" in config["items"]
        assert "c" in config["items"]
        assert "d" in config["items"]

    def test_missing_file_skipped(self, tmp_path):
        loader = LayeredConfigLoader(
            defaults={"key": "value"},
            paths=[tmp_path / "nonexistent.json"],
        )
        config = loader.load()
        assert config == {"key": "value"}

    def test_bad_json_skipped(self, tmp_path):
        bad_path = tmp_path / "bad.json"
        bad_path.write_text("not json")
        good_path = tmp_path / "good.json"
        good_path.write_text('{"key": "good"}')

        loader = LayeredConfigLoader(
            defaults={"key": "default"},
            paths=[bad_path, good_path],
        )
        config = loader.load()
        assert config["key"] == "good"

    def test_override_then_merge(self, tmp_path):
        path1 = tmp_path / "1.json"
        path1.write_text('{"a": 1, "nested": {"x": 1}}')
        path2 = tmp_path / "2.json"
        path2.write_text('{"b": 2, "nested": {"y": 2}}')

        loader = LayeredConfigLoader(
            defaults={"base": "value"},
            paths=[path1, path2],
        )
        config = loader.load()
        assert config["a"] == 1
        assert config["b"] == 2
        assert config["nested"]["x"] == 1
        assert config["nested"]["y"] == 2


class TestSafetyIntegration:
    """Test config loader with safety-like config structure."""

    def test_safety_config_merge(self, tmp_path):
        defaults = {
            "emergency_keywords": {
                "diabetes": ["severe low", "passed out"],
            },
            "dosing_patterns": [r"take \d+ units"],
        }
        override_path = tmp_path / "safety.json"
        override_path.write_text('{"emergency_keywords": {"mental": ["suicide"]}}')

        loader = LayeredConfigLoader(defaults=defaults, paths=[override_path])
        config = loader.load()

        assert "diabetes" in config["emergency_keywords"]
        assert "mental" in config["emergency_keywords"]
        assert "take \\d+ units" in config["dosing_patterns"]
