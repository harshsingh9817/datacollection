
'use server';

import { generateIdCard, type GenerateIdCardInput, type GenerateIdCardOutput } from '@/ai/flows/generate-id-card';
import { getAppwritePreviewUrl } from '@/lib/appwrite'; 
import type { School, Student } from '@/lib/types'; // Student is needed for student photo
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ActionResult {
  success: boolean;
  data?: GenerateIdCardOutput;
  error?: string;
}

// Function to fetch an image from a URL and convert it to a Data URI
async function imageUrlToDataUri(imageUrl: string): Promise<string> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image from ${imageUrl}: ${response.statusText}`);
    }
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg'; 
    const base64String = Buffer.from(imageBuffer).toString('base64');
    return `data:${contentType};base64,${base64String}`;
  } catch (error) {
    console.error(`[Action] Error converting image URL to Data URI for ${imageUrl}:`, error);
    // Fallback to a placeholder if fetching fails
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  }
}

export async function handleGenerateIdCardAction(
  input: Omit<GenerateIdCardInput, 'schoolLogoDataUri' | 'studentPhotoDataUri'> & { studentPhotoAppwriteId?: string; schoolId: string; userId: string }
): Promise<ActionResult> {
  try {
    const placeholderDataUri = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    
    let studentPhotoDataUri = placeholderDataUri;
    if (input.studentPhotoAppwriteId) {
        const appwritePhotoUrl = getAppwritePreviewUrl(input.studentPhotoAppwriteId);
        if (appwritePhotoUrl) {
            console.log(`[Action] Student photo Appwrite ID: ${input.studentPhotoAppwriteId}. URL: ${appwritePhotoUrl}. Fetching...`);
            studentPhotoDataUri = await imageUrlToDataUri(appwritePhotoUrl);
        } else {
            console.log("[Action] Could not get Appwrite URL for student photo. Using placeholder.");
        }
    } else {
      console.log("[Action] No student photo Appwrite ID provided. Using placeholder Data URI for student photo.");
    }
    
    // School logo is always placeholder as it's removed from school data
    const schoolLogoDataUri = placeholderDataUri; 

    const aiInput: GenerateIdCardInput = {
      schoolName: input.schoolName,
      studentName: input.studentName,
      fatherName: input.fatherName,
      className: input.className,
      rollNumber: input.rollNumber,
      dateOfBirth: input.dateOfBirth,
      address: input.address,
      contactNumber: input.contactNumber,
      schoolLogoDataUri: schoolLogoDataUri, 
      studentPhotoDataUri: studentPhotoDataUri, 
    };
    
    console.log("[Action] Calling generateIdCard flow with input:", { 
        ...aiInput, 
        schoolLogoDataUri: 'placeholder...', 
        studentPhotoDataUri: input.studentPhotoAppwriteId ? 'converted_appwrite_data_uri_or_placeholder_on_fail' : 'placeholder...' 
    });
    const result = await generateIdCard(aiInput);
    return { success: true, data: result };
  } catch (error) {
    console.error("[Action] Error generating ID card via server action:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "An unknown error occurred during ID card generation." };
  }
}
