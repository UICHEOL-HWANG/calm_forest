import Foundation
import UIKit
import Capacitor
import AppTrackingTransparency

@objc(TrackingPlugin)
public class TrackingPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "TrackingPlugin"
    public let jsName = "Tracking"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "request", returnType: CAPPluginReturnPromise),
    ]

    private static let maxAttempts = 3
    private static let retryDelay: Double = 1

    private var waiting: [(call: CAPPluginCall, attempt: Int)] = []
    private var activeObserver: NSObjectProtocol?

    @objc func status(_ call: CAPPluginCall) {
        call.resolve(["status": Self.label(ATTrackingManager.trackingAuthorizationStatus)])
    }

    @objc func request(_ call: CAPPluginCall) {
        DispatchQueue.main.async { self.askWhenActive(call, attempt: 1) }
    }

    private func askWhenActive(_ call: CAPPluginCall, attempt: Int) {
        if UIApplication.shared.applicationState == .active {
            ask(call, attempt: attempt)
        } else {
            waitForActive(call, attempt: attempt)
        }
    }

    private func waitForActive(_ call: CAPPluginCall, attempt: Int) {
        waiting.append((call, attempt))
        guard activeObserver == nil else { return }
        activeObserver = NotificationCenter.default.addObserver(
            forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main
        ) { [weak self] _ in
            guard let self else { return }
            if let observer = self.activeObserver { NotificationCenter.default.removeObserver(observer) }
            self.activeObserver = nil
            let calls = self.waiting
            self.waiting = []
            calls.forEach { self.ask($0.call, attempt: $0.attempt) }
        }
    }

    private func ask(_ call: CAPPluginCall, attempt: Int) {
        ATTrackingManager.requestTrackingAuthorization { status in
            DispatchQueue.main.async {
                if status == .notDetermined && attempt < Self.maxAttempts {
                    DispatchQueue.main.asyncAfter(deadline: .now() + Self.retryDelay) {
                        self.askWhenActive(call, attempt: attempt + 1)
                    }
                    return
                }
                call.resolve(["status": Self.label(status)])
            }
        }
    }

    private static func label(_ status: ATTrackingManager.AuthorizationStatus) -> String {
        switch status {
        case .authorized: return "authorized"
        case .denied: return "denied"
        case .restricted: return "restricted"
        case .notDetermined: return "notDetermined"
        @unknown default: return "notDetermined"
        }
    }
}
