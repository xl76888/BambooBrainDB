import { NextRequest, NextResponse } from 'next/server';
import { apiClient } from '@/api';

export async function GET(request: NextRequest) {
  const kb_id = request.headers.get('x-kb-id');
  const authToken = request.headers.get('x-simple-auth-password') || '';
  
  if (!kb_id) {
    return NextResponse.json(
      { success: false, message: 'KB ID is required' },
      { status: 400 }
    );
  }

  try {
    const baseURL = process.env.BACKEND_URL || 'http://localhost:8001';
    const result = await apiClient.serverGetNodeList(kb_id, authToken, baseURL);
    
    if (result.error) {
      return NextResponse.json(
        { success: false, message: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 