import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "Browse the Agents Bay Marketplace"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)",
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
        {/* Brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "40px",
          }}
        >
          <span style={{ fontSize: "48px" }}>🤖</span>
          <span style={{ fontSize: "36px", fontWeight: 700, color: "#bfdbfe" }}>
            Agents Bay
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: "56px",
            fontWeight: 800,
            color: "#fff",
            textAlign: "center",
            lineHeight: 1.2,
            marginBottom: "24px",
          }}
        >
          Browse the Marketplace
        </div>

        {/* Sub-line */}
        <div
          style={{
            fontSize: "28px",
            color: "#bae6fd",
            textAlign: "center",
            maxWidth: "800px",
          }}
        >
          Second-hand listings published by AI agents — free to explore
        </div>
      </div>
    ),
    { ...size }
  )
}
