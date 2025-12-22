import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Project from '@/models/Project';
import { promises as fs } from 'fs';
import path from 'path';

// POST: Save audio file for a specific chunk in a project
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { id: projectId } = await params;
    const formData = await request.formData();
    const chunkIndex = parseInt(formData.get('chunkIndex') as string);
    const audioFile = formData.get('audioFile') as Blob;
    const audioDuration = parseFloat(formData.get('audioDuration') as string);
    
    if (isNaN(chunkIndex) || !audioFile) {
      return NextResponse.json(
        { success: false, error: 'Missing chunkIndex or audioFile' },
        { status: 400 }
      );
    }
    
    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }
    
    if (chunkIndex < 0 || chunkIndex >= project.chunks.length) {
      return NextResponse.json(
        { success: false, error: 'Invalid chunk index' },
        { status: 400 }
      );
    }
    
    // Create project audio directory
    const projectAudioDir = path.join(
      process.cwd(),
      'public',
      'project-audio',
      projectId
    );
    await fs.mkdir(projectAudioDir, { recursive: true });
    
    // Save audio file
    const fileName = `chunk-${chunkIndex}-${Date.now()}.mp3`;
    const filePath = path.join(projectAudioDir, fileName);
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    await fs.writeFile(filePath, audioBuffer);
    
    // Update project in database
    const audioUrl = `/project-audio/${projectId}/${fileName}`;
    project.chunks[chunkIndex].audioUrl = audioUrl;
    project.chunks[chunkIndex].audioSize = audioBuffer.length;
    project.chunks[chunkIndex].audioDuration = audioDuration;
    
    await project.save();
    
    console.log(`✓ Saved audio for project ${projectId}, chunk ${chunkIndex}: ${audioUrl}`);
    
    return NextResponse.json({
      success: true,
      data: {
        audioUrl,
        audioSize: audioBuffer.length,
        audioDuration,
      },
    });
  } catch (error) {
    console.error('Error saving project audio:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save audio' },
      { status: 500 }
    );
  }
}
