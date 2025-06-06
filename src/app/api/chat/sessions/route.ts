import { NextRequest, NextResponse } from 'next/server';
import { chatService } from '@/services/chat-service';
import { ChatSettings } from '@/types/chat';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const provider = searchParams.get('provider') || undefined;
    const starred = searchParams.get('starred');
    const archived = searchParams.get('archived');
    const search = searchParams.get('search') || undefined;

    const filters = {
      provider,
      starred: starred ? starred === 'true' : undefined,
      archived: archived ? archived === 'true' : undefined,
      searchQuery: search
    };

    const sessions = await chatService.listSessions(filters);
    
    return NextResponse.json({ 
      success: true, 
      data: sessions 
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch sessions' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, model, name, settings } = body;

    if (!provider || !model) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Provider and model are required' 
        },
        { status: 400 }
      );
    }

    const session = await chatService.createSession(
      provider,
      model,
      name,
      settings as Partial<ChatSettings>
    );

    return NextResponse.json({ 
      success: true, 
      data: session 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create session' 
      },
      { status: 500 }
    );
  }
}
