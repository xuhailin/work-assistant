<template>
  <div class="container mx-auto px-6 py-8">
    <div class="text-center mb-8">
      <h1 class="text-4xl font-bold text-gray-800 mb-4">🚀 我的效率工具</h1>
      <p class="text-gray-600">提升工作效率的智能助手</p>
      <p class="text-sm text-gray-500 mt-2">📅 {{ todayDate }}</p>
    </div>

    <!-- Git 提交记录小面板 -->
    <div class="bg-white rounded-lg shadow-lg p-6 mb-8 hover:shadow-xl transition-shadow duration-300 cursor-pointer" 
         @click="goToGitLogs">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <div class="bg-blue-100 p-3 rounded-full">
            <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
          </div>
          <div>
            <h3 class="text-xl font-semibold text-gray-800">Git 提交记录</h3>
            <p class="text-gray-600">查看和管理项目的Git提交历史</p>
          </div>
        </div>
        <div class="text-gray-400">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
          </svg>
        </div>
      </div>
    </div>

    <!-- 跑步统计面板 -->
    <div class="bg-white rounded-lg shadow-lg p-6 mb-8 hover:shadow-xl transition-shadow duration-300 cursor-pointer" 
         @click="goToRunningStats">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <div class="bg-red-100 p-3 rounded-full">
            <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
          </div>
          <div>
            <h3 class="text-xl font-semibold text-gray-800">🏃 跑步统计</h3>
            <p class="text-gray-600">查看和分析你的跑步数据</p>
          </div>
        </div>
        <div class="text-gray-400">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
          </svg>
        </div>
      </div>
    </div>

    <!-- 其他工具面板可以在这里添加 -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <!-- 占位符面板 -->
      <div class="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 cursor-pointer opacity-50">
        <div class="flex items-center space-x-4">
          <div class="bg-green-100 p-3 rounded-full">
            <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div>
            <h3 class="text-xl font-semibold text-gray-800">时间管理</h3>
            <p class="text-gray-600">待开发功能</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 cursor-pointer opacity-50">
        <div class="flex items-center space-x-4">
          <div class="bg-purple-100 p-3 rounded-full">
            <svg class="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
          </div>
          <div>
            <h3 class="text-xl font-semibold text-gray-800">数据分析</h3>
            <p class="text-gray-600">待开发功能</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 cursor-pointer opacity-50">
        <div class="flex items-center space-x-4">
          <div class="bg-orange-100 p-3 rounded-full">
            <svg class="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
          </div>
          <div>
            <h3 class="text-xl font-semibold text-gray-800">系统设置</h3>
            <p class="text-gray-600">待开发功能</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { computed } from 'vue'

const router = useRouter()

// 获取今日日期（手动格式化，不使用工具函数）
const todayDate = computed(() => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
})

function goToGitLogs() {
  router.push('/gitlogs')
}

function goToRunningStats() {
  router.push('/running')
}
</script>
