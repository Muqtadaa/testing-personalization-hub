import { Resvg } from "@resvg/resvg-js";

// Rasterizes a self-contained SVG string to a PNG buffer. No GPU/headless browser
// — resvg-js renders natively, which works on Vercel serverless. Used to turn the
// Claude-authored lo-fi wireframes into mockup images we can attach to Jira.
export function renderSvgToPng(svg: string, width = 1024): Buffer {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    background: "#ffffff",
    font: { loadSystemFonts: true },
  });
  return resvg.render().asPng();
}
