import './globals.css';
import { AuthProvider } from '../lib/AuthContext';
import Header from '../components/Header';

export const metadata = {
  title: 'نردبان | نیازمندی‌های رایگان',
  description: 'خرید و فروش، استخدام، املاک و خودرو — شبیه دیوار',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <link
          rel="stylesheet"
          precedence="default"
          href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css"
        />
        <AuthProvider>
          <Header />
          <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
          <footer className="mt-12 border-t bg-white py-6 text-center text-sm text-gray-500">
            نردبان — پروژه نمونه آموزشی (کلون دیوار) ⚒️
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
