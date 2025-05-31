
export interface Student {
  id: string; // Firestore document ID
  userId: string; // Firebase Auth User ID
  name: string;
  fatherName: string;
  className: string;
  rollNumber: string;
  dateOfBirth: string; // Store as YYYY-MM-DD for easier input binding
  address: string;
  contactNumber: string;
  schoolId: string; // ID of the school this student belongs to
  photoAppwriteId?: string; // Appwrite File ID for student's photo (full path within the bucket)
}

export interface ClassData {
  id: string;
  name: string;
}

export interface School {
  id: string; // Firestore document ID
  userId: string; // Firebase Auth User ID
  name:string;
  // appwriteBucketId: string; // Removed: No longer storing per-school bucket ID
  classNames: string[];
}

export const DEFAULT_PLACEHOLDER_IMAGE_URL = "https://placehold.co/80x80.png?text=No+Photo";

export interface UserProfile {
  id: string; // Same as Firebase Auth User ID (uid)
  email: string;
  name: string; // User's full name
}

// Predefined classes
export const PREDEFINED_CLASSES = [
  "Nursery", "LKG", "UKG",
  "1st Grade", "2nd Grade", "3rd Grade", "4th Grade", "5th Grade",
  "6th Grade", "7th Grade", "8th Grade", "9th Grade", "10th Grade",
  "11th Grade", "12th Grade"
];

