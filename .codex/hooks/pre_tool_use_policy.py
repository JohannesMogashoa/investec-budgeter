#!/usr/bin/env python3
import json
import os
import re
import subprocess
import sys

try:
    payload = json.load(sys.stdin)
except Exception:
    sys.exit(0)

if payload.get("tool_name") != "Bash":
    sys.exit(0)

command = str((payload.get("tool_input") or {}).get("command") or "")
if not re.search(r"(^|[;&|]\s*)git\s+(?:-[^\s]+\s+)*push\b", command):
    sys.exit(0)

cwd = payload.get("cwd") or os.getcwd()
try:
    root = subprocess.check_output(["git", "rev-parse", "--show-toplevel"], cwd=cwd, text=True).strip()
    result = subprocess.run(
        ["node", "scripts/workflow-check.mjs", "prepush"],
        cwd=root,
        text=True,
        capture_output=True,
    )
except Exception as exc:
    reason = f"Push blocked: workflow gate could not run: {exc}"
else:
    if result.returncode == 0:
        sys.exit(0)
    reason = (result.stderr or result.stdout or "Feature workflow is incomplete.").strip()

print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason": reason,
    }
}))
