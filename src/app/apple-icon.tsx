import { ImageResponse } from "next/og";

// Home-screen icon for iPhone/iPad (PNG). Same mark as app/icon.svg.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1A3C34"
        }}
      >
        <svg width="120" height="120" viewBox="0 0 64 64">
          <path
            d="M41.2 21.6A14 14 0 1 0 41.2 42.4"
            fill="none"
            stroke="#FDE68A"
            strokeWidth="7"
            strokeLinecap="round"
          />
        </svg>
      </div>
    ),
    size
  );
}
