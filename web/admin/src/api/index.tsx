import request from "./request"
import {
  AppDetail,
  CheckModelData,
  ConversationDetail,
  ConversationListItem,
  CreateModelData,
  CreateNodeData,
  CreateNodeSummaryData,
  GetConversationListData,
  GetModelNameData,
  GetNodeRecommendData,
  KnowledgeBaseListItem,
  ModelListItem,
  NodeDetail,
  NodeListFilterData,
  NodeListItem,
  Paging,
  RecommendNode,
  ReleaseListItem,
  ResposeList,
  ScrapeRSSItem,
  UpdateAppDetailData,
  UpdateKnowledgeBaseData,
  UpdateModelData,
  UpdateNodeActionData,
  UpdateNodeData,
  UpdateUserInfo,
  UserForm,
  UserInfo
} from "./type"

export type * from "./type"

// =============================================》user

export const login = (data: UserForm): Promise<{ token: string }> =>
  request.post('api/v1/user/login', data)

export const getUserList = (): Promise<UserInfo[]> =>
  request.get('api/v1/user/list')

export const getUser = (): Promise<UserInfo> =>
  request.get('api/v1/user')

export const createUser = (data: UserForm): Promise<void> =>
  request.post('api/v1/user/create', data)

export const updateUser = (data: UpdateUserInfo): Promise<void> =>
  request.put('api/v1/user/reset_password', data)

export const deleteUser = (body: { user_id: string }): Promise<void> =>
  request.delete('api/v1/user/delete', { data: body })

// =============================================》knowledge base

export const getKnowledgeBaseList = (): Promise<KnowledgeBaseListItem[]> =>
  request.get('api/v1/knowledge_base/list')

export const getKnowledgeBaseDetail = (params: { id: string }): Promise<KnowledgeBaseListItem> =>
  request.get('api/v1/knowledge_base/detail', { params })

export const updateKnowledgeBase = (data: Partial<UpdateKnowledgeBaseData>): Promise<void> =>
  request.put('api/v1/knowledge_base/detail', data)

export const createKnowledgeBase = (data: Partial<UpdateKnowledgeBaseData>): Promise<{ id: string }> =>
  request.post('api/v1/knowledge_base', data)

export const deleteKnowledgeBase = (params: { id: string }): Promise<void> =>
  request.delete('api/v1/knowledge_base/detail', { params })

export const getReleaseList = (params: { kb_id: string } & Paging): Promise<ResposeList<ReleaseListItem>> =>
  request.get('api/v1/knowledge_base/release/list', { params })

export const addRelease = (data: { kb_id: string, tag: string, message: string, node_ids: string[] }): Promise<void> =>
  request.post('api/v1/knowledge_base/release', data)

// =============================================》node

export const getNodeList = (params: NodeListFilterData): Promise<NodeListItem[]> =>
  request.get('api/v1/node/list', { params })

export const getNodeDetail = (params: { id: string }): Promise<NodeDetail> =>
  request.get('api/v1/node/detail', { params })

export const moveNode = (data: { id: string, parent_id: string | null, next_id: string | null, prev_id: string | null }): Promise<void> =>
  request.post('api/v1/node/move', data)

export const updateNodeAction = (data: UpdateNodeActionData): Promise<void> =>
  request.post('api/v1/node/action', data)

export const updateNode = (data: UpdateNodeData): Promise<void> =>
  request.put('api/v1/node/detail', data)

export const createNode = (data: CreateNodeData): Promise<{ id: string }> =>
  request.post('api/v1/node', data)

export const createNodeSummary = (data: CreateNodeSummaryData): Promise<{ summary: string }> =>
  request.post('api/v1/node/summary', data)

export const getNodeRecommend = (params: GetNodeRecommendData): Promise<RecommendNode[]> =>
  request.get('api/v1/node/recommend_nodes', { params })

// =============================================》crawler

export const scrapeCrawler = (data: { url: string, kb_id: string }, config?: { signal: AbortSignal }): Promise<{ content: string, title: string }> =>
  request.post('api/v1/crawler/scrape', data, config)

export const scrapeRSS = (data: { url: string }): Promise<{ items: ScrapeRSSItem[] }> =>
  request.post('api/v1/crawler/parse_rss', data)

export const scrapeSitemap = (data: { url: string }): Promise<{ items: ScrapeRSSItem[] }> =>
  request.post('api/v1/crawler/parse_sitemap', data)

export const getNotionIntegration = (data: { integration: string }): Promise<{ id: string, title: string }[]> =>
  request.post('api/v1/crawler/notion/get_list', data)

export const getNotionIntegrationDetail = (data: { pages: { id: string, title: string }[], integration: string, kb_id: string }): Promise<{ content: string, title: string }[]> =>
  request.post('api/v1/crawler/notion/get_doc', data)

export const convertEpub = (data: FormData): Promise<{ content: string, title: string }> =>
  request.post('api/v1/crawler/epub/convert', data)

// =============================================》file

export const uploadFile = (
  data: FormData,
  config?: {
    onUploadProgress?: (event: { progress: number }) => void,
    abortSignal?: AbortSignal
  }
): Promise<{ key: string }> =>
  request.post('api/v1/file/upload', data, {
    onUploadProgress: config?.onUploadProgress ? (progressEvent) => {
      const progress = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1))
      config.onUploadProgress?.({ progress })
    } : undefined,
    signal: config?.abortSignal,
    headers: { 'Content-Type': 'multipart/form-data' }
  })

// =============================================》app

export const getAppDetail = (params: { kb_id: string, type: number }): Promise<AppDetail> =>
  request.get('api/v1/app/detail', { params })

export const updateAppDetail = (params: { id: string, }, app: UpdateAppDetailData): Promise<void> =>
  request.put('api/v1/app', app, { params })

// =============================================》model

export const getModelNameList = (data: GetModelNameData): Promise<{ models: { model: string }[] }> =>
  request.post('api/v1/model/provider/supported', data)

export const testModel = (data: CheckModelData): Promise<{ error: string }> =>
  request.post('api/v1/model/check', data)

export const getModelList = (): Promise<ModelListItem[]> =>
  request.get('api/v1/model/list')

export const createModel = (data: CreateModelData): Promise<{ id: string }> =>
  request.post('api/v1/model', data)

export const deleteModel = (params: { id: string, }): Promise<void> =>
  request.delete('api/v1/model', { params })

export const updateModel = (data: UpdateModelData): Promise<void> =>
  request.put('api/v1/model', data)

export const activateModel = (data: { model_id: string }): Promise<void> =>
  request.post('api/v1/model/activate', data)

// =============================================》share

export const getAppLink = (params: { link: string }): Promise<AppDetail> =>
  request.get('share/v1/app/link', { params })

// =============================================》conversation

export const getConversationList = (params: GetConversationListData): Promise<ResposeList<ConversationListItem>> =>
  request.get('api/v1/conversation', { params })

export const getConversationDetail = (params: { id: string }): Promise<ConversationDetail> =>
  request.get('api/v1/conversation/detail', { params })
