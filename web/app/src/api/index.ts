import { KBDetail, NodeDetail, NodeListItem } from '@/assets/type';

interface ApiResponse<T = any> {
  data: T;
  message?: string;
  code?: number;
}

interface ApiClientConfig {
  kb_id?: string;
  headers?: Record<string, string>;
  cache?: RequestCache;
}

// 内容分析相关接口类型
interface ContentAnalysisRequest {
  content: string;
}

interface OutlineItem {
  level: number;
  title: string;
  anchor: string;
}

interface ContentAnalysisResponse {
  summary: string;
  key_points: string[];
  tags: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  outline: OutlineItem[];
  processed_by?: string; // AI 或 Local
  word_count?: number;
  reading_time?: number;
}

interface ContentEnhanceRequest {
  content: string;
  style?: 'professional' | 'casual' | 'technical';
}

interface ContentEnhanceResponse {
  enhanced_content: string;
}

class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || '';
  }

  // 创建SSE客户端（用于聊天）
  createSSEClient(kb_id: string) {
    return {
      url: `${this.baseURL}/share/v1/chat/message`,
      headers: {
        'Content-Type': 'application/json',
        'x-kb-id': kb_id,
      },
    };
  }

  // 客户端通用请求方法
  async clientRequest<T>(
    url: string,
    options: RequestInit = {},
    config: ApiClientConfig = {}
  ): Promise<{ data?: T; status: number; error?: string }> {
    const { kb_id = '', headers = {}, cache } = config;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(kb_id && { 'x-kb-id': kb_id }),
      ...headers,
    };

    const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;
    
    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers: requestHeaders,
        ...(cache && { cache }),
      });

      if (!response.ok) {
        return { status: response.status, error: `HTTP error! status: ${response.status}` };
      }

      const result = await response.json();
      return { data: result.data || result, status: response.status };
    } catch (error) {
      return { status: 500, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // 服务端专用方法 - 带cookie的请求
  async serverRequest<T>(
    url: string,
    options: RequestInit = {},
    config: ApiClientConfig & { authToken?: string } = {}
  ): Promise<{ data?: T; status: number; error?: string }> {
    const { kb_id = '', headers = {}, cache, authToken } = config;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-kb-id': kb_id,
      'X-Simple-Auth-Password': authToken || '',
      ...headers,
    };
    const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;
    
    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers: requestHeaders,
        ...(cache && { cache }),
      });
      if (!response.ok) {
        return { status: response.status, error: `HTTP error! status: ${response.status}` };
      }
      const result = await response.json();
      return { data: result.data, status: response.status };
    } catch (error) {
      return { status: 500, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // 服务端获取知识库信息
  async serverGetKBInfo(kb_id: string, authToken?: string): Promise<{ data?: KBDetail; status: number; error?: string }> {
    return this.serverRequest(`/share/v1/app/web/info`, {
      method: 'GET',
    }, {
      kb_id,
      authToken,
      cache: 'no-store',
    });
  }

  // 服务端获取节点列表
  async serverGetNodeList(
    kb_id: string,
    authToken?: string,
    origin: string = ''
  ): Promise<{ data?: NodeListItem[]; status: number; error?: string }> {
    const baseURL = (typeof window !== 'undefined' && origin) ? origin : (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || '');
    return this.serverRequest(baseURL + `/share/v1/node/list`, {
      method: 'GET',
    }, {
      kb_id,
      authToken,
    });
  }

  // 服务端获取节点详情
  async serverGetNodeDetail(id: string, kb_id: string, authToken?: string, origin: string = ''): Promise<{ data?: NodeDetail; status: number; error?: string }> {
    // 浏览器环境优先使用同源 origin，避免跨域；服务端仍用 BACKEND_URL
    const baseURL = (typeof window !== 'undefined' && origin) ? origin : (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || '');
    return this.serverRequest(baseURL + `/share/v1/node/detail?id=${id}`, {
      method: 'GET',
    }, {
      kb_id,
      authToken,
    });
  }

  // 内容分析API
  async analyzeContent(request: ContentAnalysisRequest, kb_id?: string): Promise<{ data?: ContentAnalysisResponse; status: number; error?: string }> {
    return this.clientRequest<ContentAnalysisResponse>('/api/v1/content/analyze', {
      method: 'POST',
      body: JSON.stringify(request),
    }, {
      kb_id,
    });
  }

  // 内容增强API
  async enhanceContent(request: ContentEnhanceRequest, kb_id?: string): Promise<{ data?: ContentEnhanceResponse; status: number; error?: string }> {
    return this.clientRequest<ContentEnhanceResponse>('/api/v1/content/enhance', {
      method: 'POST',
      body: JSON.stringify(request),
    }, {
      kb_id,
    });
  }
}

export const apiClient = new ApiClient();

// 导出类型以供其他模块使用
export type { 
  ContentAnalysisRequest,
  ContentAnalysisResponse,
  ContentEnhanceRequest,
  ContentEnhanceResponse,
  OutlineItem
};

export async function login(params: { password: string; kb_id: string }) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-kb-id': params.kb_id,
    },
    body: JSON.stringify({ password: params.password }),
  });

  if (!response.ok) {
    throw new Error('登录失败');
  }

  return response.json();
}
