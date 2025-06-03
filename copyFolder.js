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
    const excludeDirs = ['node_modules', '.git', '.github', 'build', 'sample', 'tests'];
    const excludeFiles = ['README.md', 'index.html', '.gitignore', 'copyFolder.js'];

    await fs.copy(srcDir, targetFolderPath, {
        filter: (srcPath) => {
            const relativePath = path.relative(srcDir, srcPath); // 取得相對路徑
            const pathParts = relativePath.split(path.sep);
            const parsed = path.parse(relativePath);

            // 排除資料夾
            const inExcludedDir = excludeDirs.some(dir => pathParts.includes(dir));
            // 排除檔案（根據檔名）
            const isExcludedFile = excludeFiles.includes(parsed.base);

            return !(inExcludedDir || isExcludedFile);
        },
    });
}

// 目標資料夾路徑：注意使用雙反斜線（\\）或正斜線（/）
const sourceFolder = __dirname; // 當前資料夾
const targetFolder = ''; // 目標資料夾路徑

copyFolderExcludeNodeModules(sourceFolder, targetFolder)
    .then(() => console.log('資料夾複製完成，已排除 node_modules'))
    .catch(err => console.error('錯誤:', err));
