import { apiClient } from "@/api";
import { formatMeta } from "@/utils";
import Doc from "@/views/node";
import { ResolvingMetadata } from "next";
import { cookies, headers } from "next/headers";

export async function generateMetadata(
  { params }: any,
  parent: ResolvingMetadata
) {
  const { id } = params;
  const headersList = await headers();
  const kb_id = headersList.get('x-kb-id') || process.env.DEV_KB_ID || '';
  const cookieStore = await cookies()
  const authToken = cookieStore.get(`auth_${kb_id}`)?.value || '';
  const node = await getNodeDetail(id, kb_id, authToken);
  return await formatMeta(
    { title: node?.name },
    parent
  );
}

async function getNodeDetail(id: string, kb_id: string, authToken: string) {
  const result = await apiClient.serverGetNodeDetail(id, kb_id, authToken);
  if (result.error) {
    console.error('ss Error fetching document content:', result.error);
    return undefined;
  }
  return result.data;
}

const DocPage = async ({ params }: any) => {
  const { id = '' } = params

  const headersList = await headers()
  const cookieStore = await cookies()
  const kb_id = headersList.get('x-kb-id') || process.env.DEV_KB_ID || ''
  const authToken = cookieStore.get(`auth_${kb_id}`)?.value || '';

  const node = await getNodeDetail(id, kb_id, authToken)

  return <Doc node={node} token={authToken} />
};

export default DocPage;
