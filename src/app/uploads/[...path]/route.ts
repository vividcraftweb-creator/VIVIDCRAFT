import { NextResponse, type NextRequest } from 'next/server';
import { promises as fs } from 'fs';
import { join } from 'path';
import { createReadStream } from 'fs';

type RouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

function getMimeType(filename: string): string {
  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const resolvedParams = await context.params;
  const segments = resolvedParams.path;

  if (!segments || segments.length === 0) {
    return NextResponse.json({ error: 'File not specified' }, { status: 404 });
  }

  // Path validation to prevent directory traversal attacks
  if (segments.some((segment) => segment.includes('..') || segment.includes('\\') || segment.includes('/'))) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  // Validate that the path starts with allowed directories
  const firstSegment = segments[0];
  if (firstSegment !== 'documents' && firstSegment !== 'certifications') {
    return NextResponse.json({ error: 'Invalid directory' }, { status: 400 });
  }

  // Construct the file path from project root
  const filePath = join(process.cwd(), 'uploads', ...segments);

  try {
    // Check if file exists and is readable
    await fs.access(filePath);
    const stats = await fs.stat(filePath);

    // Ensure it's a file, not a directory
    if (!stats.isFile()) {
      return NextResponse.json({ error: 'Not a file' }, { status: 400 });
    }

    // Read the file
    const fileBuffer = await fs.readFile(filePath);
    const fileName = segments[segments.length - 1];
    const mimeType = getMimeType(fileName);

    // Return the file with appropriate headers
    // Convert Buffer to Uint8Array for NextResponse compatibility
    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': fileBuffer.byteLength.toString(),
        // Shorter cache than job-media to allow profile picture updates
        'Cache-Control': 'public, max-age=300, must-revalidate',
        'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
        // Add ETag for conditional requests
        'ETag': `"${stats.mtime.getTime()}-${stats.size}"`,
      },
    });
  } catch (error) {
    // File doesn't exist or other error
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
