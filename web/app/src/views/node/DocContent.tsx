'use client'

import React, { useState, useEffect } from 'react'
import { NodeDetail } from "@/assets/type";
import { IconFile, IconFolder } from "@/components/icons";
import { useStore } from "@/provider";
import { Box, Stack } from "@mui/material";
import dayjs from "dayjs";
import 'dayjs/locale/zh-cn';
import relativeTime from "dayjs/plugin/relativeTime";
import SmartContentRenderer from "@/components/SmartContentRenderer";

dayjs.extend(relativeTime);
dayjs.locale('zh-cn')

// 简单的HTML内容显示组件，作为主要的内容渲染器
const SimpleContentRenderer = ({ content }: { content: string }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 处理图片加载错误的函数
  useEffect(() => {
    if (!mounted || !content) return;

    const handleImageErrors = () => {
      // 查找所有图片元素
      const images = document.querySelectorAll('img[src*="/static-file/"]');
      
      images.forEach((img: Element) => {
        const imgElement = img as HTMLImageElement;
        
        // 如果图片还没有错误处理器，添加一个
        if (!imgElement.dataset.errorHandled) {
          imgElement.dataset.errorHandled = 'true';
          
          imgElement.onerror = function() {
            // 图片加载失败时，替换为默认图片
            console.warn(`图片加载失败: ${imgElement.src}`);
            imgElement.src = '/logo.png';
            imgElement.onerror = null; // 防止无限循环
          };
          
          // 检查图片是否已经加载失败
          if (imgElement.complete && imgElement.naturalWidth === 0) {
            imgElement.src = '/logo.png';
          }
        }
      });
    };

    // 延迟执行以确保DOM已渲染
    const timer = setTimeout(handleImageErrors, 100);
    
    return () => clearTimeout(timer);
  }, [mounted, content]);

  if (!mounted) {
    return <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
      准备中...
    </Box>;
  }

  if (!content || content.trim() === '') {
    return <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
      暂无内容
    </Box>;
  }

  return (
    <Box 
      sx={{ 
        '& *': { 
          color: 'text.primary !important',
          lineHeight: 1.6,
        },
        '& h1': {
          fontSize: '2rem',
          fontWeight: 'bold',
          margin: '1rem 0',
        },
        '& h2': {
          fontSize: '1.5rem',
          fontWeight: 'bold',
          margin: '1rem 0',
        },
        '& h3': {
          fontSize: '1.25rem',
          fontWeight: 'bold',
          margin: '1rem 0',
        },
        '& h4': {
          fontSize: '1.125rem',
          fontWeight: 'bold',
          margin: '1rem 0',
        },
        '& h5': {
          fontSize: '1rem',
          fontWeight: 'bold',
          margin: '1rem 0',
        },
        '& h6': {
          fontSize: '0.875rem',
          fontWeight: 'bold',
          margin: '1rem 0',
        },
        '& p': {
          margin: '0.5rem 0',
        },
        '& ul, & ol': {
          paddingLeft: '1.5em',
          margin: '0.5rem 0',
        },
        '& li': {
          margin: '0.25rem 0',
        },
        '& blockquote': {
          borderLeft: '4px solid',
          borderColor: 'primary.main',
          paddingLeft: '1em',
          margin: '1em 0',
          fontStyle: 'italic',
          backgroundColor: 'action.hover',
          padding: '0.5em 1em',
          borderRadius: '4px',
        },
        '& code': {
          backgroundColor: 'action.hover',
          padding: '0.2em 0.4em',
          borderRadius: '4px',
          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          fontSize: '0.9em',
        },
        '& pre': {
          backgroundColor: 'action.hover',
          padding: '1em',
          borderRadius: '8px',
          overflow: 'auto',
          margin: '1em 0',
          '& code': {
            backgroundColor: 'transparent',
            padding: 0,
          },
        },
        '& img': {
          maxWidth: '100%',
          height: 'auto',
          borderRadius: '8px',
          margin: '0.5em 0',
        },
        '& table': {
          width: '100%',
          borderCollapse: 'collapse',
          margin: '1em 0',
          border: '1px solid',
          borderColor: 'divider',
        },
        '& th, & td': {
          border: '1px solid',
          borderColor: 'divider',
          padding: '0.75em',
          textAlign: 'left',
        },
        '& th': {
          backgroundColor: 'action.hover',
          fontWeight: 'bold',
        },
        '& a': {
          color: 'primary.main',
          textDecoration: 'underline',
          '&:hover': {
            color: 'primary.dark',
          },
        },
        '& strong, & b': {
          fontWeight: 'bold',
        },
        '& em, & i': {
          fontStyle: 'italic',
        },
        '& hr': {
          border: 'none',
          borderTop: '1px solid',
          borderColor: 'divider',
          margin: '2em 0',
        },
      }}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
};

const DocContent = ({ info, editorRef }: { info?: NodeDetail, editorRef: any }) => {
  const { mobile = false, kbDetail, catalogShow } = useStore()
  
  if (!info) return null

  const catalogSetting = kbDetail?.settings?.catalog_settings

  return <Box sx={{
    width: `calc(100% - ${catalogShow ? catalogSetting?.catalog_width ?? 260 : 16}px - 225px)`,
    ml: catalogShow ? `${catalogSetting?.catalog_width ?? 260}px` : '16px',
    wordBreak: 'break-all',
    color: 'text.primary',
    px: 10,
    position: 'relative',
    zIndex: 1,
    ...(mobile && {
      width: '100%',
      marginLeft: 0,
      marginTop: '77px',
      px: 3,
      table: {
        minWidth: 'auto !important',
      },
    }),
  }}>
    <Stack sx={{ width: '100%' }}>
      <Stack sx={{ width: '100%', height: '46px' }} direction={'row'} alignItems={'center'} justifyContent={'space-between'}>
        <Stack direction={'row'} alignItems={'center'} gap={1}>
          {info?.type === 1 ? <IconFolder style={{ color: '#4CAF50' }} /> : <IconFile style={{ color: '#2196F3' }} />}
          <Box sx={{ fontSize: '18px', fontWeight: 'bold' }}>
            {info?.name}
          </Box>
        </Stack>
        <Stack direction={'row'} alignItems={'center'} gap={1} sx={{ fontSize: '12px', color: 'text.secondary' }}>
          更新于 {dayjs(info?.updated_at).fromNow()}
        </Stack>
      </Stack>
      <Box sx={{
        mt: 2,
        width: '100%',
      }}>
        <SmartContentRenderer 
          content={info?.content || ''} 
          nodeInfo={info}
          showAIFeatures={true}
        />
      </Box>
    </Stack>
  </Box>
}

export default DocContent