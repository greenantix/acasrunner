import { NextRequest, NextResponse } from 'next/server';
import { InsightsEngine } from '@/services/analytics/insights-engine';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const impact = searchParams.get('impact');
    const effort = searchParams.get('effort');
    
    const insightsEngine = InsightsEngine.getInstance();
    
    // Generate optimizations
    const optimizations = await insightsEngine.suggestOptimizations();
    
    // Apply filters
    let filteredOptimizations = optimizations;
    
    if (category) {
      filteredOptimizations = filteredOptimizations.filter(opt => opt.category === category);
    }
    
    if (impact) {
      filteredOptimizations = filteredOptimizations.filter(opt => opt.impact === impact);
    }
    
    if (effort) {
      filteredOptimizations = filteredOptimizations.filter(opt => opt.effort === effort);
    }
    
    // Sort by impact (high first) and effort (low first)
    filteredOptimizations.sort((a, b) => {
      const impactOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      const effortOrder = { 'low': 3, 'medium': 2, 'high': 1 };
      
      const impactDiff = impactOrder[b.impact as keyof typeof impactOrder] - impactOrder[a.impact as keyof typeof impactOrder];
      if (impactDiff !== 0) return impactDiff;
      
      return effortOrder[b.effort as keyof typeof effortOrder] - effortOrder[a.effort as keyof typeof effortOrder];
    });
    
    return NextResponse.json({
      success: true,
      data: {
        optimizations: filteredOptimizations,
        total: optimizations.length,
        filtered: filteredOptimizations.length,
        categories: [...new Set(optimizations.map(opt => opt.category))],
        impacts: [...new Set(optimizations.map(opt => opt.impact))],
        efforts: [...new Set(optimizations.map(opt => opt.effort))]
      }
    });
    
  } catch (error) {
    console.error('Error fetching optimizations:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch optimizations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { optimizationId, action, feedback } = body;
    
    if (!optimizationId || !action) {
      return NextResponse.json(
        { success: false, error: 'Optimization ID and action are required' },
        { status: 400 }
      );
    }
    
    // In a real implementation, this would update the database
    // For now, we'll just simulate the action
    
    switch (action) {
      case 'implement':
        console.log(`Marking optimization ${optimizationId} as implemented`);
        if (feedback) {
          console.log(`Implementation feedback: ${feedback}`);
        }
        break;
      case 'postpone':
        console.log(`Postponing optimization ${optimizationId}`);
        break;
      case 'reject':
        console.log(`Rejecting optimization ${optimizationId}`);
        if (feedback) {
          console.log(`Rejection reason: ${feedback}`);
        }
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
    
    return NextResponse.json({
      success: true,
      message: `Optimization ${action} successfully`,
      optimizationId
    });
    
  } catch (error) {
    console.error('Error updating optimization:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update optimization',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}