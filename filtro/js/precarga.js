const { app, ipcRenderer, BrowserWindow, ipcMain, Menu, autoUpdater, dialog } = require("electron");
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

var finalConfigPath = "";
var finalDownloadPath = "";
var finalDocsPath = "";

// Enviar un mensaje al proceso principal
ipcRenderer.send('recibir-datos-precarga');

// Escuchar el mensaje enviado desde el proceso principal
ipcRenderer.on('fromMain', (event, configPath, downloadPath, docsPath) => {
    finalConfigPath = configPath;
    finalDownloadPath = downloadPath;
    finalDocsPath = docsPath;
});