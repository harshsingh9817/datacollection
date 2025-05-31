// This file is no longer used as ImageKit is being replaced by Appwrite.
// It can be deleted.
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ error: 'ImageKit delete endpoint is deprecated.' }, { status: 404 });
}
