import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/firebase/auth-middleware';
import { firebaseAdmin } from '@/lib/firebase/admin';

export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const projects = await firebaseAdmin.getUserProjects(user.uid);
    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const projectData = await request.json();

    // Validate required fields
    if (!projectData.name) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    const result = await firebaseAdmin.createProject(projectData, user.uid);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create project' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      projectId: result.projectId,
      message: 'Project created successfully',
    });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});