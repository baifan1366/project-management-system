import { NextResponse } from 'next/server';
import { getAvailableModels } from '../../../../[locale]/ai-workflow/workflow-service';

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: userId is required' }, { status: 401 });
    }
    
    const models = getAvailableModels();
    
    return NextResponse.json(models);
  } catch (error) {
    console.error('Error fetching models:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch models' }, 
      { status: 500 }
    );
  }
} 