/**
 * Clean, editor-chrome-free plate preview.
 * Shows only what the finished nameplate looks like: plate body, text, divider lines.
 * No zone borders, drag handles, overflow badges, or other editor UI.
 *
 * Uses dominantBaseline="hanging" so y = top of em square and alignment is exact.
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
  colorId?: string;
  colorHex?: string;
  uid?: string;
  className?: string;
}

export default function PlateFinalPreview({
  size, zones, lineConfigs, dividers, direction, colorId, colorHex, uid = "pfp", className,
}: Props) {
  const VW = SVG_VW;
  const VH = Math.round(VW * size.height / size.width);
  const PAD = VW * PAD_RATIO;
  const innerW = VW - PAD * 2;
  const innerH = VH - PAD * 2;

  const cs = getPlateStyle(colorId ?? "black", colorHex);

  const rects = zones.map((zone) => ({
    zone,
    zx: PAD + (zone.xPct / 100) * innerW,
    zy: PAD + (zone.yPct / 100) * innerH,
    zw: (zone.widthPct / 100) * innerW,
    zh: (zone.heightPct / 100) * innerH,
  }));

  const idBg = `${uid}-bg`;
  const idSheen = `${uid}-sheen`;
  const idClip = `${uid}-clip`;

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      style={{ width: "100%", display: "block" }}
      preserveAspectRatio="xMidYMid meet"
      className={className}
    >
      <defs>
        <linearGradient id={idBg} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={cs.gA} />
          <stop offset="55%" stopColor={cs.gB} />
          <stop offset="100%" stopColor={cs.gC} />
        </linearGradient>
        <linearGradient id={idSheen} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cs.sheen} />
          <stop offset="45%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <clipPath id={idClip}>
          <rect x={PAD} y={PAD} width={innerW} height={innerH} />
        </clipPath>
      </defs>

      <rect x={0} y={0} width={VW} height={VH} rx={VW * 0.008} fill={`url(#${idBg})`} />
      <rect x={0} y={0} width={VW} height={VH} rx={VW * 0.008} fill={`url(#${idSheen})`} />
      <rect
        x={1.5}
        y={1.5}
        width={VW - 3}
        height={VH - 3}
        rx={VW * 0.0072}
        fill="none"
        stroke={cs.border}
        strokeWidth={VW * 0.003}
      />

      <g clipPath={`url(#${idClip})`}>
        {rects.map(({ zone, zx, zy, zw, zh }) => {
          const cfg = lineConfigs[zone.id] ?? defaultZoneConfig();
          const isPlaceholder = !cfg.text;
          const font = FONT_OPTIONS.find((item) => item.id === cfg.fontId) ?? FONT_OPTIONS[0];
          const layout = computeTextLayout(cfg, zone, zx, zy, zw, zh, size, isPlaceholder);

          return (
            <g key={zone.id}>
              {layout.lines.map((line, index) => (
                <text
                  key={index}
                  x={layout.textX}
                  y={layout.firstLineY + index * layout.lineH}
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

        {rects.length > 1 && rects.slice(0, -1).map(({ zx, zy, zw, zh }, index) => {
          const divider = dividers[index];
          if (!divider?.enabled) return null;
          const next = rects[index + 1];
          const dashArray = dividerDashArray(divider.style);

          if (direction === "horizontal") {
            const midY = (zy + zh + next.zy) / 2;
            return (
              <line
                key={index}
                x1={zx}
                y1={midY}
                x2={zx + zw}
                y2={midY}
                stroke="hsl(210, 35%, 62%)"
                strokeWidth={VW * 0.003}
                strokeDasharray={dashArray}
                strokeLinecap="round"
              />
            );
          }

          const midX = (zx + zw + next.zx) / 2;
          return (
            <line
              key={index}
              x1={midX}
              y1={zy}
              x2={midX}
              y2={zy + zh}
              stroke="hsl(210, 35%, 62%)"
              strokeWidth={VW * 0.003}
              strokeDasharray={dashArray}
              strokeLinecap="round"
            />
          );
        })}
      </g>
    </svg>
  );
}
