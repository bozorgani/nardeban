import './globals.css';
import { AuthProvider } from '../lib/AuthContext';
import { ToastProvider } from '../components/Toast';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import PWA from '../components/PWA';

export const metadata = {
  title: 'نردبان | نیازمندی‌های رایگان',
  description: 'خرید و فروش، استخدام، املاک و خودرو — شبیه دیوار',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'نردبان',
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
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        {/* 🌙 جلوگیری از پرش تم (FOUC): پیش از رنگ‌آمیزی، تم ذخیره‌شده/سیستم اعمال می‌شود */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(!t&&m)){document.documentElement.classList.add('dark')}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <link
          rel="stylesheet"
          precedence="default"
          href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css"
        />
        <ToastProvider>
          <AuthProvider>
            <Header />
            {/* پدینگ پایین در موبایل برای ناوبری ثابت */}
            <main className="mx-auto max-w-7xl px-4 py-6 pb-24 md:pb-8">{children}</main>
            <BottomNav />
            <PWA />
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
