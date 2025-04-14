// import fs from 'fs-extra';
// import path from 'path';
const fs = require('fs-extra');
const path = require('path');
// const __dirname = path.dirname(new URL(import.meta.url).pathname);

// 複製資料夾的函式
async function copyFolderExcludeNodeModules(srcPath, targetPath) {
    // 檢查來源是否是資料夾
    const isDirectory = (await fs.stat(srcPath)).isDirectory();

    // 如果來源是檔案，使用 path.dirname() 來取得檔案的資料夾
    const srcDir = isDirectory ? srcPath : path.dirname(srcPath);
    const targetFolderPath = path.join(targetPath, path.basename(srcPath));

    await fs.copy(srcDir, targetFolderPath, {
        filter: (srcPath) => {
            // 排除 'node_modules' 資料夾
            return !srcPath.includes('node_modules');
        },
    });
}

// 目標資料夾路徑：注意使用雙反斜線（\\）或正斜線（/）
const sourceFolder = __dirname; // 當前資料夾
const targetFolder = 'C:/Users/wellchoose/Desktop/FRONT/example/BT04T02_IFTBT(V7)_v1140410-1200_(maji)'; // 目標資料夾路徑

copyFolderExcludeNodeModules(sourceFolder, targetFolder)
    .then(() => console.log('資料夾複製完成，已排除 node_modules'))
    .catch(err => console.error('錯誤:', err));
