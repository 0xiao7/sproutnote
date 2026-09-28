import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("manifest describes an installable SproutNote app under the Pages base path", async () => {
  const manifest = JSON.parse(await read("public/manifest.webmanifest"));
  assert.equal(manifest.name, "芽記 SproutNote");
  assert.equal(manifest.short_name, "芽記");
  assert.equal(manifest.lang, "zh-Hant");
  assert.equal(manifest.start_url, "/sproutnote/");
  assert.equal(manifest.scope, "/sproutnote/");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.theme_color, "#264f43");
  assert.ok(manifest.icons.some((icon) => icon.sizes === "192x192"));
  assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512" && icon.purpose.includes("maskable")));
});

test("HTML publishes manifest and iOS install metadata as Vite public assets", async () => {
  const html = await read("index.html");
  assert.match(html, /rel="manifest" href="\/manifest\.webmanifest"/);
  assert.match(html, /rel="apple-touch-icon" href="\/icons\/icon-192\.png"/);
  assert.match(html, /name="apple-mobile-web-app-capable" content="yes"/);
  assert.match(html, /name="apple-mobile-web-app-title" content="芽記"/);
});

test("service worker caches the shell, cleans old caches, and handles navigation offline", async () => {
  const worker = await read("public/sw.js");
  assert.match(worker, /addEventListener\("install"/);
  assert.match(worker, /addEventListener\("activate"/);
  assert.match(worker, /addEventListener\("fetch"/);
  assert.match(worker, /request\.mode === "navigate"/);
  assert.match(worker, /caches\.match\(APP_BASE\)/);
  assert.match(worker, /\/sproutnote\//);
});

test("React entry registers the base-path-aware service worker", async () => {
  const main = await read("src/main.jsx");
  assert.match(main, /"serviceWorker" in navigator/);
  assert.match(main, /`\$\{import\.meta\.env\.BASE_URL\}sw\.js`/);
  assert.match(main, /scope: import\.meta\.env\.BASE_URL/);
});

test("photo screen exposes a Web App installation action", async () => {
  const app = await read("src/App.jsx");
  assert.match(app, /beforeinstallprompt/);
  assert.match(app, /安裝 Web App/);
  assert.match(app, /加入主畫面/);
});
