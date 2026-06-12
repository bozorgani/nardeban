#!/bin/bash
# تست همگام similar + saved-search — سرور را خودش بالا می‌آورد و در پایان می‌بندد
cd "$(dirname "$0")"
pkill -9 -f mongod 2>/dev/null; pkill -9 -f dev-server 2>/dev/null; sleep 1
rm -rf /tmp/mongo-mem-* 2>/dev/null

npm run dev:memory > /tmp/api-test.log 2>&1 &
SRV=$!

json() { node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log(eval(process.argv[1]))})" "$1"; }

READY=0
for i in $(seq 1 60); do
  sleep 2
  curl -s -m 2 http://localhost:4000/api/health 2>/dev/null | grep -q ok && { READY=1; break; }
done
echo "READY=$READY"
[ "$READY" != "1" ] && { tail -5 /tmp/api-test.log; kill $SRV 2>/dev/null; exit 1; }

AD=$(curl -s 'localhost:4000/api/ads?category=home-kitchen&limit=1' | json "j.ads[0]._id")
curl -s localhost:4000/api/ads/$AD/similar | json "'similar مبل: '+j.ads.length+' | '+j.ads.map(a=>a.title.slice(0,18)).join('، ')"
AD2=$(curl -s 'localhost:4000/api/ads?category=digital&limit=1' | json "j.ads[0]._id")
curl -s localhost:4000/api/ads/$AD2/similar | json "'similar دیجیتال: '+j.ads.length"

kill $SRV 2>/dev/null
pkill -9 -f mongod 2>/dev/null
echo DONE
