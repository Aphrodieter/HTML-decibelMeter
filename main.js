import { app, BrowserWindow } from "electron";
import path from "path";
import childProcess from "child_process";
import { fileURLToPath } from "url";

let mainWindow;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.on("ready", () => {
  // Start the Express server
  childProcess.spawn("node", [path.join(__dirname, "index.js")], {
    stdio: "inherit",
    shell: true,
  });

  // Create the Electron browser window
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      contextIsolation: true, // Recommended for security
      nodeIntegration: false, // Prevents Node.js access in the frontend
    },
  });

  // Load the Express server in the Electron window
  mainWindow.loadFile(path.join(__dirname, "frontends", "index.html"));

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
