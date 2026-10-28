#!/usr/bin/env python3
"""Export-only HTTP smoke check; not application code or a browser test."""
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.request

root = Path(__file__).resolve().parent.parent
mode = sys.argv[1]
if mode not in {"production", "development"}:
    raise SystemExit("Expected production or development")
port = 4400 if mode == "production" else 4401
label = "04-production-startup" if mode == "production" else "05-development-startup"
command = (["npm", "run", "start", "--", "--port", str(port), "--hostname", "127.0.0.1"]
           if mode == "production" else
           ["npm", "run", "dev", "--", "--host", "127.0.0.1", "--port", str(port), "--strictPort"])
diagnostics = root / "diagnostics"
diagnostics.mkdir(exist_ok=True)
temporary = diagnostics / (label + ".temporary")
start = datetime.datetime.now(datetime.timezone.utc)
checks = []
exit_code = 1
error = None
base = f"http://127.0.0.1:{port}"
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def get(path):
    with opener.open(base + path, timeout=5) as response:
        return response.status, response.headers.get("content-type", ""), response.read()


print("Starting " + " ".join(command), flush=True)
with temporary.open("w") as stream:
    process = subprocess.Popen(command, cwd=root, stdout=stream, stderr=subprocess.STDOUT,
                               start_new_session=True)
    try:
        deadline = time.monotonic() + 40
        while True:
            if process.poll() is not None:
                raise RuntimeError(f"Server exited before HTTP readiness: {process.returncode}")
            try:
                status, content_type, body = get("/")
                break
            except (urllib.error.URLError, TimeoutError, ConnectionError):
                if time.monotonic() > deadline:
                    raise RuntimeError("No successful HTTP response within 40 seconds")
                time.sleep(0.25)
        assert status == 200, status
        assert "text/html" in content_type, content_type
        html = body.decode("utf-8")
        assert "Innovation Funding Desk" in html
        assert "How does your innovation look like?" in html
        checks.append({"path": "/", "status": status, "content_type": content_type,
                       "bytes": len(body), "landing_text_verified": True})
        for path in ["/favicon.svg", "/fonts/montserrat-latin-600-normal.woff2",
                     "/fonts/montserrat-latin-800-normal.woff2"]:
            status, content_type, body = get(path)
            assert status == 200
            expected = (root / "public" / path.lstrip("/")).read_bytes()
            assert body == expected, f"Asset bytes differ: {path}"
            checks.append({"path": path, "status": status, "bytes": len(body),
                           "sha256": hashlib.sha256(body).hexdigest(), "matches_source": True})
        paths = sorted(set(re.findall(r'(?:src|href)="(/[^"#]+)"', html)))
        for path in paths:
            if path == "/favicon.svg" or path.startswith("//"):
                continue
            status, content_type, body = get(path.replace("&amp;", "&"))
            assert status == 200, f"Asset response: {path}: {status}"
            checks.append({"path": path, "status": status, "content_type": content_type,
                           "bytes": len(body)})
        exit_code = 0
    except Exception as exc:
        error = f"{type(exc).__name__}: {exc}"
    finally:
        if process.poll() is None:
            os.killpg(process.pid, signal.SIGTERM)
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                os.killpg(process.pid, signal.SIGKILL)
                process.wait(timeout=5)

server_output = temporary.read_text()
temporary.unlink()
server_output = re.sub(r"\x1b\[[0-?]*[ -/]*[@-~]", "", server_output)
server_output = re.sub(r"(https?://)[^/@\s]+:[^/@\s]+@", r"\1[REDACTED]@", server_output)
for name, value in os.environ.items():
    if value and len(value) > 12 and any(s in name.upper() for s in ["TOKEN", "PASSWORD", "SECRET", "API_KEY"]):
        server_output = server_output.replace(value, "[REDACTED]")
end = datetime.datetime.now(datetime.timezone.utc)
result = {"label": label, "command": command, "started_at_utc": start.isoformat(),
          "finished_at_utc": end.isoformat(), "exit_code": exit_code,
          "log": f"diagnostics/{label}.log", "checks": checks, "error": error,
          "server_returncode_after_cleanup": process.returncode,
          "cleanup": "Server process group stopped after the HTTP check."}
(diagnostics / f"{label}.log").write_text(
    "Command: " + " ".join(command) + "\n\n" + server_output +
    "\nHTTP verification and cleanup:\n" + json.dumps(result, indent=2) + "\n")
results_path = diagnostics / "results.json"
results = json.loads(results_path.read_text()) if results_path.exists() else []
results.append(result)
results_path.write_text(json.dumps(results, indent=2) + "\n")
print(json.dumps(result, indent=2), flush=True)
raise SystemExit(exit_code)
