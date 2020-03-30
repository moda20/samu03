'use strict';
const path = require('path');
const {app, BrowserWindow, Menu} = require('electron');
/// const {autoUpdater} = require('electron-updater');
const {is} = require('electron-util');
const unhandled = require('electron-unhandled');
const debug = require('electron-debug');
const contextMenu = require('electron-context-menu');
const config = require('./config');
const menu = require('./menu');
const electron = require('electron');
const { exec } = require('child_process');
const ipcMain = electron.ipcMain;

unhandled();
debug();
contextMenu();

app.setAppUserModelId("com.moda20.samu03");

// Uncomment this before publishing your first version.
// It's commented out as it throws an error if there are no published versions.
// if (!is.development) {
// 	const FOUR_HOURS = 1000 * 60 * 60 * 4;
// 	setInterval(() => {
// 		autoUpdater.checkForUpdates();
// 	}, FOUR_HOURS);
//
// 	autoUpdater.checkForUpdates();
// }

// Prevent window from being garbage collected
let mainWindow;

const createMainWindow = async () => {
	const win = new BrowserWindow({
		title: app.name,
		simpleFullscreen:true,
		show: true,
		webPreferences: {
			nodeIntegration: true,
		}
	});

	win.on('ready-to-show', () => {
		win.show();
		win.maximize();
	});

	win.on('closed', () => {
		// Dereference the window
		// For multiple windows store them in an array
		mainWindow = undefined;
	});


	const { dialog } = require('electron')

	ipcMain.on('open-file-dialog', function (event) {
		dialog.showSaveDialog({
			title:"Enregistrer en fichier excel",
			properties: ['openDirectory'],
			filters:[
				{
					name: "MS Excel",
					extensions:["xlsx"]
				}
			]
		}).then(
				files=>{
					if (files) event.sender.send('selected-file', files)
				}
		)
	});

	ipcMain.on('open-excel-file-dialog', function (event) {
		dialog.showOpenDialog({
			title:"Ouvrir le fichier excel",
			properties: ['openFile'],
			multiSelections:false,
			filters:[
				{
					name: "MS Excel",
					extensions:["xlsx"]
				}
			]
		}).then(
				files=>{
					if (files) event.sender.send('selected-excel-file', files)
				}
		)
	});

	ipcMain.on('open-os-explorer', function (event, args) {
		console.log(args);
		let fpath=args;
		var command = '';
		switch (process.platform) {
			case 'darwin':
				command = 'open  ' + fpath;
				break;
			case 'win32':
				if (process.env.SystemRoot) {
					command = path.join(process.env.SystemRoot, 'explorer.exe');
				} else {
					command = 'explorer.exe';
				}
				command += ' /select,' + fpath;
				break;
			default:
				fpath = path.dirname(fpath)
				command = 'xdg-open ' + fpath;
		}
		console.log(command);
		exec(command, function(stdout) {
			//Do something if you really need to
		});
	})


	await win.loadFile(path.join(__dirname, 'index.html'));

	return win;
};






// Prevent multiple instances of the app
if (!app.requestSingleInstanceLock()) {
	app.quit();
}

app.on('second-instance', () => {
	if (mainWindow) {
		if (mainWindow.isMinimized()) {
			mainWindow.restore();
		}

		mainWindow.show();
	}
});

app.on('window-all-closed', () => {
	if (!is.macos) {
		app.quit();
	}
});

app.on('activate', () => {
	if (!mainWindow) {
		mainWindow = createMainWindow();
	}
});

(async () => {
	await app.whenReady();
	Menu.setApplicationMenu(menu);
	mainWindow = await createMainWindow();

})();
