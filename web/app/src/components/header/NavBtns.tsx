import { KBDetail } from "@/assets/type";
import SafeImage from "@/components/SafeImage";
import { Box, Button, Divider, Menu, MenuItem, Stack } from "@mui/material";
import { IconMore } from "../icons";
import { Fragment, useState } from "react";

type NavBtnsProps = {
  detail?: KBDetail | null
}

const NavBtns = ({ detail }: NavBtnsProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const btns = detail?.settings?.btns || []

  if (btns.length === 0) return null

  return <>
    <Button
      id="nav-btns-button"
      aria-controls={open ? 'nav-btns-menu' : undefined}
      aria-haspopup="true"
      aria-expanded={open ? 'true' : undefined}
      onClick={handleClick}
      sx={{ minWidth: 'auto', p: 1 }}
    >
      <IconMore />
    </Button>
    <Menu
      id="nav-btns-menu"
      anchorEl={anchorEl}
      open={open}
      onClose={handleClose}
      MenuListProps={{
        'aria-labelledby': 'nav-btns-button',
      }}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
    >
      {btns.map((item, index) => <Fragment key={index}>
        <MenuItem onClick={handleClose} sx={{ py: 1 }}>
          <a href={item.url} target={item.target} style={{ textDecoration: 'none', color: 'inherit', width: '100%' }}>
            <Stack direction="row" alignItems="center" gap={1.5}>
              {item.showIcon && item.icon && (
                <SafeImage 
                  src={item.icon} 
                  alt='icon' 
                  width={20} 
                  height={20}
                />
              )}
              <Box>{item.text}</Box>
            </Stack>
          </a>
        </MenuItem>
        {index < btns.length - 1 && <Divider />}
      </Fragment>)}
    </Menu>
  </>
}

export default NavBtns;