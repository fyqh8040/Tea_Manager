import { UserProfile, AppConfig } from '../types/tea';

const TOKEN_KEY = 'tea_auth_token';
const USER_KEY = 'tea_user';

export const getAuthToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeAuthToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

export const getStoredUser = (): UserProfile | null => {
  const data = localStorage.getItem(USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
};

export const setStoredUser = (user: UserProfile): void => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const removeStoredUser = (): void => {
  localStorage.removeItem(USER_KEY);
};

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(url, {
    ...options,
    headers
  });
}

/**
 * 上传图片服务：支持图床代理转发与降级
 */
export async function uploadImageFile(
  file: File,
  config?: AppConfig | null
): Promise<{ url: string; isBase64: boolean }> {
  if (config?.imageApiUrl) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'tea_image');
    formData.append('path', 'tea_image');
    formData.append('uploadPath', 'tea_image');

    const res = await fetch('/api/upload?uploadFolder=tea_image', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || `上传失败: ${res.status}`);
    }

    const data = await res.json();
    let remoteUrl = '';

    if (Array.isArray(data) && data[0]?.src) {
      const src = data[0].src;
      if (src.startsWith('http')) {
        remoteUrl = src;
      } else {
        const baseUrl = config.imageApiUrl.replace(/\/upload\/?$/, '').replace(/\/$/, '');
        remoteUrl = `${baseUrl}/${src.replace(/^\//, '')}`;
      }
    } else if (data.url) {
      remoteUrl = data.url;
    } else if (data.data?.url) {
      remoteUrl = data.data.url;
    }

    if (remoteUrl) {
      return { url: remoteUrl, isBase64: false };
    }
    throw new Error('无法解析图床返回的图片地址');
  }

  throw new Error('未配置图床服务');
}
