import { RecommendNode } from "@/assets/type";
import { useStore } from "@/provider";
import { Stack, Box, Typography } from "@mui/material";
import { useMemo } from "react";
import NodeCard from "./NodeCard";

const NodeList = () => {
  const { mobile = false, nodeList } = useStore()

  // 防御性去重，确保不会出现重复的key
  const uniqueNodeList = useMemo(() => {
    if (!nodeList) return undefined;
    
    const map = new Map<string, typeof nodeList[0]>();
    nodeList.forEach(node => map.set(node.id, node));
    return Array.from(map.values());
  }, [nodeList]);

  return (
    <Box sx={{ mt: mobile ? 3 : 4 }}>
      {uniqueNodeList && uniqueNodeList.length > 0 ? (
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: mobile ? '16px' : '16px',
            justifyContent: mobile ? 'center' : 'flex-start',
          }}
        >
          {uniqueNodeList.map((node) => (
            <NodeCard key={node.id} node={node} />
          ))}
        </Box>
      ) : (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "200px",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            暂无内容
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default NodeList;