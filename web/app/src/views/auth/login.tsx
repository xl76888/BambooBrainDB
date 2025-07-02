'use client';

import Footer from '@/components/footer';
import { IconLock } from '@/components/icons';
import { useStore } from '@/provider';
import { setAuthStatus } from '@/utils/auth';
import { Box, Button, InputAdornment, Stack, TextField } from '@mui/material';
import { message } from 'ct-mui';
import SafeImage from '@/components/SafeImage';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Login() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const { kbDetail, kb_id, themeMode, mobile = false, refreshNodeList } = useStore();
  
  const handleLogin = async () => {
    if (!password.trim()) {
      message.error('请输入访问口令');
      return;
    }

    if (!kb_id) {
      message.error('知识库配置错误');
      return;
    }

    setLoading(true);
    
    try {
      setAuthStatus(kb_id, password, 30);
      await refreshNodeList?.();
      router.push('/');
    } catch (error) {
      message.error('登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return <Box sx={{
    bgcolor: 'background.default',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    py: mobile ? 3 : 4,
    px: mobile ? 2 : 0,
  }}>
    <Box sx={{
      width: mobile ? '100%' : '430px',
      bgcolor: 'background.paper',
      borderRadius: mobile ? 0 : '20px',
      p: mobile ? 3 : 5,
      border: mobile ? 'none' : '1px solid',
      borderColor: 'divider',
      boxShadow: themeMode === 'dark' ? 'none' : '0px 4px 20px 0px rgba(0, 0, 0, 0.03)',
    }}>
      <Stack direction='column' alignItems="center" justifyContent="center" gap={3}>
        <Stack alignItems="center" >
          <Stack alignItems='center' gap={1} sx={{ mb: 5 }}>
            <SafeImage 
              src={kbDetail?.settings?.icon || '/logo.png'} 
              alt='logo' 
              width={40} 
              height={40} 
              style={{ objectFit: 'contain' }}
              priority 
            />
            <Box sx={{ fontSize: 28, lineHeight: '36px', fontWeight: 'bold' }}>{kbDetail?.settings?.title}</Box>
          </Stack>

          <TextField
            fullWidth
            type="password"
            value={password}
            autoFocus
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="请输入访问口令"
            disabled={loading}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start">
                  <IconLock sx={{ fontSize: 16, width: 24, height: 16 }} />
                </InputAdornment>
              }
            }}
            sx={{
              borderRadius: '10px',
              overflow: 'hidden',
              '& .MuiInputBase-input': {
                p: 2,
                lineHeight: '24px',
                height: '24px',
                fontFamily: 'Mono',
              },
              '& .MuiOutlinedInput-root': {
                pr: '18px',
                bgcolor: 'background.paper',
                '& fieldset': {
                  borderRadius: '10px',
                  borderColor: 'divider',
                  px: 2,
                },
              }
            }}
          />

          <Button
            fullWidth
            variant="contained"
            onClick={handleLogin}
            sx={{ mt: 5, height: '50px', fontSize: 16 }}
            disabled={loading || !password.trim() || !kb_id}
          >
            {loading ? '验证中...' : '认证访问'}
          </Button>
        </Stack>
      </Stack>
    </Box>
    <Box sx={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 1,
    }}>
      <Footer />
    </Box>
  </Box>
} 