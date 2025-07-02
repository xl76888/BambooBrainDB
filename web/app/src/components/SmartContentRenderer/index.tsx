import React, { useState, useEffect, useMemo } from 'react';
import { Box, Stack, Button, Card, Skeleton, Chip, Typography, Accordion, AccordionSummary, AccordionDetails, Tooltip } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ViewListIcon from '@mui/icons-material/ViewList';
import ArticleIcon from '@mui/icons-material/Article';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import { apiClient, ContentAnalysisResponse, OutlineItem } from '@/api';
import { NodeDetail } from '@/assets/type';
import { useStore } from '@/provider';

interface SmartContentRendererProps {
  content: string;
  nodeInfo?: NodeDetail;
  showAIFeatures?: boolean;
}

const SmartContentRenderer: React.FC<SmartContentRendererProps> = ({
  content,
  nodeInfo,
  showAIFeatures = true
}) => {
  const { kb_id } = useStore();
  const [contentAnalysis, setContentAnalysis] = useState<ContentAnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [viewMode, setViewMode] = useState<'original' | 'enhanced'>('original');
  const [enhancedContent, setEnhancedContent] = useState<string>('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [showOutline, setShowOutline] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 过滤潜在 display:none 或其他干扰渲染的 <style> 标签
  const cleanContent = useMemo(() => {
    let html = content;
    // 移除 <style>...</style>
    html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    // 移除 <script>...</script>
    html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    // 移除行内 display:none
    html = html.replace(/style="[^"]*display\s*:\s*none[^\"]*"/gi, '');
    html = html.replace(/style='[^']*display\s*:\s*none[^']*'/gi, '');
    // 若含微信文章结构，仅保留 #js_content 内部正文
    const wxMatch = html.match(/<[^>]*id=["']?js_content["']?[^>]*>([\s\S]*?)<\/div>/i);
    if (wxMatch) {
      html = wxMatch[1];
    }
    // 去除可能的二维码遮罩层
    html = html.replace(/<div[^>]*(qr|code|wxapp|weixin)[^>]*>[\s\S]*?<\/div>/gi, '');
    return html;
  }, [content]);

  // 内容分析
  const analyzeContent = async () => {
    if (!cleanContent || !showAIFeatures || !kb_id) return;
    
    setIsAnalyzing(true);
    try {
      const { data, error } = await apiClient.analyzeContent({ content: cleanContent }, kb_id);
      if (error) {
        console.error('内容分析失败:', error);
        // 使用回退方案
        setContentAnalysis(fallbackAnalysis(cleanContent));
      } else if (data) {
        setContentAnalysis(data);
      }
    } catch (error) {
      console.error('内容分析失败:', error);
      setContentAnalysis(fallbackAnalysis(cleanContent));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 生成增强格式的内容
  const generateEnhancedContent = async () => {
    if (!cleanContent || !kb_id) return;
    
    setIsEnhancing(true);
    try {
      const { data, error } = await apiClient.enhanceContent({ 
        content: cleanContent,
        style: 'professional'
      }, kb_id);
      
      if (error) {
        console.error('内容增强失败:', error);
        setEnhancedContent(cleanContent); // 使用原始内容
      } else if (data) {
        setEnhancedContent(data.enhanced_content);
      }
    } catch (error) {
      console.error('内容增强失败:', error);
      setEnhancedContent(cleanContent);
    } finally {
      setIsEnhancing(false);
    }
  };

  // 回退分析方案
  const fallbackAnalysis = (content: string): ContentAnalysisResponse => {
    const textContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const sentences = textContent.split(/[。！？]/).filter(s => s.trim().length > 10);
    
    const summary = sentences.slice(0, 2).join('。') + '。';
    const keyPoints = sentences.slice(0, 5).map(s => s.trim()).filter(s => s.length > 20);
    const difficulty = textContent.length < 500 ? 'easy' : textContent.length > 2000 ? 'hard' : 'medium';
    
    return {
      summary,
      key_points: keyPoints,
      tags: ['文档', '内容'],
      difficulty: difficulty as 'easy' | 'medium' | 'hard',
      outline: extractOutline(content),
      processed_by: 'Local',
    };
  };

  // 提取大纲
  const extractOutline = (content: string): OutlineItem[] => {
    const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi;
    const outlineItems: OutlineItem[] = [];
    let match;
    
    while ((match = headingRegex.exec(content)) !== null) {
      const level = parseInt(match[1]);
      const title = match[2].replace(/<[^>]*>/g, '');
      const anchor = title.toLowerCase().replace(/\s+/g, '-');
      outlineItems.push({ level, title, anchor });
    }
    
    return outlineItems;
  };

  useEffect(() => {
    if (cleanContent && mounted) {
      analyzeContent();
    }
  }, [cleanContent, mounted, kb_id]);

  useEffect(() => {
    if (viewMode === 'enhanced' && !enhancedContent && !isEnhancing) {
      generateEnhancedContent();
    }
  }, [viewMode]);

  // 计算阅读时间
  const readingTime = useMemo(() => {
    const wordsPerMinute = 200;
    const wordCount = cleanContent.replace(/<[^>]*>/g, '').split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }, [cleanContent]);

  // 处理图片加载错误的函数
  useEffect(() => {
    if (!mounted || !cleanContent) return;

    const handleImageErrors = () => {
      const images = document.querySelectorAll('img[src*="/static-file/"]');
      
      images.forEach((img: Element) => {
        const imgElement = img as HTMLImageElement;
        
        if (!imgElement.dataset.errorHandled) {
          imgElement.dataset.errorHandled = 'true';
          
          imgElement.onerror = function() {
            console.warn(`图片加载失败: ${imgElement.src}`);
            imgElement.src = '/logo.png';
            imgElement.onerror = null;
          };
          
          if (imgElement.complete && imgElement.naturalWidth === 0) {
            imgElement.src = '/logo.png';
          }
        }
      });
    };

    const timer = setTimeout(handleImageErrors, 100);
    return () => clearTimeout(timer);
  }, [mounted, cleanContent, viewMode]);

  if (!mounted) {
    return <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
      准备中...
    </Box>;
  }

  if (!cleanContent) {
    return (
      <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
        暂无内容
      </Box>
    );
  }

  const outline = contentAnalysis?.outline || extractOutline(cleanContent);

  return (
    <Box>
      {/* AI功能控制栏 */}
      {showAIFeatures && (
        <Card sx={{ mb: 3, p: 2, bgcolor: 'background.paper' }}>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <Stack direction="row" spacing={1} alignItems="center">
              <AutoAwesomeIcon sx={{ color: 'primary.main', fontSize: 20 }} />
              <Typography variant="subtitle2" fontWeight="bold">
                AI增强显示
              </Typography>
            </Stack>
            
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant={viewMode === 'original' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('original')}
                startIcon={<ArticleIcon />}
              >
                原始格式
              </Button>
              <Button
                size="small"
                variant={viewMode === 'enhanced' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('enhanced')}
                startIcon={<AutoAwesomeIcon />}
                disabled={isEnhancing}
              >
                {isEnhancing ? '生成中...' : '智能格式'}
              </Button>
            </Stack>

            {outline.length > 0 && (
              <Button
                size="small"
                variant={showOutline ? 'contained' : 'outlined'}
                onClick={() => setShowOutline(!showOutline)}
                startIcon={<ViewListIcon />}
              >
                大纲导航
              </Button>
            )}

            <Box sx={{ flexGrow: 1 }} />
            
            {/* 阅读信息 */}
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip 
                label={`阅读时间 ${readingTime} 分钟`} 
                size="small" 
                color="primary" 
                variant="outlined" 
              />
              {contentAnalysis?.difficulty && (
                <Chip 
                  label={getDifficultyLabel(contentAnalysis.difficulty)} 
                  size="small" 
                  color={getDifficultyColor(contentAnalysis.difficulty)}
                  variant="outlined"
                />
              )}
            </Stack>
          </Stack>

          {/* AI洞察信息 */}
          {contentAnalysis && !isAnalyzing && (
            <Box sx={{ mt: 2 }}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <LightbulbIcon color="primary" fontSize="small" />
                    <Typography variant="subtitle2">AI内容洞察</Typography>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={2}>
                    {/* 智能摘要 */}
                    <Box>
                      <Typography variant="body2" fontWeight="bold" gutterBottom>
                        智能摘要
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {contentAnalysis.summary}
                      </Typography>
                    </Box>

                    {/* 关键要点 */}
                    {contentAnalysis.key_points.length > 0 && (
                      <Box>
                        <Typography variant="body2" fontWeight="bold" gutterBottom>
                          关键要点
                        </Typography>
                        <Stack spacing={1}>
                          {contentAnalysis.key_points.map((point, index) => (
                            <Typography key={index} variant="body2" color="text.secondary">
                              • {point}
                            </Typography>
                          ))}
                        </Stack>
                      </Box>
                    )}

                    {/* 内容标签 */}
                    {contentAnalysis.tags.length > 0 && (
                      <Box>
                        <Typography variant="body2" fontWeight="bold" gutterBottom>
                          内容标签
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          {contentAnalysis.tags.map((tag, index) => (
                            <Chip 
                              key={index} 
                              label={tag} 
                              size="small" 
                              variant="outlined"
                            />
                          ))}
                        </Stack>
                      </Box>
                    )}

                    {/* 内容来源 */}
                    {contentAnalysis.processed_by && (
                      <Box>
                        <Typography variant="body2" fontWeight="bold" gutterBottom>
                          内容来源
                        </Typography>
                        <Chip 
                          label={contentAnalysis.processed_by === 'AI' ? 'AI分析' : '本地分析'} 
                          size="small" 
                          color="secondary" 
                          variant="outlined"
                        />
                      </Box>
                    )}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            </Box>
          )}

          {/* 分析加载状态 */}
          {isAnalyzing && (
            <Box sx={{ mt: 2 }}>
              <Stack spacing={1}>
                <Skeleton variant="text" height={20} />
                <Skeleton variant="text" height={20} width="80%" />
                <Stack direction="row" spacing={1}>
                  <Skeleton variant="rectangular" height={24} width={60} />
                  <Skeleton variant="rectangular" height={24} width={80} />
                </Stack>
              </Stack>
            </Box>
          )}
        </Card>
      )}

      {/* 大纲导航 */}
      {showOutline && outline.length > 0 && (
        <Card sx={{ mb: 3, p: 2 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ViewListIcon color="primary" />
            文档大纲
          </Typography>
          <Stack spacing={0.5}>
            {outline.map((item, index) => (
              <Box
                key={index}
                sx={{
                  pl: (item.level - 1) * 2,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' },
                  borderRadius: 1,
                  p: 0.5
                }}
                onClick={() => {
                  const element = document.getElementById(item.anchor);
                  element?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <Typography variant="body2" color="primary">
                  {item.title}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Card>
      )}

      {/* 内容显示区域 */}
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
          '& .enhanced-content': {
            backgroundColor: 'action.hover',
            padding: '1em',
            borderRadius: '8px',
          },
        }}
      >
        {isEnhancing && viewMode === 'enhanced' ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Skeleton variant="text" height={32} />
            <Skeleton variant="text" height={24} />
            <Skeleton variant="text" height={24} width="80%" />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              AI正在优化内容格式...
            </Typography>
          </Box>
        ) : (
          <Box 
            dangerouslySetInnerHTML={{ 
              __html: viewMode === 'enhanced' && enhancedContent ? enhancedContent : cleanContent 
            }}
          />
        )}
      </Box>
    </Box>
  );
};

// 辅助函数
const getDifficultyLabel = (difficulty: string): string => {
  switch (difficulty) {
    case 'easy': return '简单';
    case 'medium': return '中等';
    case 'hard': return '困难';
    default: return '中等';
  }
};

const getDifficultyColor = (difficulty: string): 'success' | 'warning' | 'error' => {
  switch (difficulty) {
    case 'easy': return 'success';
    case 'medium': return 'warning';
    case 'hard': return 'error';
    default: return 'warning';
  }
};

export default SmartContentRenderer; 