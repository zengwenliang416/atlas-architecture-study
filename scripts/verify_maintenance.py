#!/usr/bin/env python3
"""Check documentation tiers and Agent Notes for Atlas.

The gate is the local stand-in for a docs CI job: word budgets, one line per
paragraph, history wording, note paths, note skeletons, and relative links.
"""

from __future__ import annotations

import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUDGET_PATH = ROOT / "scripts" / "doc-budgets.json"

HISTORY_WORDS = (
    "以前",
    "现在",
    "不再",
    "曾经",
    "原先",
    "如今",
    "尚未",
    "previously",
    "no longer",
    "used to",
    "formerly",
)

LIFECYCLES = {"proposed", "implemented", "rejected", "archived"}
CLASSES = {
    "feature",
    "bug-fix",
    "simplification",
    "architecture",
    "process",
    "testing",
}
NOTE_NAME = re.compile(r"^(\d{4})-(\d{2})-(\d{2})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$")
LINK = re.compile(r"\[[^\]]*\]\(([^)\s]+)\)")
HEADING = re.compile(r"^##\s+(.+?)\s*$")
LATIN = re.compile(r"[A-Za-z0-9_./:+#-]+")
CJK = re.compile(r"[\u4e00-\u9fff]")

FORBIDDEN_IMPLEMENTED = (
    "proposal",
    "plan",
    "migration plan",
    "acceptance criteria",
    "提案",
    "计划",
    "迁移计划",
    "验收标准",
)

SKIP_DIRS = {
    ".git",
    ".codex",
    "node_modules",
    "target",
    "dist",
    "dist-test",
    "outputs",
    "DerivedData",
}


def fail(errors: list[str], message: str) -> None:
    errors.append(message)


def iter_files() -> list[Path]:
    found: list[Path] = []
    for directory, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [name for name in dirnames if name not in SKIP_DIRS and not name.startswith(".")]
        # Keep the hidden maintenance tree, which os.walk would otherwise skip
        # after the filter above. Other dot directories stay pruned.
        if Path(directory) == ROOT and ".agents" not in dirnames and (ROOT / ".agents").is_dir():
            dirnames.append(".agents")
        if Path(directory) == ROOT and ".github" not in dirnames and (ROOT / ".github").is_dir():
            dirnames.append(".github")
        for name in filenames:
            found.append(Path(directory) / name)
    return found


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def standing_docs() -> list[Path]:
    docs: list[Path] = []
    for path in iter_files():
        name = path.name
        relative = rel(path)
        if name in {"AGENTS.md", "CLAUDE.md"}:
            docs.append(path)
        elif relative.startswith("docs/") and path.suffix == ".md":
            docs.append(path)
        elif relative in {".agents/notes/README.md"}:
            docs.append(path)
    return sorted(docs, key=rel)


def outside_fences(text: str) -> list[tuple[int, str]]:
    rows: list[tuple[int, str]] = []
    in_fence = False
    for lineno, line in enumerate(text.splitlines(), 1):
        if line.startswith("```"):
            in_fence = not in_fence
            continue
        if not in_fence:
            rows.append((lineno, line))
    return rows


def count_units(text: str) -> int:
    return len(CJK.findall(text)) + len(LATIN.findall(text))


def check_history(path: Path, text: str, errors: list[str]) -> None:
    lowered_words = tuple(word.lower() for word in HISTORY_WORDS)
    for lineno, line in outside_fences(text):
        lowered = line.lower()
        for word in lowered_words:
            if word in lowered:
                fail(errors, f"{rel(path)}:{lineno}: 变迁用词 {word}")


def check_wrap(path: Path, text: str, errors: list[str]) -> None:
    block: list[tuple[int, str]] = []

    def flush() -> None:
        nonlocal block
        if not block:
            return
        first = block[0][1].lstrip()
        structural = first.startswith(("#", "|", "-", "*", ">")) or bool(
            re.match(r"\d+\.\s", first)
        )
        if not structural and len(block) > 1:
            fail(
                errors,
                f"{rel(path)}:{block[0][0]}: 段落超过一行，请合成一行或改成列表",
            )
        block = []

    in_fence = False
    for lineno, line in enumerate(text.splitlines(), 1):
        if line.startswith("```"):
            flush()
            in_fence = not in_fence
            continue
        if in_fence or line.strip() == "":
            flush()
            continue
        block.append((lineno, line))
    flush()


def check_budgets(errors: list[str], print_counts: bool) -> None:
    docs = standing_docs()
    counts = {rel(path): count_units(path.read_text(encoding="utf-8")) for path in docs}
    if print_counts:
        for name, count in counts.items():
            print(f"{count:5d}  {name}")
    if not BUDGET_PATH.exists():
        fail(errors, "缺少 scripts/doc-budgets.json")
        return
    payload = json.loads(BUDGET_PATH.read_text(encoding="utf-8"))
    ceilings: dict[str, int] = payload["files"]
    for name, count in counts.items():
        if name not in ceilings:
            fail(errors, f"{name}: 常驻文档没有字数上限")
            continue
        ceiling = ceilings[name]
        if count > ceiling:
            fail(errors, f"{name}: 字数 {count} 超过上限 {ceiling}")
        elif count > int(ceiling * 0.95):
            print(f"warning: {name} 字数 {count} 已用掉上限 {ceiling} 的 95% 以上", file=sys.stderr)
    for name in ceilings:
        if name not in counts:
            fail(errors, f"scripts/doc-budgets.json 登记了不存在的常驻文档 {name}")


def note_files() -> list[Path]:
    root = ROOT / ".agents" / "notes"
    if not root.exists():
        return []
    return [path for path in root.rglob("*.md") if path.is_file()]


def check_note_tree(errors: list[str]) -> list[Path]:
    notes_root = ROOT / ".agents" / "notes"
    bodies: list[Path] = []
    if not notes_root.exists():
        fail(errors, "缺少 .agents/notes")
        return bodies
    for path in note_files():
        relative = path.relative_to(notes_root)
        parts = relative.parts
        if path.name == "INDEX.md" or "INDEX.md" in parts:
            fail(errors, f"{rel(path)}: 禁止笔记总索引")
            continue
        if parts == ("README.md",):
            continue
        if len(parts) == 2 and parts[1] == "AGENTS.md" and parts[0] in LIFECYCLES:
            continue
        if len(parts) != 3:
            fail(errors, f"{rel(path)}: 笔记路径必须是 lifecycle/class/yyyy-mm-dd-topic.md")
            continue
        lifecycle, kind, name = parts
        if lifecycle not in LIFECYCLES:
            fail(errors, f"{rel(path)}: 未知生命周期 {lifecycle}")
        if kind not in CLASSES:
            fail(errors, f"{rel(path)}: 未知分类 {kind}")
        match = NOTE_NAME.match(name)
        if not match:
            fail(errors, f"{rel(path)}: 文件名必须是 yyyy-mm-dd-topic.md")
        else:
            try:
                datetime(int(match.group(1)), int(match.group(2)), int(match.group(3)))
            except ValueError:
                fail(errors, f"{rel(path)}: 文件名日期无效")
        bodies.append(path)
    return bodies


def heading_names(text: str) -> list[tuple[int, str]]:
    found: list[tuple[int, str]] = []
    for lineno, line in enumerate(text.splitlines(), 1):
        match = HEADING.match(line)
        if match:
            title = re.sub(r"（.*?）|\(.*?\)", "", match.group(1)).strip().lower()
            found.append((lineno, title))
    return found


def section_body(lines: list[str], start: int) -> str:
    collected: list[str] = []
    for line in lines[start:]:
        if line.startswith("## "):
            break
        collected.append(line)
    return "\n".join(collected).strip()


def check_note_format(path: Path, errors: list[str]) -> None:
    text = path.read_text(encoding="utf-8-sig")
    lines = text.splitlines()
    lifecycle = path.relative_to(ROOT / ".agents" / "notes").parts[0]
    if len(lines) < 4 or not lines[0].startswith("# Agent Note: ") or lines[0].strip() == "# Agent Note:":
        fail(errors, f"{rel(path)}: 第 1 行必须是 # Agent Note: 标题")
        return
    if lines[1] != "":
        fail(errors, f"{rel(path)}: 第 2 行必须为空")
    status = lines[2] if len(lines) > 2 else ""
    expected = {
        "proposed": "Status: proposed",
        "implemented": "Status: implemented",
        "archived": "Status: implemented",
    }.get(lifecycle)
    if lifecycle == "rejected":
        if not status.startswith("Status: rejected — ") or status == "Status: rejected — ":
            fail(errors, f"{rel(path)}: rejected 笔记的 Status 必须带一行原因")
    elif status != expected:
        fail(errors, f"{rel(path)}: Status 与目录 {lifecycle} 不一致")
    body_index = 3
    if lifecycle == "archived":
        if len(lines) < 5 or not re.fullmatch(r"Archived: \d{4}-\d{2}-\d{2}", lines[3]):
            fail(errors, f"{rel(path)}: archived 笔记要在 Status 下一行写 Archived: YYYY-MM-DD")
            return
        body_index = 4
    if len(lines) <= body_index or lines[body_index] != "":
        fail(errors, f"{rel(path)}: Status 后必须空一行")
        return
    headings = heading_names(text)
    if not headings or headings[0][1] not in {"problem", "问题"}:
        fail(errors, f"{rel(path)}: 正文第一节必须是 ## Problem")
        return
    names = [name for _, name in headings]
    if lifecycle in {"implemented", "archived"}:
        required = ("decision", "alternatives considered", "consequences")
        aliases = {
            "decision": {"decision", "决策"},
            "alternatives considered": {
                "alternatives considered",
                "备选方案",
                "已考虑的替代方案",
            },
            "consequences": {"consequences", "后果"},
        }
        cursor = 0
        for key in required:
            while cursor < len(names) and names[cursor] not in aliases[key]:
                cursor += 1
            if cursor >= len(names):
                fail(errors, f"{rel(path)}: 缺少 ## {key}")
                return
            cursor += 1
        for _, name in headings:
            if name in FORBIDDEN_IMPLEMENTED:
                fail(errors, f"{rel(path)}: implemented 笔记不能使用 ## {name}")
    elif lifecycle == "proposed":
        for key in ("proposal", "alternatives considered", "acceptance criteria", "risks"):
            if key not in names and not (key == "proposal" and "提案" in names):
                if key not in names:
                    fail(errors, f"{rel(path)}: 缺少 ## {key}")
    else:
        for key in ("proposal", "alternatives considered"):
            if key not in names:
                fail(errors, f"{rel(path)}: 缺少 ## {key}")
    alternative_at = next(
        (
            index
            for index, line in enumerate(lines)
            if HEADING.match(line)
            and re.sub(r"（.*?）|\(.*?\)", "", HEADING.match(line).group(1)).strip().lower()
            in {"alternatives considered", "备选方案", "已考虑的替代方案"}
        ),
        None,
    )
    if alternative_at is None:
        fail(errors, f"{rel(path)}: 缺少 ## Alternatives considered")
    elif section_body(lines, alternative_at + 1) == "":
        fail(errors, f"{rel(path)}: Alternatives considered 不能空着；没有真实备选时写无")


def check_links(paths: list[Path], errors: list[str]) -> None:
    for path in paths:
        text = path.read_text(encoding="utf-8")
        for lineno, line in enumerate(text.splitlines(), 1):
            for match in LINK.finditer(line):
                target = match.group(1)
                if target.startswith(("http://", "https://", "mailto:")):
                    continue
                path_part, _, _anchor = target.partition("#")
                if path_part == "":
                    continue
                resolved = (path.parent / path_part).resolve()
                if not resolved.exists():
                    fail(errors, f"{rel(path)}:{lineno}: 链接不存在 {target}")


def main() -> int:
    print_counts = "--print-counts" in sys.argv
    errors: list[str] = []
    check_budgets(errors, print_counts)
    for path in standing_docs():
        text = path.read_text(encoding="utf-8")
        check_history(path, text, errors)
        check_wrap(path, text, errors)
    notes = check_note_tree(errors)
    for path in notes:
        check_note_format(path, errors)
    check_links(standing_docs() + notes, errors)
    if errors:
        for message in errors:
            print(message, file=sys.stderr)
        print(f"{len(errors)} 个问题", file=sys.stderr)
        return 1
    print("verify_maintenance: ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
