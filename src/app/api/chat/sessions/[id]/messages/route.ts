import { chatService } from '@/services/chat-service';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit');
    const limitNumber = limit ? parseInt(limit) : undefined;

    const messages = await chatService.getMessages(id, limitNumber);

    return NextResponse.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch messages',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { content, role = 'user', attachments } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Message content is required',
        },
        { status: 400 }
      );
    }

    const message = await chatService.sendMessage(id, content.trim(), role, attachments);

    return NextResponse.json(
      {
        success: true,
        data: message,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send message',
      },
      { status: 500 }
    );
  }
}
