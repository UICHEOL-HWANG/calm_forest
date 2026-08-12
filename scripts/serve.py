#!/usr/bin/env python3
# =============================================================
#  calm forest · 개발용 로컬 서버 (캐시 완전 비활성)
#  ------------------------------------------------------------
#  python3 -m http.server 는 캐시 헤더가 없어 브라우저가 JS 모듈을
#  disk cache 로 재사용함 → 코드를 고쳐도 옛 버전이 실행되는 문제.
#  이 서버는 모든 응답에 no-store 를 붙여 항상 최신 파일을 서빙.
#
#  사용: python3 scripts/serve.py [포트]   (기본 8000, 어디서 실행해도 프로젝트 루트 서빙)
# =============================================================
import http.server
import os
import sys

# 포트 우선순위: 실행 인자 > 환경변수 PORT > 8000
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get('PORT') or 8000)
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))  # 항상 프로젝트 루트 서빙


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()


if __name__ == '__main__':
    print(f'[serve] http://localhost:{PORT} (no-cache 개발 서버)')
    http.server.ThreadingHTTPServer(('', PORT), NoCacheHandler).serve_forever()
