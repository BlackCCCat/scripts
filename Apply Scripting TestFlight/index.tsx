import { Navigation, Script } from "scripting"
import ApplicationView from "./pages/application_view"

async function run(): Promise<void> {
  await Navigation.present(<ApplicationView />)
  Script.exit()
}

run()
