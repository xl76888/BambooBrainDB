import { useStore } from '@/provider';
import { Box, Divider, Stack } from "@mui/material";
import SafeImage from '@/components/SafeImage';
import Link from 'next/link';
import { useState } from 'react';

const Footer = () => {
  const { kbDetail, mobile = false } = useStore();
  const footerSetting = kbDetail?.settings?.footer_settings;
  const [logoError, setLogoError] = useState(false);

  const showBrand = footerSetting?.brand_name || footerSetting?.brand_desc || footerSetting?.brand_groups?.length

  return <Box id="footer" sx={{
    bgcolor: 'background.paper',
    mt: 'auto',
    fontSize: 12,
    lineHeight: '20px',
    color: 'text.secondary',
    px: mobile ? 2 : 0,
    pb: mobile ? 1 : 0,
    '& a': {
      color: 'text.secondary',
      textDecoration: 'none',
    }
  }}>
    {mobile ? <>
      {footerSetting?.footer_style === 'complex' && showBrand && <Box sx={{ pt: 5, pb: 2 }}>
        <Box sx={{ mb: 3 }}>
          <Stack direction={'row'} alignItems={'center'} gap={1}>
            {footerSetting?.brand_logo && !logoError && (
              <SafeImage 
                src={footerSetting.brand_logo}
                alt="Brand Logo"
                width={24} 
                height={24}
                onError={() => setLogoError(true)}
              />
            )}
            <Box sx={{ fontWeight: 'bold', lineHeight: '32px', fontSize: 24, color: 'text.primary' }}>{footerSetting?.brand_name}</Box>
          </Stack>
          {footerSetting?.brand_desc && <Box sx={{ fontSize: 12, color: 'text.secondary', lineHeight: '26px', ml: footerSetting?.brand_logo && !logoError ? 4 : 0, mt: 2 }}>
            {footerSetting.brand_desc}
          </Box>}
        </Box>
        <Stack direction={'row'} flexWrap={'wrap'} gap={2}>
          {footerSetting?.brand_groups?.map((group: any, idx: number) => (
            <Stack gap={1} key={group.name} sx={{
              fontSize: 14,
              lineHeight: '22px',
              width: 'calc(50% - 8px)',
              ...(idx > 1 && {
                mt: 1,
              }),
              '& a:hover': {
                color: 'primary.main',
              }
            }}>
              <Box sx={{ fontSize: 14, lineHeight: '24px', mb: 1, color: 'text.primary' }}>{group.name}</Box>
              {group.links?.map((link: any) => (
                <Link href={link.url} target='_blank' key={link.name}>{link.name}</Link>
              ))}
            </Stack>
          ))}
        </Stack>
      </Box>}
      {!!footerSetting?.corp_name && <Box sx={{ height: 40, lineHeight: '40px', color: 'text.tertiary' }}>
        {footerSetting?.corp_name}
      </Box>}
      <Divider sx={{ borderColor: 'divider' }} />
      <Stack direction={'row'} justifyContent={'space-between'} alignItems={'center'} sx={{ py: 1 }}>
        <Box sx={{ fontSize: 10 }}>
          © 2025 中澄控股 保留所有权利
        </Box>
        <Stack direction={'row'} alignItems={'center'} gap={0.5} sx={{
          color: 'text.tertiary',
          fontWeight: 'bold',
          fontSize: 10,
          '& a': {
            color: 'text.tertiary',
            textDecoration: 'none',
          }
        }}>
          <SafeImage src="/logo.png" alt="PandaWiki" width={16} height={16} />
          <Box sx={{ fontWeight: 'bold' }}>PandaWiki</Box>
        </Stack>
      </Stack>
    </> : <>
      {footerSetting?.footer_style === 'complex' && showBrand && <Box sx={{ py: 6 }}>
        <Stack direction={'row'} justifyContent={'space-between'} gap={10}>
          <Box sx={{ width: '30%', minWidth: 200 }}>
            {footerSetting?.brand_name && <Stack direction={'row'} alignItems={'center'} gap={1} sx={{ mb: 2 }}>
              {footerSetting?.brand_logo && !logoError && (
                <SafeImage 
                  src={footerSetting.brand_logo}
                  alt="Brand Logo"
                  width={24} 
                  height={24}
                  onError={() => setLogoError(true)}
                />
              )}
              <Box sx={{ fontWeight: 'bold', lineHeight: '32px', fontSize: 20, color: 'text.primary' }}>{footerSetting?.brand_name}</Box>
            </Stack>}
            {footerSetting?.brand_desc && <Box sx={{ fontSize: 12, lineHeight: '26px' }}>
              {footerSetting.brand_desc}
            </Box>}
          </Box>
          <Stack direction={'row'} justifyContent={'flex-end'} gap={15}>
            {footerSetting?.brand_groups?.map((group: any) => (
              <Stack gap={1} key={group.name} sx={{
                fontSize: 14,
                lineHeight: '22px',
                '& a:hover': {
                  color: 'primary.main',
                }
              }}>
                <Box sx={{ fontSize: 14, lineHeight: '24px', mb: 1, color: 'text.primary' }}>{group.name}</Box>
                {group.links?.map((link: any) => (
                  <Link href={link.url} target='_blank' key={link.name}>{link.name}</Link>
                ))}
              </Stack>
            ))}
          </Stack>
        </Stack>
      </Box>}
      <Divider sx={{ borderColor: 'divider' }} />
      <Stack direction={'row'} justifyContent={'space-between'} alignItems={'center'} sx={{ py: 2, px: 4 }}>
        <Box>
          © 2025 中澄控股 保留所有权利
        </Box>
        <Stack direction={'row'} alignItems={'center'} gap={0.5} sx={{
          color: 'text.tertiary',
          fontWeight: 'bold',
          '& a': {
            color: 'text.tertiary',
            textDecoration: 'none',
          }
        }}>
          <SafeImage src="/logo.png" alt="PandaWiki" width={16} height={16} />
          <Box sx={{ fontWeight: 'bold' }}>PandaWiki</Box>
        </Stack>
      </Stack>
    </>}
  </Box>
}

export default Footer