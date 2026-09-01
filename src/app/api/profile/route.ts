import { NextRequest } from 'next/server';
import { POST as updateProfileHandler } from './update/route';

export async function POST(request: NextRequest) {
  return updateProfileHandler(request);
}

export async function PUT(request: NextRequest) {
  return updateProfileHandler(request);
}

export async function PATCH(request: NextRequest) {
  return updateProfileHandler(request);
}
