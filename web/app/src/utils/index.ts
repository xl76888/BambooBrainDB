import { message } from "ct-mui";
import { ResolvingMetadata } from "next";

export function addOpacityToColor(color: string, opacity: number) {
  let red, green, blue;

  if (color.startsWith("#")) {
    red = parseInt(color.slice(1, 3), 16);
    green = parseInt(color.slice(3, 5), 16);
    blue = parseInt(color.slice(5, 7), 16);
  } else if (color.startsWith("rgb")) {
    const matches = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/) as RegExpMatchArray;
    red = parseInt(matches[1], 10);
    green = parseInt(matches[2], 10);
    blue = parseInt(matches[3], 10);
  } else {
    return "";
  }

  const alpha = opacity;

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

/**
 * 判断当前页面是否在iframe中
 * @returns {boolean} 如果在iframe中返回true，否则返回false
 */
export function isInIframe(): boolean {
  // 检查window对象是否存在（服务器端渲染时不存在）
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    // 如果window.self !== window.top，则当前页面在iframe中
    return window.self !== window.top;
  } catch (e) {
    console.error(e)
    // 如果访问window.top时出现跨域错误，也说明在iframe中
    return true;
  }
}

export const copyText = (text: string, callback?: () => void) => {
  const isOriginIP = /^http:\/\/(\d{1,3}\.){3}\d{1,3}(:\d+)?$/.test(window.location.origin);

  if (isOriginIP) {
    message.error('http 协议下不支持复制，请使用 https 协议');
    return;
  }

  try {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
      message.success('复制成功')
      callback?.()
    } else {
      const textArea = document.createElement('textarea')
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      textArea.style.left = '-9999px'
      textArea.style.top = '-9999px'
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      try {
        const successful = document.execCommand('copy')
        if (successful) {
          message.success('复制成功')
          callback?.()
        } else {
          message.error('复制失败，请手动复制')
        }
      } catch (err) {
        console.error(err)
        message.error('复制失败，请手动复制')
      }
      document.body.removeChild(textArea)
    }
  } catch (err) {
    console.error(err)
    message.error('复制失败，请手动复制')
  }
}

export function getOrigin(req: any) {
  if (typeof window !== 'undefined') {
    // 客户端
    return window.location.origin;
  }

  // 服务器端（需传入 req 对象）
  const protocol = req?.headers['x-forwarded-proto'] || 'http';
  const host = req?.headers['x-forwarded-host'] || req?.headers.host;
  return `${protocol}://${host}`;
}

export const extractHeadings = (html: string) => {
  // 检查是否在浏览器环境中
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    // 服务端渲染时的简单解析，使用正则表达式
    const headingRegex = /<h([1-6])[^>]*id=['"]?([^'">\s]*)[^>]*>([^<]*)<\/h[1-6]>/gi;
    const headings = [];
    let match;
    
    while ((match = headingRegex.exec(html)) !== null) {
      const level = parseInt(match[1]);
      const id = match[2] || Math.random().toString(36).substring(2, 15);
      const title = match[3].trim();
      
      if (title) {
        headings.push({
          title,
          heading: level as 1 | 2 | 3 | 4 | 5 | 6,
          id
        });
      }
    }
    
    return headings;
  }

  // 浏览器环境中的原始实现
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');

  return Array.from(headings).map(heading => {
    const level = parseInt(heading.tagName[1]);
    const id = heading.id || Math.random().toString(36).substring(2, 15)
    return {
      title: heading.textContent || '',
      heading: level as 1 | 2 | 3 | 4 | 5 | 6,
      id
    };
  });
}


export const formatMeta = async (
  {
    title,
    description,
    keywords,
  }: { title?: string; description?: string; keywords?: string | string[] },
  parent: ResolvingMetadata
) => {
  const keywordsIsEmpty =
    !keywords || (Array.isArray(keywords) && !keywords.length);
  const {
    title: parentTitle,
    description: parentDescription,
    keywords: parentKeywords,
  } = await parent;

  return {
    title: title ? `${parentTitle?.absolute} - ${title}` : parentTitle,
    description: description || parentDescription,
    keywords: keywordsIsEmpty ? parentKeywords : keywords,
  };
};