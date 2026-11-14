import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// PROD-31, PROD-32: axe checks contrast, names, roles and keyboard basics against WCAG 2.2 A and AA.
const pages = [
  "/en/",
  "/en/kits/desert-fire/",
  "/en/kits/cs-go/",
  "/en/artists/",
  "/en/artists/austin-wintory/",
  "/en/about/",
  "/en/no-such-page/",
  "/zh-hans/kits/desert-fire/",
  "/ru/artists/austin-wintory/",
];

test.describe("accessibility", () => {
  for (const path of pages) {
    test(`PROD-31 PROD-32 ${path} has no WCAG 2.2 AA violations`, async ({ page }) => {
      await page.goto(path);
      const { violations } = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(
        violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`),
      ).toEqual([]);
    });
  }

  for (const path of ["/en/", "/en/kits/desert-fire/", "/en/artists/austin-wintory/"]) {
    test(`PROD-32 ${path}: every control Tab reaches shows a focus outline`, async ({ page }) => {
      await page.goto(path);
      const seen: string[] = [];
      for (let i = 0; i < 25; i++) {
        await page.keyboard.press("Tab");
        const focused = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          if (!el || el === document.body) return null;
          const style = getComputedStyle(el);
          const label = `${el.tagName.toLowerCase()} ${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 30)}`;
          return { label, outline: style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) > 0 };
        });
        if (!focused) break;
        if (!focused.outline) seen.push(focused.label);
      }
      expect(seen, "focused without an outline").toEqual([]);
    });
  }
});
