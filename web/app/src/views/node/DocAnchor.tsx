'use client'

import { NodeDetail } from "@/assets/type";
import { IconArrowDown } from "@/components/icons";
import useScroll from "@/utils/useScroll";
import { Box, IconButton, Stack } from "@mui/material";
import { useEffect, useState } from "react";

interface Heading {
  id: string
  title: string
  heading: number
}

interface DocAnchorProps {
  summary: string
  node?: NodeDetail
  editorRef: any // 使用any类型避免服务端渲染问题
}

const HeadingSx = [
  { fontWeight: 400, color: 'text.secondary' },
  { fontWeight: 400, color: 'text.tertiary' },
  { fontWeight: 400, color: 'text.disabled' },
]

// 从HTML内容中提取标题的函数
const extractHeadingsFromHTML = (htmlContent: string): Heading[] => {
  // 确保只在客户端环境执行
  if (typeof window === 'undefined' || typeof document === 'undefined' || !htmlContent) {
    return [];
  }
  
  try {
    // 检查DOMParser是否可用
    if (!window.DOMParser) {
      console.warn('DOMParser not available');
      return [];
    }
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const headingElements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
    
    const headings: Heading[] = [];
    headingElements.forEach((element, index) => {
      const level = parseInt(element.tagName.substring(1));
      const title = element.textContent?.trim() || '';
      if (title) {
        // 生成一个简单的ID
        const id = `heading-${index}-${title.replace(/\s+/g, '-').toLowerCase()}`;
        headings.push({
          id,
          title,
          heading: level
        });
      }
    });
    
    return headings;
  } catch (error) {
    console.error('Error extracting headings:', error);
    return [];
  }
};

const DocAnchor = ({ summary, node, editorRef }: DocAnchorProps) => {
  const [headings, setHeadings] = useState<Heading[]>([])
  const [mounted, setMounted] = useState(false)
  const { activeHeading, scrollToElement } = useScroll(headings)

  const [expand, setExpand] = useState(true)

  const levels = Array.from(new Set(headings.map(it => it.heading).sort((a, b) => a - b))).slice(0, 3)

  // 确保组件在客户端挂载后才执行
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleClick = (e: React.MouseEvent<HTMLDivElement>, heading: Heading) => {
    e.preventDefault();
    
    if (!mounted || typeof window === 'undefined') return;
    
    if (scrollToElement) {
      scrollToElement(heading.id, 80);
    } else {
      // 尝试通过标题文本查找元素
      const elements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      let targetElement: Element | null = null;
      
      for (const element of elements) {
        if (element.textContent?.trim() === heading.title) {
          targetElement = element;
          break;
        }
      }
      
      if (targetElement) {
        const offset = 80;
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
        
        if (typeof location !== 'undefined') {
          location.hash = encodeURIComponent(heading.title);
        }
      }
    }
  };

  useEffect(() => {
    // 只在客户端挂载后且有node数据时执行
    if (!mounted || !node || typeof window === 'undefined') return;
    
    // 延迟执行，确保DOM已完全渲染
    const timer = setTimeout(() => {
      try {
        // 尝试从编辑器获取导航，如果失败则从HTML内容提取
        if (editorRef && editorRef.getNavs) {
          editorRef.getNavs().then((navs: Heading[]) => {
            if (navs && navs.length > 0) {
              setHeadings(navs);
            } else {
              // 如果编辑器没有返回导航，从HTML内容提取
              const extractedHeadings = extractHeadingsFromHTML(node.content || '');
              setHeadings(extractedHeadings);
            }
          }).catch((error: any) => {
            console.error('Error getting navigation from editor:', error);
            // 从HTML内容提取标题作为备选方案
            const extractedHeadings = extractHeadingsFromHTML(node.content || '');
            setHeadings(extractedHeadings);
          });
        } else {
          // 直接从HTML内容提取标题
          const extractedHeadings = extractHeadingsFromHTML(node.content || '');
          setHeadings(extractedHeadings);
        }
      } catch (error) {
        console.error('Error processing headings:', error);
        setHeadings([]);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [node, editorRef, mounted])

  // 在客户端挂载前不渲染
  if (!mounted) {
    return null;
  }

  return <Box sx={{
    fontSize: 12,
    position: 'fixed',
    zIndex: 5,
    top: 96,
    right: 16,
    width: 200,
  }}>
    {summary && <Box sx={{
      bgcolor: 'background.paper',
      borderRadius: '10px',
      border: '1px solid',
      borderColor: 'divider',
      p: 2,
      mb: 2,
    }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box sx={{
          fontWeight: 'bold',
          cursor: 'pointer',
          color: 'text.secondary',
        }}>
          文档摘要
        </Box>
        <IconButton size="small" sx={{ width: 17, height: 17 }} onClick={() => setExpand(!expand)}>
          <IconArrowDown sx={{ transform: expand ? 'rotate(0deg)' : 'rotate(-180deg)' }} />
        </IconButton>
      </Stack>
      {expand && <Box sx={{
        color: 'text.tertiary',
        maxHeight: '110px',
        mt: 1,
        lineHeight: '20px',
        textAlign: 'justify',
        overflowY: 'auto',
        overflowX: 'hidden',
        '&::-webkit-scrollbar': {
          display: 'none',
        },
        msOverflowStyle: 'none',
        scrollbarWidth: 'none',
      }}>{summary}</Box>}
    </Box>}
    {headings.length > 0 && <Box sx={{
      bgcolor: 'background.paper',
      borderRadius: '10px',
      border: '1px solid',
      borderColor: 'divider',
      padding: '16px',
    }}>
      <Box sx={{
        fontWeight: 'bold',
        cursor: 'pointer',
        mb: 1,
        color: 'text.secondary',
      }}>
        内容大纲
      </Box>
      <Box sx={{
        maxHeight: 'calc(100vh - 359px)',
        overflowY: 'auto',
        overflowX: 'hidden',
        lineHeight: '32px',
        '&::-webkit-scrollbar': {
          display: 'none',
        },
        msOverflowStyle: 'none',
        scrollbarWidth: 'none',
      }}>
        {headings.filter(it => levels.includes(it.heading)).map((heading) => {
          const idx = levels.indexOf(heading.heading)
          return <Box key={heading.id} sx={{
            cursor: 'pointer',
            pl: idx * 2,
            ...HeadingSx[idx],
            color: activeHeading?.id === heading.id ? 'primary.main' : HeadingSx[idx].color,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            ':hover': {
              color: 'primary.main'
            }
          }} onClick={(e) => handleClick(e, heading)}>
            {heading.title}
          </Box>
        })}
      </Box>
    </Box>}
  </Box>
}

export default DocAnchor;