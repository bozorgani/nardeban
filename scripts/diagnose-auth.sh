#!/usr/bin/env bash
# ============================================================================
# تشخیص باگ «لطفا وارد شوید» — روی خود سرور اجرا کنید:
#   bash scripts/diagnose-auth.sh
# با cookie-jar یک جریان واقعی لاگین→درخواست authenticated را شبیه‌سازی می‌کند.
# ============================================================================
BASE="${1:-http://localhost}"
PHONE="09120000123"
JAR=$(mktemp)

echo "🔎 BASE=$BASE"
echo "────────────────────────────────────────────"

# ۱) کد جدید روی سرور؟
echo -n "۱) COOKIE_SECURE در کد سرور: "
grep -q "COOKIE_SECURE" server/src/utils/token.js 2>/dev/null && echo "✅" || echo "❌ git pull لازم است"

# ۲) credentials در باندل build‌شدهٔ فرانت؟ (مهم‌ترین بررسی)
echo -n "۲) credentials در فرانتِ build‌شده: "
if [ -d client/.next ]; then
  if grep -rqs "credentials" client/.next/server 2>/dev/null || grep -rqs "credentials:\"include\"\|credentials:'include'\|include" client/.next/static 2>/dev/null; then
    echo "✅ به‌نظر هست"
  else
    echo "⚠️ مطمئن نیست — اگر فرانت را بعد از تغییرات build نکرده‌اید، حتماً rebuild کنید"
  fi
else
  echo "ℹ️ client/.next نیست (احتمالاً داکر) — مطمئن شوید frontend را --build کرده‌اید"
fi

# ۳) env کوکی روی سرور
echo "۳) server/.env کوکی:"
grep -E "COOKIE_SECURE|COOKIE_SAMESITE|NODE_ENV|CLIENT_ORIGIN" server/.env 2>/dev/null | sed 's/^/      /' || echo "      ❌ server/.env یافت نشد"

# ۴) health
echo -n "۴) health: "; curl -s -o /dev/null -w "%{http_code}\n" "$BASE/api/health"

# ۵) request-otp
echo "۵) request-otp:"
curl -s -c "$JAR" -X POST "$BASE/api/auth/request-otp" -H "Content-Type: application/json" \
  -d "{\"phone\":\"$PHONE\"}" | sed 's/^/      /'

# ۶) verify با کد اشتباه فقط برای دیدن هدر Set-Cookie ساختاری (انتظار 400)
echo "۶) هدرهای verify (کد اشتباه — فقط برای دیدن ساختار):"
curl -s -D - -o /dev/null -c "$JAR" -X POST "$BASE/api/auth/verify-otp" \
  -H "Content-Type: application/json" -d "{\"phone\":\"$PHONE\",\"code\":\"000000\"}" \
  | grep -iE "HTTP/|set-cookie" | sed 's/^/      /'

echo "────────────────────────────────────────────"
echo "📌 برای تست واقعی کوکی با کد درست (کد را از پیامک یا DB بگیرید):"
echo "   curl -c jar.txt -X POST $BASE/api/auth/verify-otp -H 'Content-Type: application/json' -d '{\"phone\":\"$PHONE\",\"code\":\"کدواقعی\"}'"
echo "   cat jar.txt   # باید nardeban_token را ببینید"
echo "   curl -b jar.txt $BASE/api/auth/me   # باید کاربر را برگرداند (نه «لطفا وارد شوید»)"
rm -f "$JAR"
