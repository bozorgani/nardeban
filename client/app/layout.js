import './globals.css';
import localFont from 'next/font/local';
import dynamic from 'next/dynamic';
import { AuthProvider } from '../lib/AuthContext';

// فونت وزیرمتن خودمیزبان (UX-09) — بدون CDN، بهینه، بدون FOUC
const vazirmatn = localFont({
  src: [
    { path: '../public/fonts/Vazirmatn-400.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/Vazirmatn-500.woff2', weight: '500', style: 'normal' },
    { path: '../public/fonts/Vazirmatn-700.woff2', weight: '700', style: 'normal' },
    { path: '../public/fonts/Vazirmatn-900.woff2', weight: '900', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-vazirmatn',
  fallback: ['Tahoma', 'system-ui', 'sans-serif'],
});
import { ToastProvider } from '../components/Toast';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import Footer from '../components/Footer';
import PWA from '../components/PWA';

export const metadata = {
  title: 'بفروش | نیازمندی‌های رایگان',
  description: 'خرید و فروش، استخدام، املاک و خودرو — شبیه دیوار',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'بفروش',
    statusBarStyle: 'default',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#a62626' },
    { media: '(prefers-color-scheme: dark)', color: '#0e1626' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable} suppressHydrationWarning>
      <head>
        {/* 🌙 جلوگیری از پرش تم (FOUC): پیش از رنگ‌آمیزی، تم ذخیره‌شده/سیستم اعمال می‌شود */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(!t&&m)){document.documentElement.classList.add('dark')}}catch(e){}})();`,
          }}
        />
      </head>
      {/*
        🦶 sticky footer pattern (F1):
        body → flex-col با min-h-dvh تا کل ویوپورت پر شود.
        main → flex-1 تا فضای خالی صفحات کوتاه (/about, /terms, 404, /support)
        را بگیرد و فوتر به انتهای ویوپورت بچسبد.
        از position:sticky استفاده نمی‌کنیم چون با overflow-x:hidden در برخی
        مرورگرها می‌شکست؛ flex sticky-footer رفتارش در همهٔ مرورگرها قطعی است.
      */}
      <body className="flex min-h-dvh flex-col">
        <ToastProvider>
          <AuthProvider>
            <Header />
            {/*
              flex-1 = main تمام فضای باقی‌مانده را می‌گیرد → فوتر همیشه ته.
              pb-24 موبایل = فضای BottomNav ثابت (md:pb-0 روی دسکتاپ که نیست).
            */}
            <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-24 md:pb-8">
              {children}
            </main>
            <Footer />
            <BottomNav />
            <PWA />
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
