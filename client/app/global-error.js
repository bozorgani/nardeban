'use client';

// صفحه خطای سراسری — جایگزین builtin global-error نکست
// (وجود این فایل از باگ «Could not find the module ... global-error.js in the React Client Manifest» هم جلوگیری می‌کند)
export default function GlobalError({ error, reset }) {
  return (
    <html lang="fa" dir="rtl">
      <body
        style={{
          fontFamily: 'Vazirmatn, Tahoma, sans-serif',
          background: '#fff',
          color: '#1f2937',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          margin: 0,
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 340 }}>
          <div
            style={{
              width: 88,
              height: 88,
              margin: '0 auto 20px',
              background: '#fdf1f1',
              borderRadius: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 40,
            }}
          >
            ⚠️
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 10 }}>
            خطایی رخ داد
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.9, color: '#6b7280', marginBottom: 24 }}>
            مشکلی در نمایش صفحه پیش آمد. لطفاً دوباره تلاش کنید.
          </p>
          <button
            onClick={() => reset()}
            style={{
              fontFamily: 'inherit',
              cursor: 'pointer',
              background: '#a62626',
              color: '#fff',
              border: 0,
              padding: '13px 36px',
              borderRadius: 14,
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            تلاش مجدد
          </button>
        </div>
      </body>
    </html>
  );
}
