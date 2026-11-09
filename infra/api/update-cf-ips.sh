#!/bin/bash
# Cloudflare IPv4 대역만 80/443 허용(오리진 직접 접근 차단). 주 1회 cron 갱신.
set -e
RANGES=$(curl -fsS --max-time 20 https://www.cloudflare.com/ips-v4)
[ -n "$RANGES" ] || { echo "CF 대역 조회 실패 — 기존 규칙 유지"; exit 1; }
iptables -N CF-ALLOW 2>/dev/null || iptables -F CF-ALLOW
for r in $RANGES; do iptables -A CF-ALLOW -s "$r" -j ACCEPT; done
# INPUT 점프 룰 보장(중복 생성 방지)
iptables -C INPUT -p tcp -m multiport --dports 80,443 -j CF-ALLOW 2>/dev/null \
  || iptables -I INPUT 5 -p tcp -m multiport --dports 80,443 -j CF-ALLOW
netfilter-persistent save > /dev/null
echo "CF-ALLOW $(echo "$RANGES" | wc -l)개 대역 적용"
