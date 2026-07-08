import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, it } from "vitest";

const INDEX_HTML_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../index.html");
const EXPECTED_DESCRIPTION = "Configure custom anodized aluminum nameplates online, submit quote requests, and prepare custom nameplate orders through Nameplates Express.";

describe("public storefront metadata", () => {
  it("uses neutral order language instead of exposing sandbox checkout wording", () => {
    const indexHtml = readFileSync(INDEX_HTML_PATH, "utf8");

    expect(indexHtml).toContain(`name="description"\n      content="${EXPECTED_DESCRIPTION}"`);
    expect(indexHtml).toContain(`property="og:description"\n      content="${EXPECTED_DESCRIPTION}"`);
    expect(indexHtml).toContain(`name="twitter:description"\n      content="${EXPECTED_DESCRIPTION}"`);
    expect(indexHtml).not.toContain("PayPal sandbox checkout");
  });
});
