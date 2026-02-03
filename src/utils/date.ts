/**
 * 日期格式化工具函数
 * 
 * 统一管理项目中所有日期格式化逻辑，确保格式一致性
 */

/**
 * 格式化日期为 YYYY-MM-DD 格式
 * @param date 日期对象、时间戳或日期字符串
 * @returns 格式化后的日期字符串，如 "2024-01-15"
 */
export function formatDate(date: Date | number | string): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date) 
    : date;
  
  if (isNaN(dateObj.getTime())) {
    throw new Error(`Invalid date: ${date}`);
  }
  
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * 格式化日期为 YYYY-MM 格式
 * @param date 日期对象、时间戳或日期字符串
 * @returns 格式化后的月份字符串，如 "2024-01"
 */
export function formatMonth(date: Date | number | string): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date) 
    : date;
  
  if (isNaN(dateObj.getTime())) {
    throw new Error(`Invalid date: ${date}`);
  }
  
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  
  return `${year}-${month}`;
}

/**
 * 格式化日期为完整日期时间格式 YYYY-MM-DD HH:mm:ss
 * @param date 日期对象、时间戳或日期字符串
 * @returns 格式化后的日期时间字符串，如 "2024-01-15 14:30:00"
 */
export function formatDateTime(date: Date | number | string): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date) 
    : date;
  
  if (isNaN(dateObj.getTime())) {
    throw new Error(`Invalid date: ${date}`);
  }
  
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const seconds = String(dateObj.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 格式化日期为中文月份名称
 * @param date 日期对象、时间戳或日期字符串，或月份字符串（如 "2024-01"）
 * @returns 中文月份名称，如 "一月"
 */
export function formatMonthName(date: Date | number | string): string {
  let monthIndex: number;
  
  if (typeof date === 'string' && date.includes('-')) {
    // 处理 "2024-01" 格式
    const [, month] = date.split('-');
    monthIndex = parseInt(month) - 1;
  } else {
    const dateObj = typeof date === 'string' || typeof date === 'number' 
      ? new Date(date) 
      : date;
    
    if (isNaN(dateObj.getTime())) {
      throw new Error(`Invalid date: ${date}`);
    }
    
    monthIndex = dateObj.getMonth();
  }
  
  const monthNames = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'
  ];
  
  return monthNames[monthIndex];
}

/**
 * 从日期数字生成日期键（用于日历标记等场景）
 * @param year 年份
 * @param month 月份（1-12）
 * @param day 日期（1-31）
 * @returns 格式化后的日期键，如 "2024-01-15"
 */
export function formatDateKey(year: number, month: number, day: number): string {
  const yearStr = String(year);
  const monthStr = String(month).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  
  return `${yearStr}-${monthStr}-${dayStr}`;
}
