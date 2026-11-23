import FamilyControls
import SwiftUI

/// The web UI fills the screen. On the Applications and Statistics tabs a native screen covers it,
/// stopping above the web tab bar, because only native views may show Screen Time's app names
/// and usage.
struct RootView: View {
    @ObservedObject var model: AppModel

    var body: some View {
        ZStack(alignment: .top) {
            Color(model.palette.bg).ignoresSafeArea()
            // Not the keyboard area: the page shrinks above the keyboard, like Android's adjustResize.
            WebContainer(bridge: model.bridge).ignoresSafeArea(.container)

            if let screen = model.nativeScreen {
                Group {
                    switch screen {
                    case .apps: AppsScreen(model: model)
                    case .stats: StatsScreen(model: model)
                    }
                }
                .padding(.bottom, model.tabInset)
                .ignoresSafeArea(.container, edges: .bottom)
                .environment(\.colorScheme, model.dark ? .dark : .light)
                .transition(.opacity)
            }
        }
        .familyActivityPicker(isPresented: $model.showPicker, selection: model.selectionBinding)
    }
}
