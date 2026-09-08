import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#02060d",
          backgroundImage:
            "radial-gradient(circle at 82% 30%, rgba(63,199,255,0.28) 0%, rgba(63,199,255,0) 55%), radial-gradient(circle at 10% 90%, rgba(79,209,197,0.18) 0%, rgba(79,209,197,0) 60%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 36 }}>
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              backgroundColor: "#ff8a3d",
              boxShadow: "0 0 32px 6px rgba(255,138,61,0.55)",
            }}
          />
          <div style={{ display: "flex", fontSize: 34, color: "#a5b9d1", fontWeight: 600, letterSpacing: -0.5 }}>
            <span>Tidal</span>
            <span style={{ color: "#6c88a8", fontWeight: 400 }}>.agent</span>
          </div>
        </div>
        <div
          style={{
            fontSize: 68,
            fontWeight: 600,
            color: "#f0f7ff",
            lineHeight: 1.08,
            maxWidth: 980,
            letterSpacing: -1,
          }}
        >
          Unattended Agentic Systems &amp; Operations
        </div>
        <div style={{ fontSize: 28, color: "#a5b9d1", marginTop: 28, maxWidth: 860 }}>
          Autonomous agent infrastructure, live telemetry, and self-audited security &mdash; running unattended.
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 56,
            width: 200,
            height: 4,
            borderRadius: 2,
            backgroundImage: "linear-gradient(115deg, #4fd1c5 0%, #3fc7ff 55%, #a6e8ff 100%)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
