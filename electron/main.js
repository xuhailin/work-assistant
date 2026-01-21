const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { exec } = require("child_process");
const fs = require("fs").promises;
const { mkdir } = require("fs").promises;

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || "";
const DASHSCOPE_ENDPOINT =
  "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";

function createWindow() {
  const preloadPath = path.join(__dirname, "preload.js");
  console.log("🔧 Preload script path:", preloadPath);
  console.log("🔧 Preload script exists:", require("fs").existsSync(preloadPath));
  
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  
  // 打开 DevTools 以便调试
  win.webContents.openDevTools();

  // 添加页面加载事件监听
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('❌ 页面加载失败:', {
      errorCode,
      errorDescription,
      validatedURL
    });
  });

  win.webContents.on('did-finish-load', () => {
    console.log('✅ 页面加载完成');
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    console.log('🔧 加载开发服务器 URL:', process.env.VITE_DEV_SERVER_URL);
    win.loadURL(process.env.VITE_DEV_SERVER_URL).catch((err) => {
      console.error('❌ 加载 URL 失败:', err);
    });
  } else {
    console.log('🔧 加载生产构建文件');
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

async function readJsonFileIfExists(filePath) {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function normalizeDateString(value) {
  if (!value) return "";
  const raw = String(value).trim();
  const normalized = raw
    .replace(/[年月日\.]/g, "-")
    .replace(/\//g, "-")
    .replace(/--+/g, "-")
    .replace(/-$/, "");
  const match = normalized.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!match) return raw;
  const [, year, month, day] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function normalizeNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const cleaned = String(value).replace(/[^\d.\-]/g, "");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function normalizeRunningRecord(record) {
  return {
    date: normalizeDateString(record?.date || record?.日期 || record?.time || record?.时间),
    distance: normalizeNumber(record?.distance || record?.距离),
    cadence: normalizeNumber(record?.cadence || record?.步频),
    heartRate: normalizeNumber(record?.heartRate || record?.心率),
    pace: normalizeNumber(record?.pace || record?.配速),
  };
}

function filterValidRunningRecords(records) {
  if (!Array.isArray(records)) return [];
  return records
    .map(normalizeRunningRecord)
    .filter((record) => record.date && record.distance !== null);
}

async function getSeedRunningData() {
  const candidates = [
    path.join(app.getAppPath(), "src/data/running-data.json"),
    path.join(app.getAppPath(), "dist/data/running-data.json"),
  ];

  for (const candidate of candidates) {
    const data = await readJsonFileIfExists(candidate);
    if (data) return data;
  }

  return [];
}

async function readRunningData() {
  const runningDataPath = path.join(app.getPath("userData"), "running-data.json");
  const stored = await readJsonFileIfExists(runningDataPath);
  if (stored) return stored;

  const seed = await getSeedRunningData();
  await ensureDirExists(runningDataPath);
  await fs.writeFile(runningDataPath, JSON.stringify(seed, null, 2));
  return seed;
}

async function writeRunningData(records) {
  const runningDataPath = path.join(app.getPath("userData"), "running-data.json");
  await ensureDirExists(runningDataPath);

  // 1. 先读取当前文件内容作为备份源
  const existing = await readJsonFileIfExists(runningDataPath);
  
  // 2. 创建带时间戳的备份文件
  const timestamp = new Date()
    .toISOString()
    .replace(/[:T]/g, "-")
    .replace(/\..+/, "");
  const backupName = `running-data-backup-${timestamp}.json`;
  const backupPath = path.join(app.getPath("userData"), backupName);

  // 3. 如果有现有数据，先备份；如果没有，使用新数据作为备份（首次保存）
  const backupSource = existing || records;
  await fs.writeFile(backupPath, JSON.stringify(backupSource, null, 2));
  console.log('✅ 备份已创建:', backupPath);

  // 4. 然后保存新数据
  await fs.writeFile(runningDataPath, JSON.stringify(records, null, 2));
  console.log('✅ 数据已保存:', runningDataPath);
  
  return { backupPath };
}

function extractTextFromDashScopeResponse(responseJson) {
  const content = responseJson?.output?.choices?.[0]?.message?.content;
  if (Array.isArray(content)) {
    const textPart = content.find((item) => item?.text);
    if (textPart?.text) return textPart.text;
  }
  if (typeof responseJson?.output?.text === "string") {
    return responseJson.output.text;
  }
  return "";
}

function parseRunningRecordsFromText(text) {
  if (!text) return [];
  const match = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
  const jsonString = match ? match[0] : text;
  const parsed = JSON.parse(jsonString);
  const records = Array.isArray(parsed)
    ? parsed
    : parsed?.records || parsed?.data || parsed?.items || [];
  return filterValidRunningRecords(records);
}

async function analyzeRunningImageWithDashScope(imageBase64) {
  if (!DASHSCOPE_API_KEY) {
    throw new Error("未配置阿里云 DashScope API Key，请设置 DASHSCOPE_API_KEY。");
  }
  if (!global.fetch) {
    throw new Error("当前环境不支持 fetch，请升级 Electron/Node 版本。");
  }

  const prompt = `
你是跑步记录识别助手。请从图片中提取跑步数据，输出 JSON 数组。
字段：date(YYYY-MM-DD), distance(公里数, 小数), cadence(步频, 整数), heartRate(心率, 整数), pace(配速, 分钟/公里, 小数)。
如果某字段缺失，可填 null。只输出 JSON，不要附加解释文本。
示例:
[
  {"date":"2024-01-05","distance":10.0,"cadence":161,"heartRate":134,"pace":5.9}
]
`.trim();

  const requestBody = {
    model: "qwen-vl-plus",
    input: {
      messages: [
        {
          role: "user",
          content: [
            { image: imageBase64 },
            { text: prompt },
          ],
        },
      ],
    },
    parameters: { result_format: "message" },
  };

  const response = await fetch(DASHSCOPE_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const responseJson = await response.json();
  if (!response.ok) {
    const message = responseJson?.message || responseJson?.code || "AI 请求失败";
    throw new Error(message);
  }

  const text = extractTextFromDashScopeResponse(responseJson);
  const records = parseRunningRecordsFromText(text);
  return { records, rawText: text };
}

app.whenReady().then(() => {
  console.log('🚀 Electron 应用已准备就绪');
  console.log('🔧 VITE_DEV_SERVER_URL:', process.env.VITE_DEV_SERVER_URL);
  createWindow();
});

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

  // 获取跑步数据
  ipcMain.handle("running:getData", async () => {
    return readRunningData();
  });

  // 保存跑步数据并生成备份
  ipcMain.handle("running:saveData", async (event, records) => {
    if (!Array.isArray(records)) {
      throw new Error("跑步数据必须是数组格式");
    }
    const normalized = filterValidRunningRecords(records);
    if (normalized.length === 0) {
      throw new Error("跑步数据为空或格式不正确");
    }
    return writeRunningData(normalized);
  });

  // AI 图片分析
  ipcMain.handle("running:analyzeImage", async (event, payload) => {
    const imageBase64 = payload?.imageBase64;
    if (!imageBase64) {
      throw new Error("图片内容为空");
    }
    return analyzeRunningImageWithDashScope(imageBase64);
  });
  