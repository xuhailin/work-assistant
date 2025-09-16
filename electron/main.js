const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { exec } = require("child_process");
const fs = require("fs").promises;
const { mkdir } = require("fs").promises;

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

// 确保目录存在的辅助函数
async function ensureDirExists(filePath) {
  const dir = path.dirname(filePath);
  try {
    await mkdir(dir, { recursive: true });
    console.log('📁 目录创建成功或已存在:', dir);
  } catch (error) {
    console.error('❌ 创建目录失败:', error);
    throw error;
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// 示例：文件选择对话框
ipcMain.handle("dialog:openFile", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog();
  if (canceled) return null;
  return filePaths[0];
});

// 打开文件夹选择器
ipcMain.handle("dialog:openFolder", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });
    if (canceled) return null;
    return filePaths[0];
  });



  // 分页获取 git 日志
  ipcMain.handle("git:getLogs", async (event, repoPath, page = 1, pageSize = 20) => {
    return new Promise((resolve, reject) => {
      const skip = (page - 1) * pageSize;
      const cmd = `git -C "${repoPath}" log --skip=${skip} -n ${pageSize} --pretty=format:"%h||%an||%ad||%s" --date=short`;
      
      exec(cmd, (err, stdout) => {
        if (err) return reject(err);
        const logs = stdout.split("\n").filter(line => line.trim()).map(line => {
          const [hash, author, date, message] = line.split("||");
          return { hash, author, date, message, project: path.basename(repoPath) };
        });
        resolve(logs);
      });
    });
  });

  // 获取多个项目的 git 日志并合并
  ipcMain.handle("git:getMultipleLogs", async (event, repoPaths, pageSize = 100) => {
    try {
      const allLogs = [];
      
      // 并行获取所有项目的日志
      const promises = repoPaths.map(async (repoPath) => {
        return new Promise((resolve, reject) => {
          const cmd = `git -C "${repoPath}" log -n ${pageSize} --pretty=format:"%h||%an||%ad||%s" --date=short`;
          
          exec(cmd, (err, stdout) => {
            if (err) {
              console.error(`Error getting logs for ${repoPath}:`, err);
              resolve([]);
              return;
            }
            const logs = stdout.split("\n").filter(line => line.trim()).map(line => {
              const [hash, author, date, message] = line.split("||");
              return { hash, author, date, message, project: path.basename(repoPath) };
            });
            resolve(logs);
          });
        });
      });

      const results = await Promise.all(promises);
      results.forEach(logs => allLogs.push(...logs));
      
      // 按日期排序（最新的在前）
      allLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      return allLogs;
    } catch (error) {
      throw error;
    }
  });

  // 项目收藏管理
  const favoritesPath = path.join(app.getPath('userData'), 'favorites.json');

  // 获取收藏的项目
  ipcMain.handle("favorites:get", async () => {
    try {
      const data = await fs.readFile(favoritesPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('📁 收藏项目文件不存在，自动创建文件');
        // 确保目录存在
        await ensureDirExists(favoritesPath);
        // 创建空数组文件
        await fs.writeFile(favoritesPath, JSON.stringify([], null, 2));
        return [];
      }
      console.error('❌ 读取收藏项目失败:', error);
      return [];
    }
  });

  // 保存收藏项目
  ipcMain.handle("favorites:save", async (event, favorites) => {
    try {
      console.log('🔄 主进程：开始保存收藏项目到:', favoritesPath);
      console.log('🔄 主进程：收藏项目数据类型:', typeof favorites);
      console.log('🔄 主进程：收藏项目是否为数组:', Array.isArray(favorites));
      
      // 数据验证
      if (favorites === undefined || favorites === null) {
        console.error('❌ 主进程：收藏项目数据为空');
        throw new Error('收藏项目数据不能为空');
      }
      
      if (!Array.isArray(favorites)) {
        console.error('❌ 主进程：收藏项目数据不是数组格式');
        throw new Error('收藏项目数据必须是数组格式');
      }
      
      console.log('🔄 主进程：收藏项目数据:', JSON.stringify(favorites, null, 2));
      
      // 验证数组中的每个项目都是可序列化的
      favorites.forEach((item, index) => {
        try {
          JSON.stringify(item);
        } catch (serializeError) {
          console.error(`❌ 主进程：收藏项目 ${index} 不可序列化:`, serializeError);
          throw new Error(`收藏项目 ${index} 包含不可序列化的数据`);
        }
      });
      
      // 确保目录存在
      await ensureDirExists(favoritesPath);
      
      await fs.writeFile(favoritesPath, JSON.stringify(favorites, null, 2));
      
      console.log('✅ 主进程：收藏项目保存成功');
      return true;
    } catch (error) {
      console.error('❌ 主进程：保存收藏项目失败:', error);
      throw error;
    }
  });

  // 日历标记管理
  const calendarMarksPath = path.join(app.getPath('userData'), 'calendar-marks.json');

  // 获取日历标记
  ipcMain.handle("calendar:getMarks", async () => {
    try {
      const data = await fs.readFile(calendarMarksPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('📁 日历标记文件不存在，自动创建文件');
        // 确保目录存在
        await ensureDirExists(calendarMarksPath);
        // 创建空对象文件
        await fs.writeFile(calendarMarksPath, JSON.stringify({}, null, 2));
        return {};
      }
      console.error('❌ 读取日历标记失败:', error);
      return {};
    }
  });

  // 保存日历标记
  ipcMain.handle("calendar:saveMarks", async (event, marks) => {
    try {
      console.log('🔄 主进程：开始保存日历标记到:', calendarMarksPath);
      console.log('🔄 主进程：日历标记数据类型:', typeof marks);
      console.log('🔄 主进程：日历标记是否为对象:', typeof marks === 'object' && !Array.isArray(marks));
      
      // 数据验证
      if (marks === undefined || marks === null) {
        console.error('❌ 主进程：日历标记数据为空');
        throw new Error('日历标记数据不能为空');
      }
      
      if (typeof marks !== 'object' || Array.isArray(marks)) {
        console.error('❌ 主进程：日历标记数据不是对象格式');
        throw new Error('日历标记数据必须是对象格式');
      }
      
      console.log('🔄 主进程：日历标记数据:', JSON.stringify(marks, null, 2));
      
      // 验证对象中的每个属性都是可序列化的
      Object.entries(marks).forEach(([key, value], index) => {
        try {
          JSON.stringify({ [key]: value });
        } catch (serializeError) {
          console.error(`❌ 主进程：日历标记 ${key} 不可序列化:`, serializeError);
          throw new Error(`日历标记 ${key} 包含不可序列化的数据`);
        }
      });
      
      // 确保目录存在
      await ensureDirExists(calendarMarksPath);
      
      await fs.writeFile(calendarMarksPath, JSON.stringify(marks, null, 2));
      
      console.log('✅ 主进程：日历标记保存成功');
      return true;
    } catch (error) {
      console.error('❌ 主进程：保存日历标记失败:', error);
      throw error;
    }
  });
  