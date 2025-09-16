<template>
    <div class="p-4">
      <!-- 标题和返回按钮 -->
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold">📂 Git 提交记录</h2>
        <button
          @click="goHome"
          class="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
        >
          ← 返回首页
        </button>
      </div>

      <!-- 日历和收藏项目左右布局 -->
      <div class="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- 收藏项目管理 -->
        <div>
          <div class="flex items-center mb-2">
            <span class="text-sm font-medium text-gray-700 mr-2">收藏项目:</span>
            <button
              v-if="favorites.length > 0"
              @click="toggleAllFavorites"
              class="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded mr-2"
            >
              {{ selectedFavorites.size === favorites.length ? '取消全选' : '全选' }}
            </button>
            <button
              v-if="favorites.length > 0"
              @click="isManageMode = !isManageMode"
              :class="[
                'text-xs px-2 py-1 rounded transition-colors',
                isManageMode ? 'bg-red-200 hover:bg-red-300 text-red-700' : 'bg-blue-200 hover:bg-blue-300 text-blue-700'
              ]"
            >
              {{ isManageMode ? '完成管理' : '管理' }}
            </button>
          </div>
          <div v-if="favorites.length > 0" class="flex flex-wrap gap-2">
            <button
              v-for="favorite in favorites"
              :key="favorite.id"
              @click="isManageMode ? confirmRemoveFavorite(favorite) : toggleFavorite(favorite.id)"
              :class="[
                'px-3 py-1 text-sm rounded-full border transition-colors relative',
                isManageMode
                  ? 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200'
                  : selectedFavorites.has(favorite.id)
                    ? 'bg-green-500 text-white border-green-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-green-300'
              ]"
            >
              {{ favorite.alias }}
              <span v-if="isManageMode" class="ml-1">×</span>
            </button>
          </div>
          <div v-else class="text-sm text-gray-500 italic">
            暂无收藏项目，选择项目后点击 ⭐ 进行收藏
          </div>
        </div>

        <!-- 本月日历 -->
        <div class="p-2 bg-gray-50 rounded-lg">
          <h3 class="text-xs font-semibold mb-1">📅 {{ currentMonth }}</h3>
          <div class="grid grid-cols-7 gap-0.5 text-center text-xs">
            <!-- 星期标题 -->
            <div v-for="day in weekDays" :key="day" class="py-0.5 font-medium text-gray-600">
              {{ day }}
            </div>
            <!-- 空白占位 -->
            <div v-for="blank in monthStartDay" :key="`blank-${blank}`" class="py-0.5"></div>
            <!-- 日期 -->
            <button
              v-for="date in monthDays"
              :key="date"
              @click="toggleDateMark(date)"
              :class="[
                'py-0.5 w-5 h-5 text-xs rounded hover:bg-blue-100 transition-colors',
                isDateMarked(date)
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'text-gray-700 hover:bg-blue-50',
                date === today ? 'ring-1 ring-blue-300' : ''
              ]"
            >
              {{ date }}
            </button>
          </div>
        </div>
      </div>

      <!-- 项目路径输入和获取日志 -->
      <div class="flex items-center space-x-2 mb-4">
        <div class="flex-1">
          <input
            type="text"
            v-model="displayPath"
            placeholder="点击选择项目文件夹..."
            readonly
            @click="chooseFolder"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
          />
        </div>
        <button
          v-if="projectPath && !isMultiProject"
          @click="openAddFavoriteModal"
          class="px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg"
          title="收藏项目"
        >
          ⭐
        </button>
        <button
          @click="fetchLogs(true)"
          :disabled="!canFetchLogs"
          class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 whitespace-nowrap"
        >
          获取提交记录
        </button>
      </div>

      <!-- 添加收藏弹窗 -->
      <div v-if="showAddFavoriteModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click="closeAddFavoriteModal">
        <div class="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4" @click.stop>
          <h3 class="text-lg font-semibold mb-4">收藏项目</h3>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">项目别名</label>
            <input
              v-model="favoriteAlias"
              type="text"
              placeholder="输入项目别名..."
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              @keyup.enter="addToFavorites"
              ref="aliasInput"
            />
          </div>
          <div class="flex justify-end space-x-2">
            <button
              @click="closeAddFavoriteModal"
              class="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              取消
            </button>
            <button
              @click="addToFavorites"
              :disabled="!favoriteAlias.trim()"
              class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50"
            >
              确定
            </button>
          </div>
        </div>
      </div>

      <!-- 删除确认弹窗 -->
      <div v-if="showRemoveConfirmModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click="closeRemoveConfirmModal">
        <div class="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4" @click.stop>
          <h3 class="text-lg font-semibold mb-4">确认删除</h3>
          <p class="text-gray-600 mb-6">
            确定要删除收藏项目 "<span class="font-medium text-gray-800">{{ favoriteToRemove?.alias }}</span>" 吗？
          </p>
          <div class="flex justify-end space-x-2">
            <button
              @click="closeRemoveConfirmModal"
              class="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              取消
            </button>
            <button
              @click="confirmRemove"
              class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
            >
              确定删除
            </button>
          </div>
        </div>
      </div>

      <!-- 提交人过滤器 -->
      <div v-if="allAuthors.length > 0" class="mb-4">
        <div class="flex items-center mb-2">
          <span class="text-sm font-medium text-gray-700 mr-2">提交人过滤:</span>
          <button
            @click="toggleAllAuthors"
            class="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded"
          >
            {{ selectedAuthors.size === allAuthors.length ? '取消全选' : '全选' }}
          </button>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="author in allAuthors"
            :key="author"
            @click="toggleAuthor(author)"
            :class="[
              'px-3 py-1 text-sm rounded-full border transition-colors',
              selectedAuthors.has(author)
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
            ]"
          >
            {{ author }}
          </button>
        </div>
      </div>
  
      <!-- 日志展示 -->
      <div v-if="groupedLogs" class="mt-6 text-left">
        <div v-for="(authors, date) in groupedLogs" :key="date" class="mb-6">
          <h3 class="text-lg font-bold text-gray-800">{{ date }}</h3>
          <div v-for="(commits, author) in authors" :key="author" class="ml-4 mt-2">
            <h4 class="font-semibold text-gray-700">{{ author }}</h4>
            <ul class="ml-4 space-y-2">
              <li
                v-for="(log, i) in commits"
                :key="i"
                class="border-b pb-2 flex justify-between items-center"
              >
                <div>
                  <p class="font-medium">{{ log.hash }} - {{ log.message }}</p>
                  <p v-if="log.project && isMultiProject" class="text-xs text-gray-500 mt-1">
                    📁 {{ log.project }}
                  </p>
                </div>
                <button
                  @click="copyCommit(log)"
                  class="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-sm rounded"
                >
                  复制
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
  
      <!-- 加载更多 -->
      <div v-if="hasMore" class="mt-4">
        <button
          @click="fetchLogs(false)"
          class="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg"
        >
          加载更多
        </button>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, computed, onMounted, nextTick } from "vue";
  import { useRouter } from "vue-router";
  
const router = useRouter();

const projectPath = ref<string | null>(null);
const logs = ref<any[]>([]);
const page = ref(1);
const pageSize = 50;
const hasMore = ref(false);
const allAuthors = ref<string[]>([]);
const selectedAuthors = ref<Set<string>>(new Set());

// 收藏项目相关
const favorites = ref<any[]>([]);
const selectedFavorites = ref<Set<string>>(new Set());
const showAddFavoriteModal = ref(false);
const favoriteAlias = ref('');
const showRemoveConfirmModal = ref(false);
const favoriteToRemove = ref<any>(null);
const isManageMode = ref(false);

// 日历相关
const calendarMarks = ref<Record<string, boolean>>({});
const today = new Date().getDate();
const currentDate = new Date();
const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

// 计算属性
const isMultiProject = computed(() => selectedFavorites.value.size > 0);
const canFetchLogs = computed(() => projectPath.value || selectedFavorites.value.size > 0);
const displayPath = computed(() => {
  if (isMultiProject.value && selectedFavorites.value.size > 0) {
    const selectedNames = favorites.value
      .filter(f => selectedFavorites.value.has(f.id))
      .map(f => f.alias);
    return `已选择 ${selectedNames.length} 个收藏项目: ${selectedNames.join(', ')}`;
  }
  return projectPath.value || '';
});

// 日历计算属性
const currentMonth = computed(() => {
  return `${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月`;
});

const monthDays = computed(() => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => i + 1);
});

const monthStartDay = computed(() => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  return new Date(year, month, 1).getDay();
});
  
// 导航功能
function goHome() {
  router.push('/');
}

// 初始化：加载收藏项目
async function loadFavorites() {
  try {
    console.log('🔄 渲染进程：开始加载收藏项目...');
    const loadedFavorites = await window.api.getFavorites();
    
    // 确保返回的是数组
    if (Array.isArray(loadedFavorites)) {
      favorites.value = loadedFavorites;
      console.log('✅ 渲染进程：收藏项目加载成功，数量:', favorites.value.length);
      console.log('✅ 渲染进程：收藏项目详情:', favorites.value);
    } else {
      console.warn('⚠️ 渲染进程：加载的收藏项目不是数组格式，使用空数组');
      favorites.value = [];
    }
  } catch (error) {
    console.error('❌ 渲染进程：加载收藏项目失败:', error);
    console.error('❌ 渲染进程：错误详情:', error.message);
    favorites.value = [];
  }
}

// 日历标记相关函数
async function loadCalendarMarks() {
  try {
    console.log('🔄 渲染进程：开始加载日历标记...');
    const loadedMarks = await window.api.getCalendarMarks();
    
    // 确保返回的是对象
    if (loadedMarks && typeof loadedMarks === 'object' && !Array.isArray(loadedMarks)) {
      calendarMarks.value = loadedMarks;
      console.log('✅ 渲染进程：日历标记加载成功，标记数量:', Object.keys(calendarMarks.value).length);
      console.log('✅ 渲染进程：日历标记详情:', calendarMarks.value);
    } else {
      console.warn('⚠️ 渲染进程：加载的日历标记不是对象格式，使用空对象');
      calendarMarks.value = {};
    }
  } catch (error) {
    console.error('❌ 渲染进程：加载日历标记失败:', error);
    console.error('❌ 渲染进程：错误详情:', error.message);
    calendarMarks.value = {};
  }
}

function getDateKey(date: number): string {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  return `${year}-${month.toString().padStart(2, '0')}-${date.toString().padStart(2, '0')}`;
}

function isDateMarked(date: number): boolean {
  const key = getDateKey(date);
  return calendarMarks.value[key] || false;
}

async function toggleDateMark(date: number) {
  const key = getDateKey(date);
  const isCurrentlyMarked = calendarMarks.value[key] || false;
  
  console.log('🔄 切换日期标记:', { date, key, isCurrentlyMarked });
  console.log('🔄 当前标记状态:', calendarMarks.value);
  
  if (isCurrentlyMarked) {
    delete calendarMarks.value[key];
    console.log('🔄 删除标记后:', calendarMarks.value);
  } else {
    calendarMarks.value[key] = true;
    console.log('🔄 添加标记后:', calendarMarks.value);
  }
  
  try {
    // 将响应式对象转换为纯 JavaScript 对象以避免序列化问题
    const plainCalendarMarks = toPlainObject(calendarMarks.value);
    console.log('🔄 渲染进程：序列化后的日历标记:', plainCalendarMarks);
    
    const result = await window.api.saveCalendarMarks(plainCalendarMarks);
    console.log('✅ 日历标记保存成功，API返回:', result);
  } catch (error) {
    console.error('❌ 保存日历标记失败:', error);
    console.error('❌ 错误详情:', error.message, error.stack);
    // 回滚操作
    if (isCurrentlyMarked) {
      calendarMarks.value[key] = true;
    } else {
      delete calendarMarks.value[key];
    }
    console.log('🔄 已回滚标记状态:', calendarMarks.value);
  }
}

async function chooseFolder() {
  console.log('window.api:', window.api);
  if (!window.api || !window.api.openFolder) {
    console.error('window.api.openFolder is not available');
    alert('API 未正确加载，请检查 Electron 配置');
    return;
  }
  const folder = await window.api.openFolder();
  if (folder) {
    projectPath.value = folder;
    // 清空收藏项目选择
    selectedFavorites.value.clear();
  }
}

// 弹窗管理
function openAddFavoriteModal() {
  showAddFavoriteModal.value = true;
  // 使用 nextTick 确保 DOM 已更新后聚焦输入框
  nextTick(() => {
    const input = document.querySelector('input[ref="aliasInput"]') as HTMLInputElement;
    if (input) input.focus();
  });
}

function closeAddFavoriteModal() {
  showAddFavoriteModal.value = false;
  favoriteAlias.value = '';
}

function closeRemoveConfirmModal() {
  showRemoveConfirmModal.value = false;
  favoriteToRemove.value = null;
}

// 辅助函数：将响应式对象转换为纯 JavaScript 对象
function toPlainObject(obj: any) {
  return JSON.parse(JSON.stringify(obj));
}

// 收藏项目管理
async function addToFavorites() {
  if (!favoriteAlias.value.trim() || !projectPath.value) return;
  
  const newFavorite = {
    id: Date.now().toString(),
    alias: favoriteAlias.value.trim(),
    path: projectPath.value
  };
  
  try {
    console.log('🔄 渲染进程：准备保存收藏项目');
    console.log('🔄 渲染进程：当前 favorites.value:', favorites.value);
    console.log('🔄 渲染进程：新收藏项目:', newFavorite);
    
    favorites.value.push(newFavorite);
    console.log('🔄 渲染进程：添加后的 favorites.value:', favorites.value);
    
    // 将响应式对象转换为纯 JavaScript 对象以避免序列化问题
    const plainFavorites = toPlainObject(favorites.value);
    console.log('🔄 渲染进程：序列化后的数据:', plainFavorites);
    
    await window.api.saveFavorites(plainFavorites);
    console.log('✅ 渲染进程：收藏项目保存成功');
  } catch (error) {
    console.error('❌ 渲染进程：保存收藏项目失败:', error);
    console.error('❌ 渲染进程：错误详情:', error.message);
    
    // 回滚操作：移除刚刚添加的项目
    favorites.value.pop();
    
    // 显示错误提示给用户
    alert(`保存收藏项目失败: ${error.message || '未知错误'}`);
  } finally {
    // 无论成功还是失败都关闭弹窗
    closeAddFavoriteModal();
  }
}

function confirmRemoveFavorite(favorite: any) {
  favoriteToRemove.value = favorite;
  showRemoveConfirmModal.value = true;
}

async function confirmRemove() {
  if (!favoriteToRemove.value) return;
  
  // 保存原始数据用于回滚
  const originalFavorites = [...favorites.value];
  const removedId = favoriteToRemove.value.id;
  
  try {
    console.log('🔄 渲染进程：准备删除收藏项目:', favoriteToRemove.value);
    
    favorites.value = favorites.value.filter(f => f.id !== removedId);
    selectedFavorites.value.delete(removedId);
    
    // 将响应式对象转换为纯 JavaScript 对象以避免序列化问题
    const plainFavorites = toPlainObject(favorites.value);
    console.log('🔄 渲染进程：序列化后的数据:', plainFavorites);
    
    await window.api.saveFavorites(plainFavorites);
    console.log('✅ 渲染进程：收藏项目删除成功');
  } catch (error) {
    console.error('❌ 渲染进程：删除收藏项目失败:', error);
    console.error('❌ 渲染进程：错误详情:', error.message);
    
    // 回滚操作
    favorites.value = originalFavorites;
    selectedFavorites.value.add(removedId);
    
    // 显示错误提示给用户
    alert(`删除收藏项目失败: ${error.message || '未知错误'}`);
  } finally {
    closeRemoveConfirmModal();
  }
}

function toggleFavorite(id: string) {
  if (isManageMode.value) return; // 管理模式下不允许切换选择状态
  
  if (selectedFavorites.value.has(id)) {
    selectedFavorites.value.delete(id);
  } else {
    selectedFavorites.value.add(id);
  }
  // 选择收藏项目时清空单个项目路径
  if (selectedFavorites.value.size > 0) {
    projectPath.value = null;
  }
}

function toggleAllFavorites() {
  if (isManageMode.value) return; // 管理模式下不允许切换选择状态
  
  if (selectedFavorites.value.size === favorites.value.length) {
    selectedFavorites.value.clear();
  } else {
    selectedFavorites.value = new Set(favorites.value.map(f => f.id));
  }
  // 选择收藏项目时清空单个项目路径
  if (selectedFavorites.value.size > 0) {
    projectPath.value = null;
  }
}
  
async function fetchLogs(reset: boolean) {
  if (!canFetchLogs.value) return;
  
  console.log('fetchLogs called:', { reset, isMultiProject: isMultiProject.value, selectedFavorites: selectedFavorites.value.size, projectPath: projectPath.value });
  
  if (reset) {
    page.value = 1;
    logs.value = [];
    allAuthors.value = [];
    selectedAuthors.value.clear();
  }

  let newLogs: any[] = [];

  if (isMultiProject.value) {
    // 多项目模式：获取选中的收藏项目
    const selectedPaths = favorites.value
      .filter(f => selectedFavorites.value.has(f.id))
      .map(f => f.path);
    
    console.log('Multi-project mode:', { selectedPaths, favoritesCount: favorites.value.length });
    
    if (selectedPaths.length > 0) {
      try {
        newLogs = await window.api.getMultipleLogs(selectedPaths, 100);
        console.log('Multi-project logs received:', newLogs.length);
        hasMore.value = false; // 多项目模式不支持分页
      } catch (error) {
        console.error('Error fetching multi-project logs:', error);
      }
    }
  } else if (projectPath.value) {
    // 单项目模式
    console.log('Single project mode:', projectPath.value);
    try {
      newLogs = await window.api.getGitLogs(projectPath.value, page.value, pageSize);
      console.log('Single project logs received:', newLogs.length);
      hasMore.value = newLogs.length === pageSize;
      page.value++;
    } catch (error) {
      console.error('Error fetching single project logs:', error);
    }
  }

  if (reset) {
    logs.value = newLogs;
  } else {
    logs.value = [...logs.value, ...newLogs];
  }
  
  // 收集所有作者信息
  if (reset) {
    const authorsSet = new Set<string>();
    logs.value.forEach(log => authorsSet.add(log.author));
    allAuthors.value = Array.from(authorsSet).sort();
    // 默认全选所有作者
    selectedAuthors.value = new Set(allAuthors.value);
  } else {
    // 检查当前是否为全选状态
    const wasFullySelected = selectedAuthors.value.size === allAuthors.value.length;
    
    // 增量添加新作者
    const newAuthors = new Set(allAuthors.value);
    newLogs.forEach(log => newAuthors.add(log.author));
    allAuthors.value = Array.from(newAuthors).sort();
    
    // 只有在之前是全选状态时，才自动选中新作者
    if (wasFullySelected) {
      newLogs.forEach(log => selectedAuthors.value.add(log.author));
    }
    // 如果之前不是全选状态，保持用户的选择不变
  }
}
  
// 作者过滤相关函数
function toggleAuthor(author: string) {
  if (selectedAuthors.value.has(author)) {
    selectedAuthors.value.delete(author);
  } else {
    selectedAuthors.value.add(author);
  }
}

function toggleAllAuthors() {
  if (selectedAuthors.value.size === allAuthors.value.length) {
    // 当前全选，执行取消全选
    selectedAuthors.value.clear();
  } else {
    // 执行全选
    selectedAuthors.value = new Set(allAuthors.value);
  }
}

// 按日期 + 作者分组（只显示选中的作者）
const groupedLogs = computed(() => {
  const grouped: Record<string, Record<string, any[]>> = {};
  logs.value.forEach((log) => {
    // 只显示选中的作者
    if (!selectedAuthors.value.has(log.author)) return;
    
    if (!grouped[log.date]) grouped[log.date] = {};
    if (!grouped[log.date][log.author]) grouped[log.date][log.author] = [];
    grouped[log.date][log.author].push(log);
  });
  return grouped;
});
  
// 复制到剪贴板
async function copyCommit(log: any) {
  try {
    const projectInfo = log.project ? ` - ${log.project}` : '';
    const text = `${log.hash} - ${log.author} - ${log.date}${projectInfo}\n${log.message}`;
    
    // 使用浏览器原生 clipboard API 作为备选方案
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      console.log('✅ 复制成功（使用浏览器 clipboard）');
    } else {
      // 回退到 Electron API
      window.api.copyText(text);
      console.log('✅ 复制成功（使用 Electron API）');
    }
    
    // 简单的视觉反馈
    const event = new Event('copy-success');
    document.dispatchEvent(event);
  } catch (error) {
    console.error('❌ 复制失败:', error);
    // 回退方案
    try {
      window.api.copyText(`${log.hash} - ${log.author} - ${log.date}\n${log.message}`);
      console.log('✅ 复制成功（回退方案）');
    } catch (fallbackError) {
      console.error('❌ 所有复制方案都失败:', fallbackError);
    }
  }
}

// 组件初始化
onMounted(() => {
  loadFavorites();
  loadCalendarMarks();
});
  </script>
  