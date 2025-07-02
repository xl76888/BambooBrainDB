'use client'

import { IconSearch } from "@/components/icons";
import { useStore } from "@/provider";
import { Box, Button, IconButton, Stack, TextField } from "@mui/material";
import SafeImage from "@/components/SafeImage";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from 'react';
import NavBtns from './NavBtns';

const Header = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { mobile = false, kbDetail, catalogShow } = useStore()
  const siteTitle = kbDetail?.settings?.title || kbDetail?.settings?.welcome_str || 'Panda-Wiki'
  const [searchValue, setSearchValue] = useState('');
  
  const catalogSetting = kbDetail?.settings?.catalog_settings

  const handleSearch = () => {
    if (searchValue.trim()) {
      sessionStorage.setItem('chat_search_query', searchValue.trim());
      router.push('/chat');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{
    position: 'fixed',
    zIndex: 10,
    top: 0,
    left: catalogShow ? catalogSetting?.catalog_width ?? 260 : 16,
    right: 0,
    pr: 10,
    pl: 10,
    height: 64,
    bgcolor: 'background.default',
    borderBottom: '1px solid',
    borderColor: 'divider',
    ...(mobile && {
      left: 0,
      pl: 3,
      pr: 1,
    }),
  }}>
    <Link href={'/'}>
      <Stack direction='row' alignItems='center' gap={1.5} sx={{ py: '20px', cursor: 'pointer', color: 'text.primary', '&:hover': { color: 'primary.main' } }} >
        <SafeImage 
          src={kbDetail?.settings?.icon || '/logo.png'} 
          alt='logo' 
          width={32} 
          height={32}
          style={{ objectFit: 'contain' }}
          priority
        />
        <Box sx={{ fontSize: 18 }}>{siteTitle}</Box>
      </Stack>
    </Link>
    <Stack direction="row" alignItems="center" gap={2}>
      {pathname !== '/welcome' && pathname !== '/chat' && (
        mobile ? <IconButton
          size='small'
          sx={{ width: 40, height: 40, color: 'text.primary' }}
        >
          <IconSearch
            sx={{ fontSize: 20 }}
            onClick={() => {
              router.push(`/chat`);
            }}
          />
        </IconButton> : <TextField
          size="small"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="搜索..."
          sx={{
            width: '300px',
            bgcolor: 'background.default',
            borderRadius: '10px',
            overflow: 'hidden',
            '& .MuiInputBase-input': {
              lineHeight: '24px',
              height: '24px',
              fontFamily: 'Mono',
            },
            '& .MuiOutlinedInput-root': {
              pr: '18px',
              '& fieldset': {
                borderRadius: '10px',
                borderColor: 'divider',
                px: 2,
              },
            }
          }}
          InputProps={{
            endAdornment: <IconSearch
              sx={{ cursor: 'pointer', color: 'text.tertiary' }}
            />
          }}
        />)}
      {!mobile && kbDetail?.settings?.btns?.map((item, index) => (
        <Link key={index} href={item.url} target={item.target}>
          <Button
            variant={item.variant}
            startIcon={item.showIcon && item.icon ? (
              <SafeImage 
                src={item.icon} 
                alt='icon' 
                width={24} 
                height={24}
              />
            ) : null}
            sx={{ textTransform: 'none' }}
          >
            <Box sx={{ lineHeight: '24px' }}>{item.text}</Box>
          </Button>
        </Link>
      ))}
      {mobile && <NavBtns detail={kbDetail} />}
    </Stack>
  </Stack>
}

export default Header;