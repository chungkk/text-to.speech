import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Project from '@/models/Project';

// GET all projects
export async function GET() {
  try {
    await connectDB();
    const projects = await Project.find().sort({ updatedAt: -1 });
    
    return NextResponse.json({
      success: true,
      data: projects,
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Không thể lấy danh sách dự án',
      },
      { status: 500 }
    );
  }
}

// POST create new project
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    
    const { name, description, originalText, chunks, voiceId, voiceSettings } = body;
    
    if (!name || !originalText) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tên dự án và text là bắt buộc',
        },
        { status: 400 }
      );
    }
    
    const project = await Project.create({
      name,
      description,
      originalText,
      chunks: chunks || [],
      voiceId,
      voiceSettings,
    });
    
    return NextResponse.json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Không thể tạo dự án',
      },
      { status: 500 }
    );
  }
}
