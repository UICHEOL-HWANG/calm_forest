import UIKit
import Capacitor

// 앱 안에 둔 네이티브 플러그인(npm 패키지가 아닌 것)은 여기서 등록한다 — Capacitor 문서의 'Custom Native iOS Code'.
// SceneDelegate 가 루트로 이 컨트롤러를 띄운다.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(GameCenterPlugin())   // 🍎 게임센터 로그인(js/gc-native.js)
    }
}
