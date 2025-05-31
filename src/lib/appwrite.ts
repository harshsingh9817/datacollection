
'use client';

import { Client, Storage, ID } from 'appwrite';
import { slugify } from '@/lib/utils';

// Log environment variables at module load time for easier debugging
console.log("[Appwrite Module Load] Appwrite SDK Init: Raw NEXT_PUBLIC_APPWRITE_ENDPOINT =", process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT);
console.log("[Appwrite Module Load] Appwrite SDK Init: Raw NEXT_PUBLIC_APPWRITE_PROJECT_ID =", process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);
console.log("[Appwrite Module Load] Appwrite SDK Init: Raw NEXT_PUBLIC_APPWRITE_STUDENT_PHOTOS_BUCKET_ID =", process.env.NEXT_PUBLIC_APPWRITE_STUDENT_PHOTOS_BUCKET_ID);

const appwriteEndpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const appwriteProjectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
export const studentPhotosBucketId = process.env.NEXT_PUBLIC_APPWRITE_STUDENT_PHOTOS_BUCKET_ID;

let client: Client | null = null;
let storage: Storage | null = null;

if (appwriteEndpoint && appwriteProjectId && studentPhotosBucketId) {
  try {
    client = new Client();
    client.setEndpoint(appwriteEndpoint).setProject(appwriteProjectId);
    storage = new Storage(client);
    console.log(
      `[Appwrite Module Load] Appwrite SDK: Initialized successfully. Endpoint: "${appwriteEndpoint}", Project ID: "${appwriteProjectId}", Student Photos Bucket ID: "${studentPhotosBucketId}"`
    );
  } catch (error) {
    console.error("[Appwrite Module Load] Appwrite SDK: Error during client initialization:", error);
    client = null;
    storage = null;
  }
} else {
  console.warn(
    "[Appwrite Module Load] Appwrite SDK: NOT Initialized due to missing configuration (Endpoint, Project ID, or Student Photos Bucket ID). Please check .env variables (NEXT_PUBLIC_APPWRITE_...) and restart your Next.js server."
  );
  if (!appwriteEndpoint) console.warn("[Appwrite Module Load] Appwrite SDK Init Problem: NEXT_PUBLIC_APPWRITE_ENDPOINT is missing or undefined.");
  if (!appwriteProjectId) console.warn("[Appwrite Module Load] Appwrite SDK Init Problem: NEXT_PUBLIC_APPWRITE_PROJECT_ID is missing or undefined.");
  if (!studentPhotosBucketId) console.warn("[Appwrite Module Load] Appwrite SDK Init Problem: NEXT_PUBLIC_APPWRITE_STUDENT_PHOTOS_BUCKET_ID is missing or undefined.");
}

// Log final status of SDK instances after initialization block
console.log("[Appwrite Module Status] After initialization block:");
console.log("  - Parsed appwriteEndpoint variable:", appwriteEndpoint);
console.log("  - Parsed appwriteProjectId variable:", appwriteProjectId);
console.log("  - Parsed studentPhotosBucketId variable:", studentPhotosBucketId);
console.log("  - Appwrite client instance (client):", client ? 'Exists' : 'null');
console.log("  - Appwrite storage instance (storage):", storage ? 'Exists' : 'null');


export const uploadFileToAppwriteStorage = async (
  file: File,
  schoolNameForPath: string, 
  classNameForPath: string,
): Promise<string> => { // Returns the Appwrite File $id
  
  if (!storage) {
    const errorMessage = "Appwrite Storage service not initialized. Cannot upload file. Check .env variables and server restart.";
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
  if (!studentPhotosBucketId) {
    const errorMessage = "Appwrite Student Photos Bucket ID not configured. Cannot upload file. Check NEXT_PUBLIC_APPWRITE_STUDENT_PHOTOS_BUCKET_ID in .env and restart server.";
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  try {
    const slugSchoolName = slugify(schoolNameForPath);
    const slugClassName = slugify(classNameForPath);
    
    // The desired "folder" path and filename for the object in Appwrite storage
    const originalFileName = file.name;
    const desiredObjectName = `schools/${slugSchoolName}/${slugClassName}/${originalFileName}`;

    // Create a new File object with the modified name that includes the path
    // This is what Appwrite will use as the 'name' of the stored file object.
    const fileToUpload = new File([file], desiredObjectName, { type: file.type });

    const appwriteGeneratedFileId = ID.unique(); // Use Appwrite's unique ID generator for the fileId parameter

    console.log(
      `Appwrite Upload: Attempting to upload.
       Original Filename from input: "${file.name}"
       Constructed Object Name for Appwrite: "${fileToUpload.name}"
       Generated Appwrite File ID (for $id parameter): "${appwriteGeneratedFileId}"
       Target Bucket ID: "${studentPhotosBucketId}"`
    );
    
    const response = await storage.createFile(
      studentPhotosBucketId,      // bucketId
      appwriteGeneratedFileId,    // fileId - This MUST be unique and <= 36 chars.
      fileToUpload                // File object. Appwrite uses fileToUpload.name for the stored object's name/path.
    );
    
    console.log('Appwrite Upload: File uploaded successfully. Response $id:', response.$id, "Response name:", response.name);
    // response.$id will be the appwriteGeneratedFileId
    // response.name will be the desiredObjectName
    return response.$id; // Store the unique Appwrite $id in Firestore
  } catch (error: any) {
    console.error("Appwrite Raw Error during upload (see details below):", error);
    console.log("Appwrite Error Type:", error?.constructor?.name);
    try {
      console.log("Appwrite Error (JSON.stringify):", JSON.stringify(error));
    } catch (e) {
      console.log("Appwrite Error: Could not stringify error object.");
    }
    
    let errorMessage = "An unknown error occurred during Appwrite upload.";
    if (error) {
        if (error.message) {
            errorMessage = error.message;
             if (error.message.toLowerCase().includes("failed to fetch")) {
                 errorMessage += " This often indicates a CORS issue. Please ensure your Appwrite project platform (hostname) is correctly set up for your Next.js app's origin, AND check your browser's network tab for more details on the failed fetch.";
            }
        } else if (typeof error === 'string') {
            errorMessage = error;
        } else if (error.type === 'general_storage_file_too_large' || (error.response && error.response.type === 'general_storage_file_too_large') ) {
            errorMessage = `The file is too large. Appwrite server rejected it. Maximum size: ${error.response?.message || 'unknown'}.`;
        } else if (error.response && error.response.message) {
            errorMessage = error.response.message;
        }
    }
    
    console.error(`Appwrite Upload Error: Processed Error for original filename "${file.name}", constructed object name "${`schools/${slugify(schoolNameForPath)}/${slugify(classNameForPath)}/${file.name}`}" :`, errorMessage);
    throw new Error(`Appwrite: Upload failed: ${errorMessage}`);
  }
};

export const getAppwritePreviewUrl = (fileId: string): string | null => {
  if (!storage || !studentPhotosBucketId) {
    console.warn('Appwrite SDK or Student Photos Bucket ID not initialized, cannot get preview URL. Check env vars and restart server.');
    return null;
  }
  if (!fileId) {
    console.warn('Appwrite: getAppwritePreviewUrl called with no fileId.');
    return null;
  }
  try {
     const urlObject = storage.getFileView(studentPhotosBucketId, fileId);
     // For public files, getFileView provides a direct link.
     // If files were private, getFilePreview would generate a temporary signed URL.
     return urlObject.href;
  } catch (error){
    console.error(`Appwrite: Error getting file view URL object for fileId "${fileId}" in bucket "${studentPhotosBucketId}":`, error);
    return null;
  }
};

export const deleteFileFromAppwriteStorage = async (fileId: string): Promise<void> => {
  if (!storage) {
    console.warn('Appwrite Storage service not initialized, cannot delete file. Check env vars and restart server.');
    return;
  }
   if (!studentPhotosBucketId) {
    console.warn('Appwrite Student Photos Bucket ID not configured. Cannot delete file.');
    return;
  }
  if (!fileId) {
    console.warn('Appwrite: deleteFileFromAppwriteStorage called with no fileId (this is the $id from Appwrite).');
    return;
  }
  try {
    console.log(`Appwrite Delete: Attempting to delete file with $id "${fileId}" from bucket "${studentPhotosBucketId}".`);
    await storage.deleteFile(studentPhotosBucketId, fileId); // fileId here is the $id
    console.log(`Appwrite Delete: File with $id "${fileId}" deleted successfully from bucket "${studentPhotosBucketId}".`);
  } catch (error) {
    console.warn(`Appwrite Delete: Error or issue deleting file with $id "${fileId}" from bucket "${studentPhotosBucketId}":`, error);
    // Common for delete to fail if file doesn't exist (e.g., already deleted), so a warning is often sufficient.
  }
};

export { client as appwriteClient, storage as appwriteStorageService };

    