const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

/** Public canonical URL used by Next metadata and JSON-LD structured data. */
export const siteUrl = (configuredSiteUrl ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);

export const siteName = "Blockland";
export const siteDescription =
  "Own, trade, and build on Coordinate Units that represent real-world locations.";
