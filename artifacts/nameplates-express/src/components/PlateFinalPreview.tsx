/**
 * Clean, editor-chrome-free plate preview.
 * Shows only what the finished nameplate looks like: plate body, text, divider lines.
 * No zone borders, drag handles, overflow badges, or other editor UI.
 *
 * Uses dominantBaseline="hanging" so y = top of em square — alignment is exact.
 * Provide a unique `uid` when rendering multiple instances on the same page
 * to avoid SVG defs ID collisions.
 */
import { FONT_OPTIONS, defaultZoneConfig, type TagSize, type TextZone, type ZoneConfigs } from "@/data/templates";
import {
  SVG_VW, PAD_RATIO,
  computeTextLayout, dividerDashArray,
  type DividerConfig, type Direction,
} from "@/lib/plate-utils";
import { getPlateStyle } from "@/lib/admin-store";

interface Props {
  size: TagSize;
  zones: TextZone[];
  lineConfigs: ZoneConfigs;
  dividers: DividerConfig[];
  direction: Direction;
  colorId?: string;     // anodization color id, e.g. "black" | "red" | "blue" | …
  uid?: string;         // unique prefix for SVG defs IDs — use when rendering many instances
  className?: string;
}

export default function PlateFinalPreview({
  size, zones, lineConfigs, dividers, direction, colorId, uid = "pfp", className,
}: Props) {
  const VW  = SVG_VW;
  const VH  = Math.round(VW * size.height / size.width);
  const PAD = VW * PAD_RATIO;
  const innerW = VW - PAD * 2;
  const innerH = VH - PAD * 2;

  // Color-aware plate style
  const cs = getPlateStyle(colorId ?? "black");

  // Pre-compute zone rectangles
  const rects = zones.map((zone) => ({
    zone,
    zx: PAD + (zone.xPct  / 100) * innerW,
    zy: PAD + (zone.yPct  / 100) * innerH,
    zw: (zone.widthPct  / 100) * innerW,
    zh: (zone.heightPct / 100) * innerH,
  }));

  const idBg    = `${uid}-bg`;
  const idSheen = `${uid}-sheen`;
  const idClip  = `${uid}-clip`;

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      style={{ width: "100%", display: "block" }}
      preserveAspectRatio="xMidYMid meet"
      className={className}
    >
      <defs>
        <linearGradient id={idBg} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor={cs.gA} />
          <stop offset="55%"  stopColor={cs.gB} />
          <stop offset="100%" stopColor={cs.gC} />
        </linearGradient>
        <linearGradient id={idSheen} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor={cs.sheen} />
          <stop offset="45%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        {/*
         * Clip to the plate's inner boundary (innerW × innerH, inset by PAD on all sides).
         * Using the zone bounds here would silently hide segment-overflow text — text that
         * overflows its zone but stays within the plate inner area is allowed through on
         * submission, so the final preview must show it. The outer rounded-rect plate shape
         * is enforced by the plate body rects (rendered outside this clip group); this clip
         * only constrains text and dividers to the engravable inner area.
         */}
        <clipPath id={idClip}>
          <rect x={PAD} y={PAD} width={innerW} height={innerH} />
        </clipPath>
      </defs>

      {/* Plate body */}
      <rect x={0} y={0} width={VW} height={VH} rx={VW * 0.008} fill={`url(#${idBg})`} />
      <rect x={0} y={0} width={VW} height={VH} rx={VW * 0.008} fill={`url(#${idSheen})`} />
      {/* Outer edge highlight */}
      <rect
        x={1.5} y={1.5} width={VW - 3} height={VH - 3}
        rx={VW * 0.0072}
        fill="none"
        stroke={cs.border}
        strokeWidth={VW * 0.003}
      />

      <g clipPath={`url(#${idClip})`}>
        {/* Text zones — no borders, no editor chrome */}
        {rects.map(({ zone, zx, zy, zw, zh }) => {
          const cfg         = lineConfigs[zone.id] ?? defaultZoneConfig();
          const isPlaceholder = !cfg.text;
          const font        = FONT_OPTIONS.find((f) => f.id === cfg.fontId) ?? FONT_OPTIONS[0];
          const layout      = computeTextLayout(cfg, zone, zx, zy, zw, zh, size, isPlaceholder);

          return (
            <g key={zone.id}>
              {layout.lines.map((line, i) => (
                <text
                  key={i}
                  x={layout.textX}
                  y={layout.firstLineY + i * layout.lineH}
                  textAnchor={layout.anchor}
                  fontFamily={font.family}
                  fontSize={layout.svgPt}
                  fontWeight={cfg.bold ? 700 : 400}
                  fontStyle={cfg.italic ? "italic" : "normal"}
                  fill="hsl(210, 55%, 88%)"
                  style={{ userSelect: "none" }}
                >
                  {line}
                </text>
              ))}
            </g>
          );
        })}

        {/* Decorative divider lines (user-configured) */}
        {rects.length > 1 && rects.slice(0, -1).map(({ zx, zy, zw, zh }, i) => {
          const div  = dividers[i];
          if (!div?.enabled) return null;
          const next = rects[i + 1];
          const dArr = dividerDashArray(div.style);

          if (direction === "horizontal") {
            const midY = (zy + zh + next.zy) / 2;
            return (
              <line key={i}
                x1={zx} y1={midY} x2={zx + zw} y2={midY}
                stroke="hsl(210, 35%, 62%)"
                strokeWidth={VW * 0.003}
                strokeDasharray={dArr}
                strokeLinecap="round"
              />
            );
          } else {
            const midX = (zx + zw + next.zx) / 2;
            return (
              <line key={i}
                x1={midX} y1={zy} x2={midX} y2={zy + zh}
                stroke="hsl(210, 35%, 62%)"
                strokeWidth={VW * 0.003}
                strokeDasharray={dArr}
                strokeLinecap="round"
              />
            );
          }
        })}
      </g>
    </svg>
  );
}
