import DeviceActivity
import SwiftUI

/// The two reports the Statistics screen shows. Shared by the app and the report extension.
extension DeviceActivityReport.Context {
    static let today = Self("today")
    static let week = Self("week")
}
