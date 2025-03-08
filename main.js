const { app, BrowserWindow, ipcMain, Menu, dialog } = require("electron"); // 👈 Importar Menu
const { exec } = require("child_process");
const { autoUpdater } = require("electron-updater");
const path = require("path");
const filePath = path.join(app.getPath("userData"), "config.json");
const unzipper = require("unzipper"); // Necesitarás instalar 'unzipper' con npm
const { https } = require("follow-redirects"); // Usamos follow-redirects
const fs = require("fs-extra");
module.exports = filePath;

console.log("Archivo de config en: " + filePath);

if (!app.isPackaged) {
  console.log("Modo desarrollo detectado, actualizaciones desactivadas.");
  abrirVentana();
} else {
  // Iniciar la verificación de actualizaciones cuando la aplicación esté lista
  app.on("ready", () => {
    checkAndApplyUpdates();
  });
}

// Función principal para verificar y aplicar actualizaciones
async function checkAndApplyUpdates() {
  const localVersion = getLocalVersion();
  const remotePackageJsonUrl =
    "https://github.com/KevinAyalaAguilera/NuevoFiltroCargas/releases/latest/download/package.json";
  const filtroURL =
    "https://github.com/KevinAyalaAguilera/NuevoFiltroCargas/releases/latest/download/filtro.zip";

  try {
    const remoteVersion = await getRemoteVersion(remotePackageJsonUrl);

    if (remoteVersion != localVersion) {
      console.log("Versión repo: " + remoteVersion);
      console.log("Versión local: " + localVersion);
      console.log("Versiones no coinciden.");
      const filtroDir = path.join(__dirname, "filtro");
      console.log("Bajando archivo para a: " + filtroDir);
      let actualizado = await downloadAndUnzipData(filtroURL, filtroDir, "filtro");
      if (actualizado) {
        actualizarVersionPackage(remoteVersion);
        abrirVentana();
        dialog.showMessageBox({
          type: "info",
          title: "Actualización completada",
          message: "Los archivos se han actualizado correctamente.",
          buttons: ["OK"],
        });
      } else {
        abrirVentana();
        dialog.showMessageBox({
          type: "info",
          title: "No se ha podido actualizar",
          message: "No se ha podido actualizar.",
          buttons: ["OK"],
        });
      }
    } else {
      console.log("Versiones coinciden, no se requiere actualización.");
      abrirVentana();
    }
  } catch (error) {
    console.error("Error durante la actualización:", error);
    abrirVentana();
    dialog.showMessageBox({
      type: "error",
      title: "Error de actualización",
      message: "Hubo un error al verificar o aplicar la actualización.",
      buttons: ["OK"],
    });
  }
}

// Función para leer la versión local
function getLocalVersion() {
  const packageJsonPath = path.join(__dirname, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
  return packageJson.version;
}

// Función para leer la versión desde el package.json remoto
async function getRemoteVersion(remotePackageJsonUrl) {
  const tempFilePath = path.join(app.getPath("temp"), "remote-package.json");
  console.log("Ruta temporal del archivo:", tempFilePath); // Depuración

  try {
    await downloadFile(remotePackageJsonUrl, tempFilePath);

    // Verifica que el archivo se haya descargado correctamente
    const fileContent = fs.readFileSync(tempFilePath, "utf-8");
    console.log("Json de repo descargado."); // Inspecciona el contenido

    // Intenta parsear el JSON
    const remotePackageJson = JSON.parse(fileContent);
    return remotePackageJson.version;
  } catch (error) {
    console.error(
      "Error al descargar o parsear el package.json remoto:",
      error
    );
    throw error; // Relanza el error para manejarlo en checkAndApplyUpdates
  }
}

// Función para descargar y descomprimir el archivo data.zip
async function downloadAndUnzipData(dataZipUrl, outputDir, info) {
  const tempExtractPath = path.join(app.getPath("temp"), "unzipped_data");
  const tempZipPath = path.join(app.getPath("temp"), "data.zip");

  try {
    // Descargar el archivo ZIP en tempZipPath
    await downloadFile(dataZipUrl, tempZipPath);
    console.log("ZIP de repo para actualizar " + info + " descargado en: " + tempZipPath);

    // Extraer el ZIP en la carpeta temporal
    await fs
      .createReadStream(tempZipPath)
      .pipe(unzipper.Extract({ path: tempExtractPath }))
      .promise();

    console.log("ZIP extraído en: " + tempExtractPath);

    console.log(
      "El directorio donde se copiará la nueva versión es: " + outputDir
    );

    // Mover los archivos extraídos a outputDir
    await fs.copy(tempExtractPath, outputDir, { overwrite: true });
    await fs.remove(tempExtractPath);
    console.log("Movidos " + tempExtractPath + " a " + outputDir);
  } catch (error) {
    console.error("Error al descargar y extraer data.zip de " + info + ":", error);
    return false;
  }
  return true;
}

// Función para descargar un archivo desde una URL
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https
      .get(url, (response) => {
        console.log("Código de estado:", response.statusCode); // Depuración
        //console.log('Cabeceras:', response.headers); // Depuración

        if (response.statusCode !== 200) {
          reject(
            new Error(
              `Error en la descarga: Código de estado ${response.statusCode}`
            )
          );
          return;
        }

        response.pipe(file);
        file.on("finish", () => {
          file.close(resolve);
        });
      })
      .on("error", (err) => {
        fs.unlink(destPath, () => {}); // Eliminar el archivo si hay error
        reject(err);
      });
  });
}

function actualizarVersionPackage(remoteVersion) {
  try {
    const packageJsonPath = path.join(__dirname, "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    packageJson.version = remoteVersion;

    fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), (err) => {
      if (err) {
          console.error("Error al guardar archivo package.json:", err);
      } else {
          console.log("Actualizada versión de package.json:", packageJsonPath);
      }
    });
  } catch (err) {
      console.error("Error al actualizar el archivo package.json:", err);
  }
}

function abrirVentana() {
  let mainWindow;
  let icono;
  if (!app.isPackaged) icono = "./filtro/img/barrier.png";
  else icono = "./filtro/img/icon.png";

  app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
      maximized: true,
      width: 1920,
      height: 1080,
      icon: icono,
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
            click: () => mainWindow.loadFile("filtro/calendario.html"),
          },
          {
            label: "Mail Helper",
            click: () => abrirMH(),
          },
          { type: "separator" },
          {
            label: "Configuración",
            click: () => mainWindow.loadFile("filtro/config.html"),
          },
          {
            label: "Ayuda",
            click: () => mainWindow.loadFile("filtro/ayuda.html"),
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
  ipcMain.on("recibir-datos-precarga", (event) => {
    const configPath = path.join(app.getPath("userData"), "config.json");
    const downloadPath = app.getPath("downloads");
    const docsPath = path.join(app.getPath("documents"), "Filtro Cargas");
    event.reply("fromMain", configPath, downloadPath, docsPath);
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
}


function abrirMH() {
  let icono = "./filtro/img/mhelper.png";
  let mhWindow = new BrowserWindow({
    width: 1000,
    height: 750,
    icon: icono,
    webPreferences: {
      contextIsolation: false, // Importante para seguridad
      enableRemoteModule: true, // Seguridad extra
      nodeIntegration: true, // Bloquea `require` en el frontend
    },
  });

  mhWindow.loadFile("filtro/mailhelper.html");
  if (!app.isPackaged) mhWindow.webContents.openDevTools();
  mhWindow.setMenu(null);

}