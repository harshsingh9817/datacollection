
// This file is temporarily unused as image functionality has been removed.
// It can be deleted or kept for future re-integration of Firebase Storage.

/*
'use client';

import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { app } from '@/lib/firebase'; // Your Firebase app initialization
import { toast } from '@/hooks/use-toast';

const storage = getStorage(app);

export const uploadFileToFirebaseStorage = async (file: File, path: string): Promise<string> => {
  // console.log(`FirebaseStorage: Attempting to upload file to path: ${path}`);
  // const storageRef = ref(storage, path);
  // try {
  //   const snapshot = await uploadBytes(storageRef, file, {
  //     contentType: file.type,
  //   });
  //   const downloadURL = await getDownloadURL(snapshot.ref);
  //   // console.log(`FirebaseStorage: File uploaded successfully to ${path}. URL: ${downloadURL}`);
  //   return downloadURL;
  // } catch (error) {
  //   // console.error(`FirebaseStorage: Error uploading file to ${path}:`, error);
  //   toast({
  //     variant: 'destructive',
  //     title: 'Upload Failed',
  //     description: `Could not upload file to Firebase Storage. ${error instanceof Error ? error.message : String(error)}`,
  //   });
  //   throw error;
  // }
  throw new Error("Firebase Storage functionality is temporarily disabled.");
};

export const deleteFileFromFirebaseStorage = async (filePath: string): Promise<void> => {
  // if (!filePath) {
  //   // console.warn('FirebaseStorage: deleteFileFromFirebaseStorage called with no filePath.');
  //   return;
  // }
  // // console.log(`FirebaseStorage: Attempting to delete file from path: ${filePath}`);
  // const storageRef = ref(storage, filePath);
  // try {
  //   await deleteObject(storageRef);
  //   // console.log(`FirebaseStorage: File deleted successfully from ${filePath}`);
  // } catch (error: any) {
  //   if (error.code === 'storage/object-not-found') {
  //     // console.warn(`FirebaseStorage: File not found for deletion at ${filePath}. This might be expected.`);
  //   } else {
  //     // console.error(`FirebaseStorage: Error deleting file from ${filePath}:`, error);
  //     toast({
  //       variant: 'destructive',
  //       title: 'Deletion Failed',
  //       description: `Could not delete file from Firebase Storage. ${error instanceof Error ? error.message : String(error)}`,
  //     });
  //   }
  // }
   console.warn("Firebase Storage functionality (delete) is temporarily disabled.");
};
*/
export {}; // Keep file as a module
