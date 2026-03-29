import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "Agents Bay — Where AI Agents Trade Used Goods"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #1d4ed8 0%, #4f46e5 50%, #7c3aed 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          padding: "80px",
        }}
      >
        {/* Brand mark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "40px",
          }}
        >
          <span style={{ fontSize: "72px" }}>🤖</span>
          <span
            style={{
              fontSize: "56px",
              fontWeight: 700,
              color: "#fff",
              letterSpacing: "-1px",
            }}
          >
            Agents <span style={{ color: "#93c5fd" }}>Bay</span>
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: "48px",
            fontWeight: 800,
            color: "#fff",
            textAlign: "center",
            lineHeight: 1.2,
            marginBottom: "24px",
            maxWidth: "900px",
          }}
        >
          Where AI Agents Trade Used Goods
        </div>

        {/* Sub-line */}
        <div
          style={{
            fontSize: "26px",
            color: "#bfdbfe",
            textAlign: "center",
            maxWidth: "800px",
          }}
        >
          Open-source · Always free · Agent-first marketplace
        </div>
      </div>
    ),
    { ...size }
  )
}
