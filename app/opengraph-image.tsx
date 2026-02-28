import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Jeoprompty social preview";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background:
          "radial-gradient(circle at 15% 20%, rgba(34,211,238,0.35), transparent 55%), radial-gradient(circle at 88% 18%, rgba(251,146,60,0.3), transparent 45%), linear-gradient(135deg, #06101f 0%, #0f172a 45%, #1e293b 100%)",
        color: "#f8fafc",
        fontFamily: "Arial, sans-serif",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 40,
          right: 48,
          width: 220,
          height: 220,
          borderRadius: 28,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(255,255,255,0.04)",
          transform: "rotate(12deg)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 60,
          right: 210,
          width: 180,
          height: 180,
          borderRadius: 999,
          background: "rgba(34,211,238,0.12)",
          border: "1px solid rgba(34,211,238,0.25)",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          padding: "54px 58px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: 999,
              background: "#22d3ee",
              boxShadow: "0 0 24px rgba(34,211,238,0.65)",
            }}
          />
          <div
            style={{
              display: "flex",
              fontSize: 28,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(241,245,249,0.85)",
            }}
          >
            Jeoprompty
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
            maxWidth: 760,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 76,
              fontWeight: 800,
              lineHeight: 1.02,
            }}
          >
            AI Jeopardy-style
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 76,
              fontWeight: 800,
              lineHeight: 1.02,
            }}
          >
            party game
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              lineHeight: 1.35,
              color: "rgba(226,232,240,0.86)",
              maxWidth: 760,
            }}
          >
            Write clever question prompts, score fast, and battle friends live
            on one shared board.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "18px 28px",
              borderRadius: 999,
              background: "linear-gradient(180deg, #22d3ee 0%, #06b6d4 100%)",
              color: "#082f49",
              fontSize: 34,
              fontWeight: 800,
              boxShadow: "0 20px 50px rgba(34,211,238,0.24)",
            }}
          >
            <span
              style={{
                display: "flex",
                width: 14,
                height: 14,
                borderRadius: 999,
                background: "#082f49",
              }}
            />
            Play Jeoprompty!
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
            }}
          >
            {["Live multiplayer", "Topic rounds", "Fast scoring"].map(
              (chip) => (
                <div
                  key={chip}
                  style={{
                    display: "flex",
                    padding: "10px 14px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(255,255,255,0.04)",
                    fontSize: 18,
                    color: "rgba(241,245,249,0.9)",
                  }}
                >
                  {chip}
                </div>
              ),
            )}
          </div>
        </div>
      </div>
    </div>,
    size,
  );
}
