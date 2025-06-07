import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/firebase/auth-middleware';
import { firebaseAdmin } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface RouteContext {
  params: { projectId: string };
}

export const GET = withAuth(async (request: NextRequest, user, { params }: RouteContext) => {
  try {
    const { projectId } = params;
    const db = firebaseAdmin.getFirestore();
    
    const projectDoc = await db.collection('projects').doc(projectId).get();
    
    if (!projectDoc.exists) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const projectData = projectDoc.data();
    
    // Check if user has access to this project
    if (
      projectData?.ownerUid !== user.uid &&
      !projectData?.collaborators?.[user.uid]
    ) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      project: { id: projectDoc.id, ...projectData },
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const PUT = withAuth(async (request: NextRequest, user, { params }: RouteContext) => {
  try {
    const { projectId } = params;
    const updateData = await request.json();
    const db = firebaseAdmin.getFirestore();
    
    const projectRef = db.collection('projects').doc(projectId);
    const projectDoc = await projectRef.get();
    
    if (!projectDoc.exists) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const projectData = projectDoc.data();
    
    // Check if user has edit permissions
    const userRole = projectData?.collaborators?.[user.uid];
    if (
      projectData?.ownerUid !== user.uid &&
      !['owner', 'editor'].includes(userRole)
    ) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Sanitize update data
    const allowedFields = ['name', 'description', 'settings', 'indexingStatus'];
    const sanitizedUpdate: any = {
      updatedAt: new Date(),
    };

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        sanitizedUpdate[field] = updateData[field];
      }
    }

    await projectRef.update(sanitizedUpdate);

    return NextResponse.json({
      message: 'Project updated successfully',
    });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const DELETE = withAuth(async (request: NextRequest, user, { params }: RouteContext) => {
  try {
    const { projectId } = params;
    const db = firebaseAdmin.getFirestore();
    
    const projectRef = db.collection('projects').doc(projectId);
    const projectDoc = await projectRef.get();
    
    if (!projectDoc.exists) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const projectData = projectDoc.data();
    
    // Only owner can delete project
    if (projectData?.ownerUid !== user.uid) {
      return NextResponse.json(
        { error: 'Only project owner can delete project' },
        { status: 403 }
      );
    }

    await projectRef.delete();

    return NextResponse.json({
      message: 'Project deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});