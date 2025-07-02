"use client";

import { KBDetail, NodeListItem } from '@/assets/type';
import { getAuthStatus } from '@/utils/auth';
import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';

interface StoreContextType {
  kbDetail?: KBDetail
  kb_id?: string
  catalogShow?: boolean
  themeMode?: 'light' | 'dark'
  mobile?: boolean
  nodeList?: NodeListItem[]
  loading?: boolean;
  setCatalogShow?: (value: boolean) => void
  refreshNodeList?: () => Promise<void>;
}

export const StoreContext = createContext<StoreContextType>({
  kbDetail: undefined,
  kb_id: undefined,
  catalogShow: undefined,
  themeMode: 'light',
  mobile: false,
  nodeList: undefined,
  loading: false,
  setCatalogShow: () => { },
  refreshNodeList: async () => { },
})

export const useStore = () => useContext(StoreContext);

export default function StoreProvider({
  children,
  kbDetail,
  kb_id,
  themeMode,
  nodeList: initialNodeList,
  mobile,
}: StoreContextType & { children: React.ReactNode }) {
  const catalogSettings = kbDetail?.settings?.catalog_settings
  const [nodeList, setNodeList] = useState<NodeListItem[] | undefined>(initialNodeList);
  const [loading, setLoading] = useState(false);
  const [catalogShow, setCatalogShow] = useState(catalogSettings?.catalog_visible !== 2);
  const theme = useTheme();

  const isMobile = useMediaQuery(theme.breakpoints.down('md'), {
    defaultMatches: mobile,
  });

  const fetchingRef = useRef(false);
  const lastFetchKbId = useRef<string | undefined>(undefined);
  const initialDataLoaded = useRef(false);

  const fetchNodeList = useCallback(async (force = false) => {
    if (!kb_id) return;
    
    // 防止重复调用
    if (fetchingRef.current && !force) return;
    
    // 如果有初始数据且不是强制刷新，跳过
    if (!force && initialNodeList && initialNodeList.length > 0 && !initialDataLoaded.current) {
      // 添加去重逻辑
      const uniqueNodes = deduplicateNodes(initialNodeList);
      setNodeList(uniqueNodes);
      lastFetchKbId.current = kb_id;
      initialDataLoaded.current = true;
      return;
    }
    
    // 如果已经有数据且不是强制刷新，跳过
    if (!force && nodeList && nodeList.length > 0 && lastFetchKbId.current === kb_id) {
      return;
    }

    fetchingRef.current = true;
    setLoading(true);
    
    try {
      const cookies = document.cookie.split(';');
      const authCookie = cookies.find(cookie =>
        cookie.trim().startsWith(`auth_${kb_id}=`)
      );
      const authToken = authCookie ? authCookie.split('=')[1] : '';

      const response = await fetch('/share/v1/node/list', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-kb-id': kb_id,
          ...(authToken ? { 'X-Simple-Auth-Password': authToken } : {}),
        }
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.data) {
          // 添加去重逻辑
          const uniqueNodes = deduplicateNodes(result.data);
          setNodeList(uniqueNodes);
          lastFetchKbId.current = kb_id;
        }
      }
    } catch (error) {
      console.error('Error fetching node list:', error);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [kb_id, nodeList, initialNodeList]);

  // 添加去重函数
  const deduplicateNodes = (nodes: NodeListItem[]): NodeListItem[] => {
    const seen = new Set<string>();
    return nodes.filter(node => {
      if (seen.has(node.id)) {
        console.warn(`🔧 发现重复节点ID: ${node.id}, 已自动去重`);
        return false;
      }
      seen.add(node.id);
      return true;
    });
  };

  const refreshNodeList = async () => {
    await fetchNodeList(true); // 强制刷新
  };

  useEffect(() => {
    setCatalogShow(catalogSettings?.catalog_visible !== 2);
  }, [catalogSettings]);

  useEffect(() => {
    // 如果有初始数据，直接使用
    if (initialNodeList && initialNodeList.length > 0 && !initialDataLoaded.current) {
      setNodeList(initialNodeList);
      lastFetchKbId.current = kb_id;
      initialDataLoaded.current = true;
      return;
    }
    
    // 只有在没有初始数据或 kb_id 变化时才获取
    if (kb_id && (lastFetchKbId.current !== kb_id || (!nodeList && !initialNodeList))) {
      if (lastFetchKbId.current !== kb_id) {
        // kb_id 变化时，清空nodeList并重新获取
        setNodeList(undefined);
        initialDataLoaded.current = false;
      }
      fetchNodeList();
    }
  }, [kb_id, fetchNodeList, initialNodeList, nodeList]);

  return <StoreContext.Provider
    value={{
      kbDetail,
      kb_id,
      themeMode,
      nodeList,
      catalogShow,
      setCatalogShow,
      mobile: isMobile,
      loading,
      refreshNodeList,
    }}
  >{children}</StoreContext.Provider>
}
