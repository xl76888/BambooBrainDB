/**
 * 获取指定知识库的认证状态
 * @param kb_id 知识库ID
 * @returns 是否已认证
 */
export function getAuthStatus(kb_id: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const cookies = document.cookie.split(';');
  const authCookie = cookies.find(cookie =>
    cookie.trim().startsWith(`auth_${kb_id}=`)
  );

  return authCookie ? authCookie.split('=')[1] : null;
}

/**
 * 设置认证状态
 * @param kb_id 知识库ID
 * @param token 认证口令
 * @param days 过期天数，默认7天
 */
export function setAuthStatus(kb_id: string, token: string, days: number = 7): void {
  if (typeof window === 'undefined') {
    return;
  }

  const expires = new Date();
  expires.setDate(expires.getDate() + days);

  document.cookie = `auth_${kb_id}=${token}; expires=${expires.toUTCString()}; path=/`;
}

/**
 * 清除认证状态
 * @param kb_id 知识库ID
 */
export function clearAuthStatus(kb_id: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  document.cookie = `auth_${kb_id}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

/**
 * 从localStorage获取数据（SSR安全）
 * @param key 存储键
 * @param defaultValue 默认值
 * @returns 存储的值或默认值
 */
export function getLocalStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') {
    return defaultValue;
  }

  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('localStorage read error:', error);
    return defaultValue;
  }
}

/**
 * 向localStorage设置数据（SSR安全）
 * @param key 存储键
 * @param value 存储值
 */
export function setLocalStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('localStorage write error:', error);
  }
} 