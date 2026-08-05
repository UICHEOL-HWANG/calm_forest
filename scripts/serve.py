#!/usr/bin/env python3
"""calm forest 로컬 개발 서버 (캐시 완전 비활성화)

iOS Safari 등은 Cache-Control 헤더가 없으면 JS/CSS를 공격적으로 캐시해서
코드를 고쳐도 폰에 반영이 안 되는 문제가 있습니다. 이 서버는 모든 응답에
no-store 를 붙이고 Last-Modified 를 제거해 항상 최신 파일을 내려줍니다.

사용법:
    python3 scripts/serve.py            # 기본 포트 8000
    python3 scripts/serve.py 5500       # 포트 지정
그 뒤 폰에서  http://<맥의 IP>:8000  로 접속 (예: http://192.168.1.95:8000)
맥 IP 확인:  ipconfig getifaddr en0
"""
import http.server
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # 브라우저가 절대 캐시하지 않도록 강제
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def send_header(self, keyword, value):
        # Last-Modified 를 없애 304(재검증 후 캐시 사용) 자체를 차단
        if keyword.lower() == 'last-modified':
            return
        super().send_header(keyword, value)


def main():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(('0.0.0.0', PORT), NoCacheHandler) as httpd:
        print(f'🌲 calm forest dev server (no-cache) → http://0.0.0.0:{PORT}')
        print('   폰 접속: http://<맥 IP>:%d  (맥 IP: ipconfig getifaddr en0)' % PORT)
        print('   중지: Ctrl+C')
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\n서버를 종료했어요.')


if __name__ == '__main__':
    main()
