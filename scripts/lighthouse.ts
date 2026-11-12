// PROD-36: Lighthouse mobile performance score of 90 or more on the Records, Record and Artist pages.
// Serves dist/ with Wrangler (run `pnpm build` first), runs Lighthouse three times per page with its
// default mobile settings and checks the median. Scores swing on a busy machine; CI is the reference.
import { execFileSync, spawn } from "node:child_process";
import { chromium } from "@playwright/test";

const LIGHTHOUSE = "lighthouse@13.6.0";
const PORT = 8790;
const PAGES = ["/en/", "/en/kits/desert-fire/", "/en/artists/austin-wintory/"];
const RUNS = 3;
const MIN_SCORE = 90;

interface Run {
  score: number;
  lcp: string;
  tbt: string;
  cls: string;
}

const base = `http://127.0.0.1:${PORT}`;
const server = spawn("pnpm", ["exec", "wrangler", "dev", "--port", String(PORT), "--ip", "127.0.0.1"], {
  env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
  stdio: "ignore",
  detached: true,
});
const stopServer = () => server.pid && process.kill(-server.pid);

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`${base}/en/`)).ok) return;
    } catch {
      // Not up yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("wrangler dev did not start");
}

function lighthouse(url: string): Run {
  const json = execFileSync(
    "pnpm",
    [
      "dlx",
      LIGHTHOUSE,
      url,
      "--only-categories=performance",
      "--output=json",
      "--output-path=stdout",
      "--quiet",
      "--chrome-flags=--headless=new --no-sandbox",
    ],
    {
      env: { ...process.env, CHROME_PATH: chromium.executablePath() },
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 256 * 1024 * 1024,
    },
  );
  const report = JSON.parse(json.toString());
  const value = (id: string) => String(report.audits[id].displayValue);
  return {
    score: Math.round(report.categories.performance.score * 100),
    lcp: value("largest-contentful-paint"),
    tbt: value("total-blocking-time"),
    cls: value("cumulative-layout-shift"),
  };
}

let failed = false;
try {
  await waitForServer();
  // Warm-up, not scored. In CI the first page always had one run about 10 points below its
  // other two; a cold Chrome and Wrangler is the likely cause.
  lighthouse(base + PAGES[0]);
  for (const path of PAGES) {
    const runs = Array.from({ length: RUNS }, () => lighthouse(base + path));
    const median = runs.toSorted((a, b) => a.score - b.score)[Math.floor(RUNS / 2)] as Run;
    const ok = median.score >= MIN_SCORE;
    failed ||= !ok;
    console.log(
      `${ok ? "ok  " : "FAIL"} ${path}  median ${median.score} (runs in order ${runs.map((r) => r.score).join(", ")})  LCP ${median.lcp}  TBT ${median.tbt}  CLS ${median.cls}`,
    );
  }
} finally {
  stopServer();
}
if (failed) {
  console.error(`PROD-36: every page needs a median mobile performance score of ${MIN_SCORE} or more.`);
  process.exit(1);
}
