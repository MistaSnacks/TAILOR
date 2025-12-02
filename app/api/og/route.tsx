import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0A0F14 0%, #0F1419 50%, #111820 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background glow effect */}
        <div
          style={{
            position: 'absolute',
            width: '800px',
            height: '800px',
            background: 'radial-gradient(circle, rgba(0,217,255,0.15) 0%, transparent 70%)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />
        
        {/* Grid pattern overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `
              linear-gradient(rgba(0,217,255,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,217,255,0.03) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />

        {/* Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '9999px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            marginBottom: '32px',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3L14.5 8.5L20.5 9.5L16 14L17 20L12 17L7 20L8 14L3.5 9.5L9.5 8.5L12 3Z"
              fill="#00D9FF"
            />
          </svg>
          <span style={{ color: '#94A3B8', fontSize: '18px' }}>
            AI-Powered Resume Tailoring
          </span>
        </div>

        {/* Main title */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div
            style={{
              fontSize: '120px',
              fontWeight: 900,
              letterSpacing: '-0.02em',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span style={{ color: '#FFFFFF' }}>T-</span>
            <span
              style={{
                background: 'linear-gradient(135deg, #4FD1C5 0%, #00BCD4 50%, #00D9FF 100%)',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              AI
            </span>
            <span style={{ color: '#FFFFFF' }}>-LOR</span>
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: '36px',
              color: '#94A3B8',
              marginTop: '16px',
              textAlign: 'center',
            }}
          >
            Tailor your resume to every job
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: '24px',
              color: '#64748B',
              marginTop: '8px',
              textAlign: 'center',
            }}
          >
            Stop sending generic resumes. Land more interviews.
          </div>
        </div>

        {/* CTA Button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '16px 32px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #4FD1C5 0%, #00BCD4 50%, #00D9FF 100%)',
            marginTop: '40px',
            fontSize: '20px',
            fontWeight: 600,
            color: '#0F1419',
          }}
        >
          Get Started Free
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12H19M19 12L12 5M19 12L12 19"
              stroke="#0F1419"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Floating resume card - left */}
        <div
          style={{
            position: 'absolute',
            top: '120px',
            left: '60px',
            padding: '20px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path
              d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
              stroke="#4FD1C5"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M14 2V8H20"
              stroke="#4FD1C5"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div
            style={{
              width: '100px',
              height: '8px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '4px',
            }}
          />
          <div
            style={{
              width: '70px',
              height: '8px',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: '4px',
            }}
          />
        </div>

        {/* Floating upload card - right */}
        <div
          style={{
            position: 'absolute',
            bottom: '120px',
            right: '60px',
            padding: '20px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path
              d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15"
              stroke="#00D9FF"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M17 8L12 3L7 8"
              stroke="#00D9FF"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M12 3V15"
              stroke="#00D9FF"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div
            style={{
              width: '100px',
              height: '8px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '4px',
            }}
          />
          <div
            style={{
              width: '70px',
              height: '8px',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: '4px',
            }}
          />
        </div>

        {/* Bottom accent line */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            width: '300px',
            height: '3px',
            background: 'linear-gradient(90deg, transparent, #00D9FF, transparent)',
            borderRadius: '2px',
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

