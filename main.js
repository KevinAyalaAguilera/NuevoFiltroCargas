const { app, BrowserWindow, ipcMain, Menu, dialog } = require("electron"); // 👈 Importar Menu
const { autoUpdater } = require("electron-updater");
const path = require("path");
const filePath = path.join(app.getPath('userData'), 'config.json');
module.exports = filePath;

// COMPROBAR VERSIÓN

if (!app.isPackaged) {
  console.log('Modo desarrollo detectado, actualizaciones desactivadas.');
} else {

  const feedURL = `https://github.com/KevinAyalaAguilera/NuevoFiltroCargas/releases/latest/download`;
  autoUpdater.setFeedURL({ url: feedURL });

  autoUpdater.on('update-available', () => {
      dialog.showMessageBox({
          type: 'info',
          title: 'Actualización disponible',
          message: 'Se encontró una nueva versión. Se descargará en segundo plano.',
      });
  });

  autoUpdater.on('update-downloaded', () => {
      dialog.showMessageBox({
          type: 'info',
          title: 'Actualización lista',
          message: 'La actualización se ha descargado. ¿Deseas reiniciar ahora?',
          buttons: ['Reiniciar', 'Más tarde']
      }).then(result => {
          if (result.response === 0) autoUpdater.quitAndInstall();
      });
  });

  app.on('ready', () => {
      autoUpdater.checkForUpdatesAndNotify();
  });
}
//


let mainWindow;

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    maximized: true,
    width: 1920,
    height: 1080,
    icon: "./filtro/img/icon.png",
    webPreferences: {
      contextIsolation: false, // Importante para seguridad
      enableRemoteModule: true, // Seguridad extra
      nodeIntegration: true, // Bloquea `require` en el frontend
    },
  });

  mainWindow.loadFile("filtro/filtro.html");
  mainWindow.maximize();

  // ✅ Crear el menú correctamente
  const menuTemplate = [
    {
      label: "Inicio",
      submenu: [
        {
          label: "Filtro de preparación de cargas",
          click: () => mainWindow.loadFile("filtro/filtro.html"),
        },
        {
          label: "Calendario",
          click: () => mainWindow.loadFile("filtro/calendar.html"),
        },
        {
          label: "Mail Helper",
          click: () => mainWindow.loadFile("filtro/help.html"),
        },
        { type: "separator" },
        {
          label: "Configuración",
          click: () => mainWindow.loadFile("filtro/config.html"),
        },
        {
          label: "Ayuda",
          click: () => mainWindow.loadFile("filtro/help.html"),
        },
        { type: "separator" },
        {
        label: "Desarrollador",
          click: () => mainWindow.webContents.openDevTools(),
        },
        { type: "separator" },
        { label: "Salir", role: "quit" },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
});

// Escuchar el evento desde config.js para guardar JSON
ipcMain.on("guardar-config", (event, data) => {
  fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
    if (err) {
      console.error("Error al guardar:", err);
    } else {
      console.log("Configuración guardada en:", filePath);
    }
  });
});

// Escuchar evento para devolver datos necesarios
ipcMain.on('recibir-datos-precarga', (event) => {
  const configPath = path.join(app.getPath('userData'), 'config.json');
  const downloadPath = app.getPath('downloads');
  const docsPath = path.join(app.getPath('documents'), 'Filtro Cargas');
  event.reply('fromMain', configPath, downloadPath, docsPath);
});

// Leer el archivo JSON y enviar los datos al renderizador
ipcMain.handle("leer-config", () => {
  try {
    // Leer el archivo JSON (asegúrate de que exista)
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath);
      return JSON.parse(data); // Devuelve los datos como objeto
    }
  } catch (err) {
    console.error("Error al leer el archivo de configuración:", err);

    // Si el archivo está vacío o no existe, devuelve un objeto vacío por defecto
    return { almacenes: [], checkboxes: {} }; // Datos por defecto
  }
  return {}; // Si no existe, devuelve un objeto vacío
});
