import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.backgroundColor = UIColor(red: 0.875, green: 0.910, blue: 0.847, alpha: 1)
        window?.rootViewController = MainViewController()   // 🍎 앱 내 플러그인(GameCenter) 등록
        window?.makeKeyAndVisible()
        if let window = window { addBootMark(to: window) }

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    private func addBootMark(to window: UIWindow) {
        let mark = UIImageView(image: UIImage(named: "Splash"))
        let b = window.bounds
        mark.frame = CGRect(x: b.midX - 46, y: b.height * 0.42 - 46, width: 92, height: 92)
        mark.autoresizingMask = [.flexibleLeftMargin, .flexibleRightMargin, .flexibleTopMargin, .flexibleBottomMargin]
        window.insertSubview(mark, at: 0)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
