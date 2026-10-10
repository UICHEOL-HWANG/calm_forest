// =============================================================
//  🍎 게임센터 자동 로그인 → 신원 서명 (안드로이드 PlayGamesPlugin.java 와 같은 자리)
//  ------------------------------------------------------------
//  JS: js/gc-native.js 가 capPlugin("GameCenter") 로 부른다.
//   isAuthenticated() → { authenticated }        — 앱 시작 때 건 자동 인증 결과(창 없음)
//   signIn()          → { authenticated }        — 로그인 창을 한 번 띄운다(넛지)
//   fetchIdentity()   → { publicKeyUrl, signature, salt, timestamp, teamPlayerID, bundleID }
//                                                 — gc-auth Worker 가 Apple 인증서로 검증
//  ⚠️ authenticateHandler 는 한 번만 건다 — 다시 걸면 게임센터가 인증을 처음부터 다시 돈다.
//  ⚠️ 게임센터를 꺼 둔 기기·세 번 취소한 유저는 창(viewController)이 오지 않는다 → authenticated:false.
//  ⚠️ GameKit 이 핸들러를 어느 스레드에서 부를지 보장이 없다 → 상태·UIKit 은 전부 main 에서만(보안 리뷰 2026-10-11).
// =============================================================
import Foundation
import Capacitor
import GameKit

@objc(GameCenterPlugin)
public class GameCenterPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "GameCenterPlugin"
    public let jsName = "GameCenter"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAuthenticated", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "signIn", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "fetchIdentity", returnType: CAPPluginReturnPromise),
    ]

    private static let settleTimeout: Double = 8   // 게임센터가 답이 없어도 부팅이 매달리지 않게
    private static let signInTimeout: Double = 90  // 창이 닫혔는데 핸들러가 다시 안 불려도 JS 가 영영 기다리지 않게

    // ↓ 전부 main 스레드 전용
    private var settled = false                     // 첫 인증 결과가 왔나(시간 초과도 확정으로 본다)
    private var waiters: [() -> Void] = []
    private var loginViewController: UIViewController?
    private var pendingSignIn: CAPPluginCall?

    override public func load() {
        DispatchQueue.main.async { self.startAuthentication() }
    }

    private func startAuthentication() {
        GKLocalPlayer.local.authenticateHandler = { [weak self] viewController, error in
            DispatchQueue.main.async { self?.handleAuthentication(viewController, error) }
        }
    }

    private func handleAuthentication(_ viewController: UIViewController?, _ error: Error?) {
        if let error = error { CAPLog.print("[GameCenter] 인증 실패", error.localizedDescription) }
        loginViewController = viewController
        settled = true
        let ready = waiters
        waiters = []
        ready.forEach { $0() }
        // 로그인 창을 닫았거나(성공·취소) 창 없이 끝났다 → 기다리던 signIn 에 답한다
        if viewController == nil { finishSignIn() }
    }

    private func finishSignIn() {
        guard let call = pendingSignIn else { return }
        pendingSignIn = nil
        call.resolve(["authenticated": GKLocalPlayer.local.isAuthenticated])
    }

    // 첫 인증 결과가 오면(또는 시간 초과면) 한 번만 실행 — main 에서
    private func whenSettled(_ body: @escaping () -> Void) {
        DispatchQueue.main.async {
            if self.settled { body(); return }
            var done = false
            let once = { if !done { done = true; body() } }
            self.waiters.append(once)
            DispatchQueue.main.asyncAfter(deadline: .now() + GameCenterPlugin.settleTimeout) {
                self.settled = true   // 다음 호출마다 8초씩 또 기다리지 않게
                once()
            }
        }
    }

    @objc func isAuthenticated(_ call: CAPPluginCall) {
        whenSettled { call.resolve(["authenticated": GKLocalPlayer.local.isAuthenticated]) }
    }

    @objc func signIn(_ call: CAPPluginCall) {
        whenSettled {
            if GKLocalPlayer.local.isAuthenticated { call.resolve(["authenticated": true]); return }
            guard let vc = self.loginViewController, let host = self.bridge?.viewController,
                  host.presentedViewController == nil else {
                call.resolve(["authenticated": false])   // 게임센터 꺼짐·다른 창이 떠 있음 — 기다리게 두지 않는다
                return
            }
            self.pendingSignIn?.resolve(["authenticated": false])
            self.pendingSignIn = call
            host.present(vc, animated: true)
            DispatchQueue.main.asyncAfter(deadline: .now() + GameCenterPlugin.signInTimeout) { [weak self] in
                guard let self = self, self.pendingSignIn === call else { return }
                self.finishSignIn()
            }
        }
    }

    @objc func fetchIdentity(_ call: CAPPluginCall) {
        let player = GKLocalPlayer.local
        guard player.isAuthenticated else { call.reject("게임센터 미로그인"); return }
        let teamPlayerID = player.teamPlayerID   // 서명 받기 전에 고정 — 그사이 계정이 바뀌면 서명과 어긋난다
        player.fetchItems(forIdentityVerificationSignature: { url, signature, salt, timestamp, error in
            if let error = error { call.reject("서명 받기 실패: " + error.localizedDescription); return }
            guard let url = url, let signature = signature, let salt = salt else { call.reject("서명 필드 없음"); return }
            call.resolve([
                "publicKeyUrl": url.absoluteString,
                "signature": signature.base64EncodedString(),
                "salt": salt.base64EncodedString(),
                "timestamp": String(timestamp),
                "teamPlayerID": teamPlayerID,
                "bundleID": Bundle.main.bundleIdentifier ?? "",
            ])
        })
    }
}
