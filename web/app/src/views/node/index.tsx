'use client'

import { apiClient } from "@/api";
import NotData from '@/assets/images/nodata.png';
import { NodeDetail } from "@/assets/type";
import Footer from "@/components/footer";
import Header from "@/components/header";
import { useStore } from "@/provider";
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { Box, Fab, Stack, Zoom } from "@mui/material";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Catalog from "./Catalog";
import CatalogH5 from "./CatalogH5";
import DocAnchor from "./DocAnchor";
import DocContent from "./DocContent";

const Doc = ({ node: defaultNode, token }: { node?: NodeDetail, token?: string }) => {

  const { id = '' }: { id: string } = useParams()

  const { nodeList = [], kb_id, kbDetail, mobile = false, catalogShow } = useStore()

  const catalogSetting = kbDetail?.settings?.catalog_settings
  const footerSetting = kbDetail?.settings?.footer_settings
  const [footerHeight, setFooterHeight] = useState(0);

  const [node, setNode] = useState<NodeDetail | undefined>(defaultNode)
  const [mounted, setMounted] = useState(false)

  const [showScrollTop, setShowScrollTop] = useState(false);

  const handleScroll = () => {
    if (typeof window !== 'undefined') {
      setShowScrollTop(window.scrollY > 300);
    }
  };

  // 获取 Footer 高度的函数
  const getFooterHeight = () => {
    if (typeof document === 'undefined') return 0;
    
    const footerElement = document.getElementById('footer');
    if (footerElement) {
      const height = footerElement.offsetHeight;
      setFooterHeight(height);
      return height;
    }
    return 0;
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // 延迟获取高度，确保 DOM 已渲染
    const timer = setTimeout(() => {
      getFooterHeight();
    }, 100);

    // 监听窗口大小变化，重新计算高度
    const handleResize = () => {
      getFooterHeight();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [footerSetting, mobile]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 标记组件已挂载
  useEffect(() => {
    setMounted(true);
  }, []);

  // 获取浏览器中当前的认证口令
  const getAuthToken = () => {
    if (typeof document === 'undefined') return token || '';
    const match = document.cookie.split(';').find(c => c.trim().startsWith(`auth_${kb_id}=`));
    return match ? match.split('=')[1] : token || '';
  };

  const getData = async (id: string) => {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const currentToken = getAuthToken();
      const result = await apiClient.serverGetNodeDetail(id, kb_id || '', currentToken, origin);
      if (result.data) {
        setNode(result.data);
      } else {
        console.error('ss Error fetching document content:', result.error || 'No data returned');
      }
    } catch (error) {
      console.error('ss Error fetching document content:', error);
    }
  }

  useEffect(() => {
    getData(id || '')
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [id])

  // 创建一个简单的 mock editorRef 对象，用于兼容现有组件接口
  const mockEditorRef = {
    getNavs: () => Promise.resolve([]),
    editor: {
      getHTML: () => node?.content || '',
      element: null,
    },
    isReady: mounted,
  };

  return (
    <>
      {mobile ? (
        <Box sx={{ mt: '60px', position: 'relative', zIndex: 1 }}>
          <Box sx={{ minHeight: `calc(100vh - ${footerHeight + 1}px - 100px)` }}>
            <Header />
            {nodeList && <CatalogH5 nodes={nodeList} />}
            <Box sx={{ height: 24 }} />
            {node ? <DocContent info={node} editorRef={mockEditorRef} /> : <Stack direction='column' alignItems='center' justifyContent='center' sx={{
              height: 600,
            }}>
              <Image src={NotData.src} alt='not data' width={423} height={232} />
              <Box sx={{
                fontSize: 14,
                color: 'text.secondary',
                textAlign: 'center',
                mt: 2,
              }}>
                文档不存在
              </Box>
            </Stack>}
          </Box>
          <Box sx={{
            mt: 5,
            bgcolor: 'background.paper',
            ...(footerSetting?.footer_style === 'complex' && {
              borderTop: '1px solid',
              borderColor: 'divider',
            }),
          }}>
            <Footer />
          </Box>
          <Zoom in={showScrollTop}>
            <Fab
              size="small"
              onClick={scrollToTop}
              sx={{
                backgroundColor: 'background.paper',
                color: 'text.primary',
                position: 'fixed',
                bottom: 66,
                right: 16,
                zIndex: 1000,
              }}
            >
              <KeyboardArrowUpIcon sx={{ fontSize: 24 }} />
            </Fab>
          </Zoom>
        </Box>
      ) : (
        <Box sx={{
          position: 'relative',
          bgcolor: 'background.default',
        }}>
          <Catalog />
          <Header />
          {node ? <>
            <Box sx={{
              pt: '96px',
              position: 'relative',
              zIndex: 1,
              minHeight: `calc(100vh - ${footerHeight + 1}px)`,
              pb: 10,
              bgcolor: 'background.default',
            }}>
              <DocContent info={node} editorRef={mockEditorRef} />
            </Box>
            <DocAnchor
              editorRef={mockEditorRef}
              node={node}
              summary={node?.meta?.summary || ''}
            />
          </> : <Stack direction='column' alignItems='center' justifyContent='center' sx={{
            position: 'relative',
            height: `calc(100vh - ${footerHeight + 1}px)`,
            ml: catalogShow ? `${catalogSetting?.catalog_width ?? 260}px` : '16px',
          }}>
            {footerHeight > 0 && <>
              <Image src={NotData.src} alt='not data' width={423} height={232} />
              <Box sx={{
                fontSize: 14,
                color: 'text.secondary',
                textAlign: 'center',
                mt: 2,
              }}>
                文档不存在
              </Box>
            </>}
          </Stack>}
          <Footer />
          <Zoom in={showScrollTop}>
            <Fab
              size="small"
              onClick={scrollToTop}
              sx={{
                backgroundColor: 'background.paper',
                color: 'text.primary',
                position: 'fixed',
                bottom: 66,
                right: 16,
                zIndex: 1000,
              }}
            >
              <KeyboardArrowUpIcon sx={{ fontSize: 24 }} />
            </Fab>
          </Zoom>
        </Box>
      )}
    </>
  )
};

export default Doc;
