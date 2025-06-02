'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import type { School, Student, UserProfile } from '@/lib/types';
import { auth, db } from '@/lib/firebase'; // Assuming auth and db are correctly exported
import { onAuthStateChanged, User as FirebaseUser, updateProfile } from 'firebase/auth';
import {
  collection,
  doc,
  addDoc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  writeBatch,
  getDoc,
  updateDoc,
  deleteField,
  // Timestamp, // Not used in this file
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
// Appwrite imports are fine if used, but not directly related to Firebase persistence
// import {
//   uploadFileToAppwriteStorage,
//   deleteFileFromAppwriteStorage,
//   getAppwritePreviewUrl,
// } from '@/lib/appwrite';

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'sunilkumarsingh817@gmail.com'; // Use environment variable

interface AppState {
  schools: School[];
  students: Student[];
  userProfiles: UserProfile[];
  addSchool: (schoolData: Omit<School, 'id' | 'userId'>, targetUserId?: string) => Promise<void>;
  updateSchool: (updatedSchoolData: Omit<School, 'userId'>, targetUserId?: string) => Promise<void>;
  deleteSchool: (schoolId: string, targetUserId?: string) => Promise<void>;
  addStudent: (studentData: Omit<Student, 'id' | 'userId' | 'photoAppwriteId'>, photoFile: File | null, schoolNameForPath: string, classNameForPath: string, targetUserId?: string) => Promise<void>;
  updateStudent: (updatedStudentData: Omit<Student, 'userId' | 'photoAppwriteId'> & { id: string, photoAppwriteId?: string}, photoFile: File | null, schoolNameForPath: string, classNameForPath: string, oldPhotoAppwriteIdToDelete?: string, targetUserId?: string) => Promise<void>;
  deleteStudent: (studentId: string, targetUserId?: string) => Promise<void>;
  updateSchoolClassNames: (schoolId: string, classNames: string[], targetUserId?: string) => Promise<void>;
  isLoading: boolean; // This seems to be for data loading, distinct from auth loading
  currentUser: FirebaseUser | null | undefined; // undefined: auth not checked yet, null: checked & no user
  loadingAuth: boolean; // Explicitly for initial auth state check
  isAdmin: boolean;
  logout: () => Promise<void>; // Added logout function definition
  fetchSchoolsForUser: (userId: string) => Promise<School[]>;
  fetchStudentsForClass: (userId: string, schoolId: string, className: string) => Promise<Student[]>;
  fetchSchoolByIdForUser: (userId: string, schoolId: string) => Promise<School | null>;
}

const AppStateContext = createContext<AppState | undefined>(undefined);

export const AppStateProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const [schools, setSchools] = useState<School[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true); // For general data loading
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null | undefined>(undefined); // Initial state: auth not yet checked
  const [loadingAuth, setLoadingAuth] = useState(true); // State for initial auth check
  const [isAdmin, setIsAdmin] = useState(false);

  const logOperationAttempt = useCallback(/* ... (your existing logOperationAttempt unchanged) ... */
  (
    operation: string,
    path: string,
    details: Record<string, any>,
    actingUser: FirebaseUser | null
  ) => {
    console.log(
      `%cAppStateContext: Attempting ${operation}`, "color: blue; font-weight: bold;",
      {
        path,
        actingUserUID: actingUser?.uid,
        actingUserEmail: actingUser?.email,
        actingUserEmailVerified: actingUser?.emailVerified,
        isAdminClientState: isAdmin,
        details,
        timestamp: new Date().toISOString()
      }
    );
  }, [isAdmin]);

  const ensureUserProfileExists = useCallback(async (user: FirebaseUser, nameFromSignup?: string) => {
    // ... (your existing ensureUserProfileExists unchanged, ensure it uses `auth.currentUser` if needed for operations) ...
    if (!user) return;
    const userProfileRef = doc(db, 'user_profiles', user.uid);
    logOperationAttempt('ensureUserProfileExists - getDoc', userProfileRef.path, { forUser: user.email }, user);
    try {
      const userProfileSnap = await getDoc(userProfileRef);
      const effectiveName = nameFromSignup || user.displayName || user.email?.split('@')[0] || 'New User';

      if (!userProfileSnap.exists()) {
        const profileData: UserProfile = { id: user.uid, email: user.email!, name: effectiveName };
        logOperationAttempt('ensureUserProfileExists - setDoc (create profile)', userProfileRef.path, profileData, user);
        await setDoc(userProfileRef, profileData);
        console.log(`%cAppStateContext: User profile CREATED for ${user.email} with name: ${effectiveName}`, "color: green;");
        if (user.displayName !== effectiveName && auth.currentUser === user) { // Check if this is the auth.currentUser before updating profile
          await updateProfile(user, { displayName: effectiveName });
        }
      } else {
        const existingProfileData = userProfileSnap.data() as UserProfile;
        let updates: Partial<UserProfile> = {};
        if ((!existingProfileData.name && effectiveName !== 'New User') || (existingProfileData.name !== effectiveName && effectiveName && effectiveName !== 'New User' )) {
            updates.name = effectiveName;
        }
        if (existingProfileData.email !== user.email && user.email) {
            updates.email = user.email;
        }
        if (Object.keys(updates).length > 0) {
            logOperationAttempt('ensureUserProfileExists - updateDoc (update profile)', userProfileRef.path, updates, user);
            await updateDoc(userProfileRef, updates);
            console.log(`%cAppStateContext: User profile UPDATED for ${user.email} with:`, "color: darkorange;", updates);
        }
        if (user.displayName !== (updates.name || existingProfileData.name) && (updates.name || existingProfileData.name) && auth.currentUser === user) {
            await updateProfile(user, { displayName: (updates.name || existingProfileData.name) });
        }
      }
    } catch (error) {
      console.error(`%cAppStateContext: Error ensuring user profile for ${user.email}:`, "color: red;", error);
      toast({ variant: "destructive", title: "Profile Error", description: `Could not ensure user profile exists. ${error instanceof Error ? error.message : String(error)}` });
    }
  }, [toast, logOperationAttempt]);

  // Auth state listener - CORE FOR PERSISTENT LOGIN
  useEffect(() => {
    console.log("%cAppStateContext: Setting up onAuthStateChanged listener.", "color: orange;");
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const isUserAdminEmail = user.email === ADMIN_EMAIL;
        // Admin check as per your existing logic
        const newIsAdmin = isUserAdminEmail; // && user.emailVerified; (removed emailVerified check for admin)

        console.log(
            `%cAppStateContext: Auth state CHANGED. User Authenticated - UID: ${user.uid}, Email: ${user.email}. CHECKING ADMIN STATUS:
            - User Email: ${user.email}
            - ADMIN_EMAIL constant: ${ADMIN_EMAIL}
            - User Email Matches ADMIN_EMAIL?: ${isUserAdminEmail}
            - User Email Verified (from Firebase): ${user.emailVerified}
            - RESULTING isAdmin state: ${newIsAdmin}`,
            "color: green; font-weight: bold;"
        );
        setCurrentUser(user);
        setIsAdmin(newIsAdmin);
        await ensureUserProfileExists(user, user.displayName || undefined);
      } else {
        console.log("%cAppStateContext: Auth state CHANGED. No Firebase user authenticated. Clearing user-related states.", "color: orange; font-weight: bold;");
        setCurrentUser(null);
        setIsAdmin(false);
        setSchools([]);
        setStudents([]);
        setUserProfiles([]);
        // isLoading for data will be handled by the data loading useEffect
      }
      setLoadingAuth(false); // IMPORTANT: Auth state check is complete
    });
    return () => {
      console.log("%cAppStateContext: Cleaning up onAuthStateChanged listener.", "color: orange;");
      unsubscribe();
    };
  }, [ensureUserProfileExists]); // ensureUserProfileExists is a dependency

  // Data loading effect - depends on currentUser and isAdmin
  const loadAdminData = useCallback(async () => { /* ... (your existing loadAdminData unchanged) ... */
    const currentAdminUser = auth.currentUser;
    if (!currentAdminUser || currentAdminUser.email !== ADMIN_EMAIL) {
      console.warn("AppStateContext: loadAdminData called but current user is not admin or not available. Aborting.");
      setUserProfiles([]);
      return;
    }
     console.log(
        `%cAppStateContext: DEBUG loadAdminData - Admin Check for fetching profiles.
        Current User Email: ${currentAdminUser.email},
        Current User UID: ${currentAdminUser.uid},
        Current User Email Verified (client-side): ${currentAdminUser.emailVerified},
        ADMIN_EMAIL constant: ${ADMIN_EMAIL},
        Client-side isAdmin flag (from context): ${isAdmin}`,
        "color: darkviolet; font-weight: bold; border: 1px solid darkviolet; padding: 3px;"
    );

    const profilesCollectionRef = collection(db, 'user_profiles');
    logOperationAttempt('loadAdminData (FETCHING ALL USER PROFILES)', profilesCollectionRef.path, { adminEmail: currentAdminUser.email, adminUID: currentAdminUser.uid }, currentAdminUser);
    try {
      const profilesSnapshot = await getDocs(profilesCollectionRef);
      const loadedProfiles: UserProfile[] = profilesSnapshot.docs.map(docSnapshot => ({
        id: docSnapshot.id,
        name: docSnapshot.data().name || 'N/A',
        email: docSnapshot.data().email,
      } as UserProfile));
      setUserProfiles(loadedProfiles);
      console.log(`%cAppStateContext: Admin loaded ${loadedProfiles.length} user profiles.`, "color: magenta; font-weight: bold;");
    } catch (error) {
      console.error(`%cAppStateContext: Firestore error in loadAdminData. Admin UID: ${currentAdminUser.uid}. Error:`, "color: red;", error);
      toast({ variant: "destructive", title: "Admin Data Load Error", description: `Could not load user profiles. ${error instanceof Error ? error.message : String(error)}` });
      setUserProfiles([]);
    }
  }, [toast, isAdmin, logOperationAttempt]);

  const loadUserSpecificData = useCallback(async (userIdToLoad: string) => { /* ... (your existing loadUserSpecificData unchanged) ... */
    const currentAuthUserForOp = auth.currentUser;
    if (!currentAuthUserForOp) {
      console.warn(`%cAppStateContext: loadUserSpecificData called for ${userIdToLoad} but auth.currentUser is null. Aborting.`, "color: orange;");
      return;
    }
    if (!userIdToLoad) {
      console.warn("%cAppStateContext: loadUserSpecificData called with no userIdToLoad. Aborting.", "color: orange;");
      return;
    }

    console.log(
      `%cAppStateContext: loadUserSpecificData FOR USER ID: ${userIdToLoad}.
      Auth User performing request: ${currentAuthUserForOp.uid} (${currentAuthUserForOp.email}, Verified: ${currentAuthUserForOp.emailVerified})
      Is Requesting User Admin (client check based on auth.currentUser.email): ${currentAuthUserForOp.email === ADMIN_EMAIL}`, "color:teal;"
    );

    const schoolsPath = `users/${userIdToLoad}/schools`;
    logOperationAttempt(`loadUserSpecificData - Schools`, schoolsPath, { requestingUserUID: currentAuthUserForOp.uid, targetUserIdForData: userIdToLoad }, currentAuthUserForOp);
    try {
      const schoolsQuery = query(collection(db, 'users', userIdToLoad, 'schools'));
      const schoolsSnapshot = await getDocs(schoolsQuery);
      const loadedSchools: School[] = schoolsSnapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, userId: userIdToLoad, ...docSnapshot.data() } as School));

      if (currentAuthUserForOp.uid === userIdToLoad) {
        setSchools(loadedSchools);
        console.log(`%cAppStateContext (User Self-View): Loaded ${loadedSchools.length} schools for user ${userIdToLoad}.`, "color: blue;");
      }

      const studentsPath = `users/${userIdToLoad}/students`;
      logOperationAttempt(`loadUserSpecificData - Students`, studentsPath, { requestingUserUID: currentAuthUserForOp.uid, targetUserIdForData: userIdToLoad }, currentAuthUserForOp);
      const studentsQuery = query(collection(db, 'users', userIdToLoad, 'students'));
      const studentsSnapshot = await getDocs(studentsQuery);
      const loadedStudents: Student[] = studentsSnapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, userId: userIdToLoad, ...docSnapshot.data() } as Student));

       if (currentAuthUserForOp.uid === userIdToLoad) {
        setStudents(loadedStudents);
        console.log(`%cAppStateContext (User Self-View): Loaded ${loadedStudents.length} students for user ${userIdToLoad}.`, "color: blue;");
      }
    } catch (error) {
      console.error(`%cAppStateContext: Firestore error in loadUserSpecificData for ${userIdToLoad}. Requesting Auth UID: ${currentAuthUserForOp.uid}. Error:`, "color: red;", error);
      toast({ variant: "destructive", title: "Data Load Error", description: `Could not load data for user. ${error instanceof Error ? error.message : String(error)}` });
      if (currentAuthUserForOp.uid === userIdToLoad) {
        setSchools([]);
        setStudents([]);
      }
    }
  }, [toast, logOperationAttempt]);

  useEffect(() => {
    const performDataLoad = async () => {
        // Wait for auth state to be resolved before loading data
        if (loadingAuth) {
            console.log("%cAppStateContext: Data load effect SKIPPED (loadingAuth is true - auth state still initializing).", "color: gray;");
            setIsLoading(true); // Keep general isLoading true while auth is loading
            return;
        }

        if (!currentUser) { // currentUser is null (checked, and no user)
            console.log("%cAppStateContext: USER LOGGED OUT (currentUser is null). Clearing all user-related data arrays.", "color: orange; font-weight: bold;");
            setSchools([]);
            setStudents([]);
            setUserProfiles([]);
            setIsLoading(false); // No data to load
            return;
        }

        // At this point, loadingAuth is false, and currentUser is a user object.
        console.log(
            `%cAppStateContext: Data load effect TRIGGERED.
            Current User (from state): ${currentUser.uid} (Email: ${currentUser.email}, Verified: ${currentUser.emailVerified}),
            isAdmin (context state): ${isAdmin}`,
            "color: purple; font-weight: bold;"
        );

        setIsLoading(true); // Start general data loading
        if (isAdmin) {
            console.log("%cAppStateContext: ADMIN detected. Loading ALL user profiles AND admin's own specific data.", "color: magenta; font-weight: bold;");
            await loadAdminData();
            await loadUserSpecificData(currentUser.uid);
        } else {
            console.log("%cAppStateContext: REGULAR USER detected. Clearing any existing user profiles and loading THEIR specific data.", "color: cyan; font-weight: bold;");
            setUserProfiles([]);
            await loadUserSpecificData(currentUser.uid);
        }
        setIsLoading(false); // Finish general data loading
    };

    performDataLoad();

  }, [currentUser, isAdmin, loadingAuth, loadAdminData, loadUserSpecificData]);


  // CRUD functions (addSchool, updateSchool, etc.) remain largely the same
  // Ensure they use auth.currentUser for permission checks, not the state `currentUser`
  // as state can be slightly delayed.
  const addSchool = async (schoolData: Omit<School, 'id' | 'userId' | 'appwriteBucketId'>, targetUserId?: string) => { /* ... (your existing addSchool unchanged) ... */
    const currentAuthUser = auth.currentUser;
    if (!currentAuthUser?.uid) throw new Error("User not authenticated for addSchool");

    const effectiveUserId = isAdmin && targetUserId ? targetUserId : currentAuthUser.uid;
    if (targetUserId && targetUserId !== currentAuthUser.uid && !isAdmin) {
        throw new Error("Permission Denied: Only admin can add schools for other users.");
    }

    const schoolToAddFirestore = { ...schoolData };
    const schoolCollectionRef = collection(db, 'users', effectiveUserId, 'schools');
    logOperationAttempt('addSchool - addDoc', schoolCollectionRef.path, { ...schoolToAddFirestore, forUserId: effectiveUserId }, currentAuthUser);

    const docRef = await addDoc(schoolCollectionRef, schoolToAddFirestore);
    const newSchool: School = { ...schoolToAddFirestore, id: docRef.id, userId: effectiveUserId, appwriteBucketId: '' }; // appwriteBucketId added for type consistency

    if (effectiveUserId === currentAuthUser.uid) {
      setSchools(prev => [...prev, newSchool]);
    }
    toast({ title: "School Added", description: `School "${newSchool.name}" added for user ${effectiveUserId}.`});
  };
  const updateSchool = async (updatedSchoolData: Omit<School, 'userId' | 'appwriteBucketId'>, targetUserId?: string) => { /* ... (your existing updateSchool unchanged) ... */
    const currentAuthUser = auth.currentUser;
    if (!currentAuthUser?.uid) throw new Error("User not authenticated for updateSchool");

    const effectiveUserId = isAdmin && targetUserId ? targetUserId : currentAuthUser.uid;
    if (targetUserId && targetUserId !== currentAuthUser.uid && !isAdmin) {
        throw new Error("Permission Denied: Only admin can update schools for other users.");
    }

    const schoolDocRef = doc(db, 'users', effectiveUserId, 'schools', updatedSchoolData.id);
    const { id, appwriteBucketId, ...dataToSave } = { ...updatedSchoolData } as Partial<School>;

    logOperationAttempt('updateSchool - updateDoc', schoolDocRef.path, { ...dataToSave, forUserId: effectiveUserId }, currentAuthUser);
    await updateDoc(schoolDocRef, dataToSave);

    if (effectiveUserId === currentAuthUser.uid) {
      setSchools(prev => prev.map(s => s.id === updatedSchoolData.id ? { ...s, ...dataToSave, id: updatedSchoolData.id, userId: effectiveUserId } as School : s));
    }
    toast({ title: "School Updated", description: `School "${updatedSchoolData.name}" updated for user ${effectiveUserId}.`});
  };
  const updateSchoolClassNames = async (schoolId: string, classNames: string[], targetUserId?: string) => { /* ... (your existing updateSchoolClassNames unchanged) ... */
    const currentAuthUser = auth.currentUser;
    if (!currentAuthUser?.uid) throw new Error("User not authenticated for updateSchoolClassNames");

    const effectiveUserId = isAdmin && targetUserId ? targetUserId : currentAuthUser.uid;
     if (targetUserId && targetUserId !== currentAuthUser.uid && !isAdmin) {
        throw new Error("Permission Denied: Only admin can update class names for other users' schools.");
    }

    const schoolDocRef = doc(db, 'users', effectiveUserId, 'schools', schoolId);
    logOperationAttempt('updateSchoolClassNames - updateDoc', schoolDocRef.path, { classNames, forUserId: effectiveUserId }, currentAuthUser);
    await updateDoc(schoolDocRef, { classNames: classNames });

    if (effectiveUserId === currentAuthUser.uid) {
      setSchools(prevSchools => prevSchools.map(s => s.id === schoolId ? { ...s, classNames: classNames } : s));
    }
    toast({ title: "School Classes Updated" });
  };
  const deleteSchool = async (schoolId: string, targetUserId?: string) => { /* ... (your existing deleteSchool unchanged) ... */
    const currentAuthUser = auth.currentUser;
    if (!currentAuthUser?.uid) throw new Error("User not authenticated for deleteSchool");

    const effectiveUserId = isAdmin && targetUserId ? targetUserId : currentAuthUser.uid;
    if (targetUserId && targetUserId !== currentAuthUser.uid && !isAdmin) {
        throw new Error("Permission Denied: Only admin can delete schools for other users.");
    }

    const schoolDocRef = doc(db, 'users', effectiveUserId, 'schools', schoolId);
    logOperationAttempt('deleteSchool - batch write start', `School: ${schoolDocRef.path}`, { forUserId: effectiveUserId }, currentAuthUser);

    const batchOp = writeBatch(db);
    batchOp.delete(schoolDocRef);

    const studentsInSchoolQuery = query(collection(db, 'users', effectiveUserId, 'students'), where('schoolId', '==', schoolId));
    logOperationAttempt('deleteSchool - query students', `users/${effectiveUserId}/students where schoolId == ${schoolId}`, {}, currentAuthUser);
    const studentsSnapshot = await getDocs(studentsInSchoolQuery);

    for (const studentDoc of studentsSnapshot.docs) {
      const studentData = studentDoc.data() as Student;
      if (studentData.photoAppwriteId) {
        try {
          logOperationAttempt('deleteSchool - delete Appwrite photo', `Appwrite file: ${studentData.photoAppwriteId}`, {}, currentAuthUser);
          // await deleteFileFromAppwriteStorage(studentData.photoAppwriteId); // Assuming Appwrite logic
        } catch (appwriteError) {
          console.warn("Failed to delete Appwrite photo during school deletion:", studentData.photoAppwriteId, appwriteError);
        }
      }
      logOperationAttempt('deleteSchool - batch delete student', studentDoc.ref.path, {}, currentAuthUser);
      batchOp.delete(studentDoc.ref);
    }
    await batchOp.commit();
    logOperationAttempt('deleteSchool - batch write committed', `School: ${schoolDocRef.path}`, {}, currentAuthUser);

    if (effectiveUserId === currentAuthUser.uid) {
      setSchools(prev => prev.filter(s => s.id !== schoolId));
      setStudents(prev => prev.filter(s => s.schoolId !== schoolId));
    }
    toast({ title: "School Deleted", description: `School and its students deleted for user ${effectiveUserId}.`});
  };
  const addStudent = async (studentData: Omit<Student, 'id' | 'userId' | 'photoAppwriteId'>, photoFile: File | null, schoolNameForPath: string, classNameForPath: string, targetUserId?: string) => { /* ... (your existing addStudent unchanged) ... */
    const currentAuthUser = auth.currentUser;
    if (!currentAuthUser?.uid) throw new Error("User not authenticated for addStudent");

    const effectiveUserId = isAdmin && targetUserId ? targetUserId : currentAuthUser.uid;
     if (targetUserId && targetUserId !== currentAuthUser.uid && !isAdmin) {
        throw new Error("Permission Denied: Only admin can add students for other users.");
    }

    let studentDataForFirestore: Partial<Omit<Student, 'id' | 'userId'>> = { ...studentData };

    if (photoFile) {
        logOperationAttempt('addStudent - upload Appwrite photo', `File: ${photoFile.name}`, { schoolName: schoolNameForPath, className: classNameForPath }, currentAuthUser);
        // const appwritePhotoId = await uploadFileToAppwriteStorage(photoFile, schoolNameForPath, studentData.schoolId, classNameForPath);
        // studentDataForFirestore.photoAppwriteId = appwritePhotoId; // Assuming Appwrite logic
    } else {
        delete studentDataForFirestore.photoAppwriteId;
    }

    const studentCollectionRef = collection(db, 'users', effectiveUserId, 'students');
    logOperationAttempt('addStudent - addDoc', studentCollectionRef.path, { studentName: studentData.name, forUserId: effectiveUserId, photoId: studentDataForFirestore.photoAppwriteId }, currentAuthUser);

    const docRef = await addDoc(studentCollectionRef, studentDataForFirestore);
    const newStudent = { ...studentDataForFirestore, id: docRef.id, userId: effectiveUserId } as Student;

    if (effectiveUserId === currentAuthUser.uid) {
      console.log("%cAppStateContext: addStudent - Updating local students state for current user.", "color: green;");
      setStudents(prev => [...prev, newStudent]);
    }
    toast({ title: "Student Added", description: `Student "${newStudent.name}" added for user ${effectiveUserId}.`});
  };
  const updateStudent = async (updatedStudentDataWithId: Omit<Student, 'userId' | 'photoAppwriteId'> & { id: string, photoAppwriteId?: string }, photoFile: File | null, schoolNameForPath: string, classNameForPath: string, oldPhotoAppwriteIdToDelete?: string, targetUserId?: string) => { /* ... (your existing updateStudent unchanged) ... */
    const currentAuthUser = auth.currentUser;
    if (!currentAuthUser?.uid) throw new Error("User not authenticated for updateStudent");

    const effectiveUserId = isAdmin && targetUserId ? targetUserId : currentAuthUser.uid;
    if (targetUserId && targetUserId !== currentAuthUser.uid && !isAdmin) {
        throw new Error("Permission Denied: Only admin can update students for other users.");
    }

    const { id: studentId, ...studentDataToSave } = updatedStudentDataWithId;
    let finalDataForFirestore: Partial<Omit<Student, 'id'|'userId'>> = { ...studentDataToSave };

    if (photoFile) {
        logOperationAttempt('updateStudent - upload new Appwrite photo', `File: ${photoFile.name}`, { schoolName: schoolNameForPath, className: studentDataToSave.className }, currentAuthUser);
        // const newPhotoAppwriteId = await uploadFileToAppwriteStorage(photoFile, schoolNameForPath, studentDataToSave.schoolId, studentDataToSave.className);
        // finalDataForFirestore.photoAppwriteId = newPhotoAppwriteId; // Assuming Appwrite
        // if (oldPhotoAppwriteIdToDelete && oldPhotoAppwriteIdToDelete !== newPhotoAppwriteId) {
        //     logOperationAttempt('updateStudent - delete old Appwrite photo', `Appwrite file: ${oldPhotoAppwriteIdToDelete}`, {}, currentAuthUser);
        //     await deleteFileFromAppwriteStorage(oldPhotoAppwriteIdToDelete); // Assuming Appwrite
        // }
    } else if (oldPhotoAppwriteIdToDelete && !studentDataToSave.photoAppwriteId) {
        logOperationAttempt('updateStudent - delete old Appwrite photo (new photo not provided)', `Appwrite file: ${oldPhotoAppwriteIdToDelete}`, {}, currentAuthUser);
        // await deleteFileFromAppwriteStorage(oldPhotoAppwriteIdToDelete); // Assuming Appwrite
        finalDataForFirestore.photoAppwriteId = deleteField() as any;
    } else if (studentDataToSave.photoAppwriteId) {
        finalDataForFirestore.photoAppwriteId = studentDataToSave.photoAppwriteId;
    } else {
        delete finalDataForFirestore.photoAppwriteId;
    }

    const studentDocRef = doc(db, 'users', effectiveUserId, 'students', studentId);
    logOperationAttempt('updateStudent - updateDoc', studentDocRef.path, { studentName: studentDataToSave.name, forUserId: effectiveUserId, photoId: finalDataForFirestore.photoAppwriteId }, currentAuthUser);

    await updateDoc(studentDocRef, finalDataForFirestore);

    const updatedStudentForState = { ...updatedStudentDataWithId, userId: effectiveUserId, ...finalDataForFirestore } as Student;
     if (finalDataForFirestore.photoAppwriteId === deleteField()) {
        delete updatedStudentForState.photoAppwriteId;
    }

    if (effectiveUserId === currentAuthUser.uid) {
      console.log("%cAppStateContext: updateStudent - Updating local students state for current user.", "color: green;");
      setStudents(prev => prev.map(s => s.id === studentId ? updatedStudentForState : s));
    }
    toast({ title: "Student Updated", description: `Student "${studentDataToSave.name}" updated for user ${effectiveUserId}.`});
  };
  const deleteStudent = async (studentId: string, targetUserId?: string) => { /* ... (your existing deleteStudent unchanged) ... */
    const currentAuthUser = auth.currentUser;
    if (!currentAuthUser?.uid) throw new Error("User not authenticated for deleteStudent");

    const effectiveUserId = isAdmin && targetUserId ? targetUserId : currentAuthUser.uid;
    if (targetUserId && targetUserId !== currentAuthUser.uid && !isAdmin) {
        throw new Error("Permission Denied: Only admin can delete students for other users.");
    }

    const studentDocRef = doc(db, 'users', effectiveUserId, 'students', studentId);
    logOperationAttempt('deleteStudent - getDoc (for photoAppwriteId)', studentDocRef.path, { forUserId: effectiveUserId }, currentAuthUser);

    const studentSnap = await getDoc(studentDocRef);
    if (studentSnap.exists()) {
        const studentData = studentSnap.data() as Student;
        if (studentData.photoAppwriteId) {
            logOperationAttempt('deleteStudent - delete Appwrite photo', `Appwrite file: ${studentData.photoAppwriteId}`, {}, currentAuthUser);
            // await deleteFileFromAppwriteStorage(studentData.photoAppwriteId); // Assuming Appwrite
        }
    }
    logOperationAttempt('deleteStudent - deleteDoc', studentDocRef.path, { forUserId: effectiveUserId }, currentAuthUser);
    await deleteDoc(studentDocRef);

    if (effectiveUserId === currentAuthUser.uid) {
       console.log("%cAppStateContext: deleteStudent - Updating local students state for current user.", "color: green;");
      setStudents(prev => prev.filter(s => s.id !== studentId));
    }
    toast({ title: "Student Deleted", description: `Student has been deleted for user ${effectiveUserId}.`});
  };

  // Logout function
  const logout = async () => {
    try {
      await auth.signOut(); // Firebase signOut method
      // No need to manually set currentUser to null, onAuthStateChanged will handle it
      console.log("AppStateContext: User signed out successfully.");
    } catch (error) {
      console.error("AppStateContext: Error signing out:", error);
      toast({ variant: "destructive", title: "Logout Error", description: "Failed to sign out." });
    }
  };

  const fetchSchoolsForUser = async (userId: string): Promise<School[]> => { /* ... (your existing fetchSchoolsForUser unchanged) ... */
    const currentAuthUser = auth.currentUser;
    if (!currentAuthUser) throw new Error("Not Authenticated for fetchSchoolsForUser");
    if (!isAdmin && currentAuthUser.uid !== userId) throw new Error("Permission Denied to fetch schools for other user");

    const path = `users/${userId}/schools`;
    logOperationAttempt('fetchSchoolsForUser', path, { targetUserId: userId }, currentAuthUser);
    const schoolsQuery = query(collection(db, 'users', userId, 'schools'));
    const snapshot = await getDocs(schoolsQuery);
    return snapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, userId, ...docSnapshot.data() } as School));
  };
  const fetchStudentsForClass = async (userId: string, schoolId: string, className: string): Promise<Student[]> => { /* ... (your existing fetchStudentsForClass unchanged) ... */
    const currentAuthUser = auth.currentUser;
    if (!currentAuthUser) throw new Error("Not Authenticated for fetchStudentsForClass");
    if (!isAdmin && currentAuthUser.uid !== userId) throw new Error("Permission Denied to fetch students for other user");

    const path = `users/${userId}/students`;
    logOperationAttempt('fetchStudentsForClass', path, { targetUserId: userId, schoolId, className }, currentAuthUser);
    const studentsQuery = query(
        collection(db, 'users', userId, 'students'),
        where('schoolId', '==', schoolId),
        where('className', '==', className)
    );
    const snapshot = await getDocs(studentsQuery);
    return snapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, userId, ...docSnapshot.data() } as Student));
  };
  const fetchSchoolByIdForUser = async (userId: string, schoolId: string): Promise<School | null> => { /* ... (your existing fetchSchoolByIdForUser unchanged) ... */
    const currentAuthUser = auth.currentUser;
    if (!currentAuthUser) throw new Error("Not Authenticated for fetchSchoolByIdForUser");
    if (!isAdmin && currentAuthUser.uid !== userId) throw new Error("Permission Denied to fetch school data for other user");

    const path = `users/${userId}/schools/${schoolId}`;
    logOperationAttempt('fetchSchoolByIdForUser', path, { targetUserId: userId, schoolId }, currentAuthUser);
    const schoolDocRef = doc(db, 'users', userId, 'schools', schoolId);
    const docSnap = await getDoc(schoolDocRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, userId, ...docSnap.data() } as School;
    }
    return null;
  };


  return (
    <AppStateContext.Provider value={{
        schools,
        students,
        userProfiles,
        addSchool,
        updateSchool,
        deleteSchool,
        addStudent,
        updateStudent,
        deleteStudent,
        updateSchoolClassNames,
        isLoading, // For general data loading
        currentUser,
        loadingAuth, // For initial auth check loading
        isAdmin,
        logout, // Provide logout function
        fetchSchoolsForUser,
        fetchStudentsForClass,
        fetchSchoolByIdForUser
    }}>
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = (): AppState => {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};
