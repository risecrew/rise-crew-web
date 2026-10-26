import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'RISE CREW, the startup club of Sungkyunkwan University';

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 80,
        background: '#003e91',
        color: '#ffffff',
      }}
    >
      <div style={{ fontSize: 28, letterSpacing: 6, opacity: 0.85 }}>SUNGKYUNKWAN UNIVERSITY</div>
      <div style={{ fontSize: 132, fontWeight: 800, marginTop: 12 }}>RISE CREW</div>
      <div style={{ fontSize: 36, marginTop: 24, color: '#9fc952' }}>
        Reach · Ignite · Scale up · Elevate
      </div>
    </div>,
    size,
  );
}
