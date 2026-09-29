#!/usr/bin/env python3
"""Crucible engine adapter for Unreal Engine 5 (copy to tools/crucible_ue.py at kickoff).

Verbs (see references/adapters.md):  probe | build [target] | test [filter] | capture [filter] |
                                     perf [map] | package [--server] | server-smoke | logs [--since ISO]
Every verb prints one JSON object on stdout and exits non-zero on failure. Artifacts go to
studio/adapter/<verb>/<timestamp>/. Engine-wide operations take a named lock in studio/.locks/.

Configuration: studio/adapter.json, e.g.
  {"ue_root": "C:/Program Files/Epic Games/UE_5.6", "uproject": "C:/Dev/MyGame/MyGame.uproject",
   "target": "MyGame", "platform": "Win64", "server_target": "MyGameServer",
   "test_filter": "Project", "capture_tests": "Project.Functional Tests.Capture",
   "perf_map": "/Game/Maps/PerfArena", "perf_frames": 900, "server_map": "/Game/Maps/TestArena"}

This template is proven in the Tech Spike: run every verb once on the real project and fix what fails
before any content ticket starts.
"""
import csv, datetime, glob, json, os, platform, re, shutil, subprocess, sys, time
from pathlib import Path

CFG_PATH = Path("studio/adapter.json")


def out(obj, ok=True):
    obj.setdefault("ok", ok)
    print(json.dumps(obj, indent=1))
    sys.exit(0 if obj["ok"] else 1)


def cfg():
    if not CFG_PATH.exists():
        out({"error": f"missing {CFG_PATH}"}, ok=False)
    c = json.loads(CFG_PATH.read_text())
    c.setdefault("platform", {"Windows": "Win64", "Linux": "Linux", "Darwin": "Mac"}[platform.system()])
    c.setdefault("test_filter", "Project")
    c.setdefault("perf_frames", 900)
    return c


def artifacts(verb):
    d = Path("studio/adapter") / verb / datetime.datetime.utcnow().strftime("%Y%m%dT%H%M%S")
    d.mkdir(parents=True, exist_ok=True)
    return d


class Lock:
    """Cross-platform named lock: O_EXCL lock file with a stale timeout."""
    def __init__(self, name, wait=1800, stale=7200):
        self.path = Path("studio/.locks") / f"{name}.lock"; self.wait, self.stale = wait, stale
    def __enter__(self):
        self.path.parent.mkdir(parents=True, exist_ok=True); t0 = time.time()
        while True:
            try:
                fd = os.open(self.path, os.O_CREAT | os.O_EXCL | os.O_WRONLY); os.write(fd, str(os.getpid()).encode()); os.close(fd); return self
            except FileExistsError:
                if time.time() - self.path.stat().st_mtime > self.stale: self.path.unlink(missing_ok=True); continue
                if time.time() - t0 > self.wait: out({"error": f"lock {self.path} busy for {self.wait}s"}, ok=False)
                time.sleep(5)
    def __exit__(self, *a):
        self.path.unlink(missing_ok=True)


def paths(c):
    root = Path(c["ue_root"]); win = platform.system() == "Windows"; mac = platform.system() == "Darwin"
    binp = root / "Engine/Binaries" / ("Win64" if win else "Mac" if mac else "Linux")
    editor_cmd = binp / ("UnrealEditor-Cmd.exe" if win else "UnrealEditor-Cmd")
    if mac and not editor_cmd.exists():
        editor_cmd = binp / "UnrealEditor.app/Contents/MacOS/UnrealEditor"
    batch = root / "Engine/Build/BatchFiles"
    build = batch / ("Build.bat" if win else "Mac/Build.sh" if mac else "Linux/Build.sh")
    uat = batch / ("RunUAT.bat" if win else "RunUAT.sh")
    return {"root": root, "editor_cmd": editor_cmd, "build": build, "uat": uat}


def run(cmd, log_file, timeout=None):
    """Run a command, tee output to log_file, return (exit_code, text)."""
    with open(log_file, "w", encoding="utf-8", errors="replace") as f:
        try:
            p = subprocess.run([str(x) for x in cmd], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
                               errors="replace", timeout=timeout)
            f.write(p.stdout); return p.returncode, p.stdout
        except subprocess.TimeoutExpired as e:
            txt = (e.stdout or "") if isinstance(e.stdout, str) else ""
            f.write(txt + "\n[crucible] TIMEOUT"); return 124, txt


def count_issues(text):
    errors = [l.strip() for l in text.splitlines() if re.search(r"\berror\b|Error:|Fatal error|Ensure condition failed", l)]
    warnings = sum(1 for l in text.splitlines() if re.search(r"\bwarning\b|Warning:", l))
    return errors, warnings


def project_dir(c):
    return Path(c["uproject"]).parent


# ---------------------------------------------------------------- verbs
def probe(c):
    p = paths(c); notes = []
    version = None
    bv = p["root"] / "Engine/Build/Build.version"
    if bv.exists():
        v = json.loads(bv.read_text()); version = f'{v.get("MajorVersion")}.{v.get("MinorVersion")}.{v.get("PatchVersion")}'
    gpu = None
    if shutil.which("nvidia-smi"):
        code, txt = run(["nvidia-smi", "--query-gpu=name", "--format=csv,noheader"], os.devnull)
        gpu = txt.strip() or None
    tools = {k: Path(v).exists() for k, v in p.items() if k != "root"}
    for k, ok in tools.items():
        if not ok: notes.append(f"missing {k}: {p[k]}")
    if not Path(c["uproject"]).exists(): notes.append(f"missing uproject {c['uproject']}")
    can_render = gpu is not None or platform.system() in ("Windows", "Darwin")
    out({"engine": "unreal", "version": version, "gpu": gpu, "can_render": can_render, "can_capture": can_render,
         "tools": tools, "blender": shutil.which("blender") is not None,
         "notes": notes + ["MCP servers (e.g. Unreal Editor or Blender MCP) are listed by the session, not by this script"]},
        ok=not notes)


def build(c, target=None):
    p = paths(c); d = artifacts("build"); target = target or f'{c["target"]}Editor'
    with Lock("build"):
        code, txt = run([p["build"], target, c["platform"], "Development", f'-Project={c["uproject"]}', "-WaitMutex", "-NoHotReload"],
                        d / "build.log", timeout=3600)
    errors, warnings = count_issues(txt)
    out({"target": target, "errors": errors[:20], "error_count": len(errors), "warnings": warnings, "log": str(d / "build.log")},
        ok=code == 0)


def automation(c, filter_, d, render):
    p = paths(c)
    cmd = [p["editor_cmd"], c["uproject"], f'-ExecCmds=Automation RunTests {filter_}; Quit', "-unattended", "-nopause",
           "-nosplash", "-stdout", "-FullStdOutLogOutput", f"-ReportExportPath={d / 'report'}", f"-abslog={d / 'editor.log'}"]
    cmd += ["-ResX=1920", "-ResY=1080", "-windowed", "-benchmark", "-fps=30"] if render else ["-NullRHI"]
    with Lock("editor"):
        code, txt = run(cmd, d / "run.log", timeout=5400)
    report = d / "report" / "index.json"
    passed, failed = [], []
    if report.exists():
        data = json.loads(report.read_text(encoding="utf-8-sig"))
        for t in data.get("tests", []):
            name = t.get("fullTestPath") or t.get("testDisplayName")
            if t.get("state") == "Success": passed.append(name)
            else:
                msgs = [e.get("event", {}).get("message", "") for e in t.get("entries", []) if e.get("event", {}).get("type") == "Error"]
                failed.append({"id": name, "reason": (msgs[0] if msgs else t.get("state"))[:300]})
    return code, passed, failed, report


def test(c, filter_=None):
    d = artifacts("test"); filter_ = filter_ or c["test_filter"]
    code, passed, failed, report = automation(c, filter_, d, render=False)
    out({"filter": filter_, "passed": passed, "failed": failed, "report": str(report)},
        ok=report.exists() and not failed and len(passed) > 0)


def capture(c, filter_=None):
    """Runs screenshot functional tests (AScreenshotFunctionalTest in capture maps) with rendering on."""
    d = artifacts("capture"); filter_ = filter_ or c.get("capture_tests", "Project.Functional Tests.Capture")
    code, passed, failed, report = automation(c, filter_, d, render=True)
    shots = sorted(set(glob.glob(str(project_dir(c) / "Saved/Automation/**/*.png"), recursive=True)), key=os.path.getmtime)
    fresh = [s for s in shots if os.path.getmtime(s) > time.time() - 7200]
    images = []
    for s in fresh[-48:]:
        dst = d / Path(s).name; shutil.copy2(s, dst); images.append(str(dst))
    sheet = contact_sheet(images, d / "sheet.png")
    out({"filter": filter_, "images": images, "sheet": sheet, "failed": failed}, ok=bool(images) and not failed)


def contact_sheet(images, dst):
    if not images: return None
    try:
        from PIL import Image
        thumbs = [Image.open(i).convert("RGB") for i in images[:12]]; w, h = 640, 360; cols = 3
        rows = (len(thumbs) + cols - 1) // cols; sheet = Image.new("RGB", (cols * w, rows * h), (17, 17, 17))
        for k, im in enumerate(thumbs):
            im.thumbnail((w, h)); sheet.paste(im, ((k % cols) * w, (k // cols) * h))
        sheet.save(dst); return str(dst)
    except Exception:
        ff = shutil.which("ffmpeg")
        if not ff: return None
        lst = dst.with_suffix(".txt"); lst.write_text("".join(f"file '{Path(i).as_posix()}'\n" for i in images[:12]))
        run([ff, "-y", "-f", "concat", "-safe", "0", "-i", lst, "-vf", "scale=640:360,tile=3x4", "-frames:v", "1", dst], os.devnull)
        return str(dst) if dst.exists() else None


def perf(c, map_=None):
    """Runs a fixed perf map with the CSV profiler and summarises frame times and draw calls."""
    p = paths(c); d = artifacts("perf"); map_ = map_ or c.get("perf_map")
    csv_dir = project_dir(c) / "Saved/Profiling/CSV"; before = set(glob.glob(str(csv_dir / "*.csv")))
    cmd = [p["editor_cmd"], c["uproject"], map_, "-game", "-ResX=1920", "-ResY=1080", "-windowed", "-benchmark", "-fps=60",
           f'-csvCaptureFrames={c["perf_frames"]}', "-unattended", "-nosplash", f"-abslog={d / 'game.log'}",
           f'-ExecCmds=Crucible.PerfScenario 1']
    with Lock("editor"):
        code, txt = run(cmd, d / "run.log", timeout=1800)
    new = sorted(set(glob.glob(str(csv_dir / "*.csv"))) - before, key=os.path.getmtime)
    if not new: out({"error": "no CSV profile produced", "log": str(d / "run.log")}, ok=False)
    shutil.copy2(new[-1], d / "profile.csv")
    rows = list(csv.DictReader(open(new[-1], encoding="utf-8", errors="replace")))
    rows = [r for r in rows if r.get("FrameTime") not in (None, "", "FrameTime")]
    def col(name):
        vals = []
        for r in rows:
            try: vals.append(float(r[name]))
            except (KeyError, ValueError, TypeError): pass
        return vals
    def stats(v):
        if not v: return None
        v = sorted(v); return {"avg": round(sum(v) / len(v), 2), "p95": round(v[int(len(v) * 0.95) - 1], 2), "max": round(v[-1], 2)}
    ft = col("FrameTime")
    res = {"map": map_, "frames": len(rows), "frame_ms": stats(ft), "game_ms": stats(col("GameThreadTime")),
           "render_ms": stats(col("RenderThreadTime")), "gpu_ms": stats(col("GPUTime")),
           "draw_calls": stats(col("RHI/DrawCalls")), "physical_mb": stats(col("Memory/PhysicalMB")) or stats(col("MemoryFreeMB")),
           "hitches_over_50ms": sum(1 for x in ft if x > 50), "raw": str(d / "profile.csv")}
    out(res, ok=bool(ft))


def package(c, server=False):
    p = paths(c); d = artifacts("package")
    args = [p["uat"], "BuildCookRun", f'-project={c["uproject"]}', "-noP4", f'-platform={c["platform"]}', "-clientconfig=Shipping",
            "-build", "-cook", "-stage", "-pak", "-archive", f"-archivedirectory={d / 'build'}", "-unattended", "-utf8output"]
    if server:
        args += ["-server", "-serverconfig=Development", f'-serverplatform={c["platform"]}']
    with Lock("cook"):
        code, txt = run(args, d / "uat.log", timeout=7200)
    errors, warnings = count_issues(txt)
    size = sum(f.stat().st_size for f in (d / "build").rglob("*") if f.is_file()) / 1048576 if (d / "build").exists() else 0
    out({"path": str(d / "build"), "size_mb": round(size, 1), "errors": errors[:20], "warnings": warnings, "log": str(d / "uat.log")},
        ok=code == 0)


def server_smoke(c, seconds=90):
    """Starts the packaged dedicated server and one client on localhost, then checks both logs for a successful join."""
    d = artifacts("server-smoke"); builds = sorted(glob.glob("studio/adapter/package/*/build"), key=os.path.getmtime)
    if not builds: out({"error": "no package found - run package --server first"}, ok=False)
    b = Path(builds[-1]); ext = ".exe" if platform.system() == "Windows" else ""
    server = next(iter(b.rglob(f'{c.get("server_target", c["target"] + "Server")}{ext}')), None)
    client = next(iter(b.rglob(f'{c["target"]}{ext}')), None)
    if not server or not client: out({"error": "server or client binary not found in package", "package": str(b)}, ok=False)
    sp = subprocess.Popen([server, c.get("server_map", ""), "-log", "-port=7777", f"-abslog={d / 'server.log'}"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(15)
    cp = subprocess.Popen([client, "127.0.0.1:7777", "-windowed", "-ResX=1280", "-ResY=720", f"-abslog={d / 'client.log'}", "-nosound"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(seconds)
    for proc in (cp, sp): proc.terminate()
    slog = (d / "server.log").read_text(errors="replace") if (d / "server.log").exists() else ""
    clog = (d / "client.log").read_text(errors="replace") if (d / "client.log").exists() else ""
    joined = bool(re.search(r"Join succeeded|Welcomed by server", slog + clog))
    errors, _ = count_issues(slog + "\n" + clog)
    out({"joined": joined, "errors": errors[:20], "server_log": str(d / "server.log"), "client_log": str(d / "client.log")},
        ok=joined and not any("Fatal" in e for e in errors))


def logs(c, since=None):
    logs_dir = project_dir(c) / "Saved/Logs"; t0 = datetime.datetime.fromisoformat(since).timestamp() if since else 0
    files = [f for f in logs_dir.glob("*.log") if f.stat().st_mtime >= t0]
    errors, ensures, warnings = [], [], 0
    for f in files:
        for line in f.read_text(errors="replace").splitlines():
            if "Ensure condition failed" in line: ensures.append(line.strip()[:300])
            elif re.search(r"Error:|Fatal error", line): errors.append(line.strip()[:300])
            elif "Warning:" in line: warnings += 1
    crashes = [str(p) for p in (project_dir(c) / "Saved/Crashes").glob("*") if p.stat().st_mtime >= t0] if (project_dir(c) / "Saved/Crashes").exists() else []
    out({"files": [str(f) for f in files], "errors": errors[-30:], "ensures": ensures[-20:], "warnings": warnings, "crashes": crashes},
        ok=not crashes and not any("Fatal" in e for e in errors))


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a: out({"error": __doc__}, ok=False)
    c = cfg(); verb = a[0]
    if verb == "probe": probe(c)
    elif verb == "build": build(c, a[1] if len(a) > 1 else None)
    elif verb == "test": test(c, a[1] if len(a) > 1 else None)
    elif verb == "capture": capture(c, a[1] if len(a) > 1 else None)
    elif verb == "perf": perf(c, a[1] if len(a) > 1 else None)
    elif verb == "package": package(c, server="--server" in a)
    elif verb == "server-smoke": server_smoke(c)
    elif verb == "logs": logs(c, a[a.index("--since") + 1] if "--since" in a else None)
    else: out({"error": f"unknown verb {verb}"}, ok=False)
