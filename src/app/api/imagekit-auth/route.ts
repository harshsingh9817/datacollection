// This file is no longer used as ImageKit is being replaced by Appwrite.
// It can be deleted.
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ error: 'ImageKit auth endpoint is deprecated.' }, { status: 404 });
}
