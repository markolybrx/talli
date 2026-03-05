import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const size = parseInt(searchParams.get("size") ?? "192");

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #7C3AED, #6366F1)",
          borderRadius: size * 0.22,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: size * 0.04, paddingLeft: size * 0.2 }}>
          <div style={{ width: size * 0.6, height: size * 0.1, background: "white", borderRadius: 99 }} />
          <div style={{ width: size * 0.45, height: size * 0.1, background: "rgba(255,255,255,0.7)", borderRadius: 99 }} />
          <div style={{ width: size * 0.3, height: size * 0.1, background: "rgba(255,255,255,0.4)", borderRadius: 99 }} />
        </div>
      </div>
    ),
    { width: size, height: size }
  );
}
