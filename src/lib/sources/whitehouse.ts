import "server-only";

import * as cheerio from "cheerio";

export const WHITEHOUSE_LIST_URLS = [
  {
    sourceType: "white_house_release",
    sourceName: "White House",
    url: "https://www.whitehouse.gov/briefing-room/",
  },
  {
    sourceType: "white_house_remarks",
    sourceName: "White House",
    url: "https://www.whitehouse.gov/remarks/",
  },
];

export interface FetchedDocument {
  source_type: string;
  source_name: string;
  source_url: string;
  title: string;
  published_at: string | null;
  extracted_text: string;
  content_hash: string;
  fetch_error?: string;
}

export async function fetchWhiteHouseList(
  listUrl: string,
): Promise<{ url: string; title: string }[]> {
  try {
    const res = await fetch(listUrl, {
      headers: { "User-Agent": "PoliticalCatalystRadar/0.1" },
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio.load(html);
    const links: { url: string; title: string }[] = [];
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      const title = $(el).text().trim();
      if (!href || title.length < 10) return;
      const url = href.startsWith("http")
        ? href
        : new URL(href, listUrl).toString();
      if (url.includes("whitehouse.gov") && !url.endsWith("/briefing-room/")) {
        links.push({ url, title });
      }
    });
    return links.slice(0, 15);
  } catch {
    return [];
  }
}

export async function fetchWhiteHouseArticle(
  url: string,
  sourceType: string,
  sourceName: string,
): Promise<FetchedDocument | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "PoliticalCatalystRadar/0.1" },
    });
    if (!res.ok) {
      return {
        source_type: sourceType,
        source_name: sourceName,
        source_url: url,
        title: url,
        published_at: null,
        extracted_text: "",
        content_hash: "",
        fetch_error: `HTTP ${res.status}`,
      };
    }
    const html = await res.text();
    const $ = cheerio.load(html);
    const title = $("h1").first().text().trim() || $("title").text().trim();
    const text = $("article").text() || $(".entry-content").text() || $("main").text();
    const extracted = text.replace(/\s+/g, " ").trim().slice(0, 15000);
    const { createHash } = await import("crypto");
    const content_hash = createHash("sha256").update(extracted).digest("hex");
    return {
      source_type: sourceType,
      source_name: sourceName,
      source_url: url,
      title,
      published_at: new Date().toISOString(),
      extracted_text: extracted,
      content_hash,
    };
  } catch (e) {
    return {
      source_type: sourceType,
      source_name: sourceName,
      source_url: url,
      title: url,
      published_at: null,
      extracted_text: "",
      content_hash: "",
      fetch_error: e instanceof Error ? e.message : "fetch failed",
    };
  }
}
