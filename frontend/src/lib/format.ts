/** 全站统一使用温哥华时间 */
export const VANCOUVER_TZ = 'America/Vancouver';

/**
 * 解析接口返回的 slot_time，避免无时区字符串被当作本地时间导致显示 00:00。
 * 若无 Z 或 ± 时区，按 UTC 解析。
 */
export function parseSlotTime(slotTime: string | null | undefined): Date | null {
  if (slotTime == null || slotTime === '') return null;
  const s = String(slotTime).trim();
  if (!s) return null;
  const hasTz = /[Zz]$|[-+]\d{2}:?\d{2}$/.test(s);
  const iso = hasTz ? s : (s.endsWith('Z') ? s : `${s.replace(/\.\d{3}$/, '')}Z`);
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

const vancouverOpts = (opts: Intl.DateTimeFormatOptions) => ({
  ...opts,
  timeZone: VANCOUVER_TZ,
});

/** 按温哥华时间格式化为 "HH:mm" */
export function formatTimeVancouver(d: Date): string {
  return d.toLocaleTimeString('zh-CN', vancouverOpts({ hour: '2-digit', minute: '2-digit' }));
}

/** 按温哥华时间格式化为 "M月d日" */
export function formatDateShortVancouver(d: Date): string {
  const p = new Intl.DateTimeFormat('zh-CN', vancouverOpts({ month: 'numeric', day: 'numeric' })).formatToParts(d);
  const month = p.find((x) => x.type === 'month')?.value ?? '';
  const day = p.find((x) => x.type === 'day')?.value ?? '';
  return `${month}月${day}日`;
}

/** 按温哥华时间格式化为 "yyyy年M月d日" */
export function formatDateLongVancouver(d: Date): string {
  return d.toLocaleDateString('zh-CN', vancouverOpts({ year: 'numeric', month: 'long', day: 'numeric' }));
}

/** 按温哥华时间格式化为 "M月d日 HH:mm" */
export function formatDateTimeVancouver(d: Date): string {
  return formatDateShortVancouver(d) + ' ' + formatTimeVancouver(d);
}

/** 按温哥华时间格式化为 "yyyy年M月d日 EEEE"（含星期） */
export function formatDateWithWeekdayVancouver(d: Date): string {
  const dateStr = d.toLocaleDateString('zh-CN', vancouverOpts({ year: 'numeric', month: 'long', day: 'numeric' }));
  const weekday = d.toLocaleDateString('zh-CN', vancouverOpts({ weekday: 'long' }));
  return `${dateStr} ${weekday}`;
}

/** 按温哥华时间格式化为 "M月d日 EEEE" */
export function formatShortDateWithWeekdayVancouver(d: Date): string {
  const dateStr = formatDateShortVancouver(d);
  const weekday = d.toLocaleDateString('zh-CN', vancouverOpts({ weekday: 'long' }));
  return `${dateStr} ${weekday}`;
}

/** 判断给定日期字符串（yyyy-MM-dd）在温哥华是否为今天 */
export function isTodayVancouver(dateStr: string): boolean {
  return dateStr === todayVancouver();
}

/** 获取温哥华当前日期 yyyy-MM-dd */
export function todayVancouver(): string {
  return new Date().toLocaleDateString('en-CA', vancouverOpts({}));
}

/** 获取给定日期所在周（周一为一周开始）的周一日期 yyyy-MM-dd，温哥华时区 */
export function getMondayOfWeekVancouver(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  const dayOfWeek = d.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysBack = (dayOfWeek + 6) % 7; // 周一=0, 周二=1, ..., 周日=6
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - daysBack);
  return monday.toISOString().slice(0, 10);
}
