#!/usr/bin/env python3
"""Visual smoke test: boots the frontend (browser mode + in-memory mock) and
captures screenshots of the key pages so the UI can be eyeballed/diffed.

    pip install playwright && python3 -m playwright install chromium
    python3 scripts/visual_test.py        # screenshots land in scripts/screenshots/

Runs the React/Vite app standalone (no Tauri) against the mock data, so it never
touches Claude or a real DB.
"""
import os, socket, subprocess, sys, time
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND = os.path.join(ROOT, "frontend")
OUT = os.path.join(ROOT, "scripts", "screenshots")
PORT = 5173


def port_open(p):
    with socket.socket() as s:
        return s.connect_ex(("127.0.0.1", p)) == 0


def main():
    os.makedirs(OUT, exist_ok=True)
    server = subprocess.Popen(["npm", "run", "dev"], cwd=FRONTEND,
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(80):
            if port_open(PORT):
                break
            time.sleep(0.5)
        else:
            print("dev server never came up", file=sys.stderr)
            return 1

        with sync_playwright() as p:
            b = p.chromium.launch(headless=True)
            pg = b.new_page(viewport={"width": 1400, "height": 1000})
            pg.goto(f"http://localhost:{PORT}")
            pg.wait_for_load_state("networkidle")
            pg.wait_for_timeout(400)
            pg.screenshot(path=f"{OUT}/library.png", full_page=True)

            pg.click("text=Builder"); pg.wait_for_timeout(600)
            pg.screenshot(path=f"{OUT}/builder.png", full_page=True)

            pg.click("text=Library"); pg.wait_for_timeout(300)
            pg.click("text=Cyber Dreams"); pg.wait_for_timeout(500)
            pg.click("text=Builder / manage"); pg.wait_for_timeout(700)
            pg.screenshot(path=f"{OUT}/builder-manage.png", full_page=True)
            pg.click("text=Sheet preview"); pg.wait_for_timeout(700)
            pg.screenshot(path=f"{OUT}/sheet-guitar.png", full_page=True)
            pg.click("button:has-text('Piano')"); pg.wait_for_timeout(600)
            pg.screenshot(path=f"{OUT}/sheet-piano.png", full_page=True)

            # workspace layout (Final renders now inside the pane, no per-stage chat)
            pg.click("button:has-text('Workspace')"); pg.wait_for_timeout(500)
            pg.screenshot(path=f"{OUT}/workspace.png", full_page=True)
            # global chat terminal (docked, reachable from every page)
            pg.click("text=Chat with Claude"); pg.wait_for_timeout(500)
            pg.screenshot(path=f"{OUT}/terminal.png", full_page=True)
            b.close()
        print(f"screenshots written to {OUT}")
        return 0
    finally:
        server.terminate()


if __name__ == "__main__":
    sys.exit(main())
