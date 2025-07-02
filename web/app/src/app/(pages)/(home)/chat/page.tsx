'use client'

import Footer from "@/components/footer";
import Header from "@/components/header";
import { useStore } from "@/provider";
import Chat from "@/views/chat";
import Catalog from "@/views/node/Catalog";
import CatalogH5 from "@/views/node/CatalogH5";
import { Box } from "@mui/material";

const ChatPage = () => {
  const { mobile, nodeList } = useStore();

  return <Box sx={{
    position: 'relative',
    bgcolor: 'background.default',
  }}>
    {!mobile && <Catalog />}
    {mobile && nodeList && <CatalogH5 nodes={nodeList} />}
    <Header />
    <Chat />
    <Footer />
  </Box>
};

export default ChatPage;
