import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

// 初始化dayjs插件
dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * 解析数据库中的UTC时间字符串为本地时间
 * 数据库存储的是UTC时间，格式为 "2025-12-26 02:22:49"
 */
export function parseDbTime(timeString: string | null): dayjs.Dayjs | null {
  if (!timeString) return null;
  // 使用dayjs.utc解析UTC时间，然后转换为本地时间
  return dayjs.utc(timeString, "YYYY-MM-DD HH:mm:ss").local();
}

/**
 * 格式化数据库时间为本地时区显示
 */
export function formatLocalTime(timeString: string | null): string {
  const date = parseDbTime(timeString);
  if (!date) return "未知时间";
  return date.format("YYYY-MM-DD HH:mm:ss");
}

/**
 * 格式化数据库时间为本地时区显示（中文格式）
 */
export function formatLocalTimeZh(timeString: string | null): string {
  const date = parseDbTime(timeString);
  if (!date) return "未知时间";
  return date.format("YYYY年MM月DD日 HH:mm:ss");
}

/**
 * 获取当前本地时间
 */
export function getCurrentLocalTime(): dayjs.Dayjs {
  return dayjs();
}

/**
 * 获取当前UTC时间
 */
export function getCurrentUTCTime(): dayjs.Dayjs {
  return dayjs.utc();
}

/**
 * 将本地时间转换为数据库存储的UTC时间字符串
 */
export function toDbTimeString(date: dayjs.Dayjs | Date | string): string {
  const d = dayjs(date);
  return d.utc().format("YYYY-MM-DD HH:mm:ss");
}

/**
 * 计算两个数据库时间字符串的时间差（秒）
 */
export function calculateDuration(
  startTime: string | null,
  endTime: string | null
): number {
  const start = parseDbTime(startTime);
  const end = parseDbTime(endTime);

  if (!start || !end) return 0;

  return end.diff(start, "second");
}

/**
 * 格式化时间差为可读格式 (HH:mm:ss)
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}
