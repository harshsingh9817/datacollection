// src/hooks/useLeaveConfirmation.ts
import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation'; // Use next/navigation for App Router
import { useAppState } from '@/context/AppStateContext'; // Your AppState context

interface UseLeaveConfirmationOptions {
  enabled?: boolean; // To enable/disable the hook
  message?: string;
}

export function useLeaveConfirmation({
  enabled = true,
  message = 'You are about to leave this page. Do you want to logout first?',
}: UseLeaveConfirmationOptions = {}) {
  const router = useRouter();
  const { currentUser, logout } = useAppState(); // Assuming logout is your Firebase logout function

  const handleBeforeUnload = useCallback(
    (event: BeforeUnloadEvent) => {
      if (currentUser && enabled) {
        // This message is often ignored by modern browsers in favor of a generic one.
        // The main purpose here is to trigger the browser's native "leave site?" dialog.
        event.preventDefault();
        event.returnValue = message; // For older browsers
        return message; // For some modern browsers
      }
    },
    [currentUser, enabled, message]
  );

  const handleRouteChangeStart = useCallback(
    (url: string) => {
      // This is more complex. We need to determine if the navigation is "out" of a protected area.
      // For simplicity, let's assume any route change away from the current page could be a trigger.
      // A more robust solution would involve checking if `url` is to a public page.
      if (currentUser && enabled) {
        if (window.confirm(message + "\n\nClick OK to logout and leave, or Cancel to stay.")) {
          logout().then(() => {
            // Don't call router.push(url) here immediately if logout itself causes a redirect.
            // If logout doesn't redirect, then:
            // router.push(url);
            // For now, let's assume logout will handle navigation to a public page (e.g., login page)
          }).catch(err => {
            console.error("Logout failed:", err);
            // Potentially allow navigation anyway or show an error
          });
          // To prevent the Next.js router from navigating immediately while confirm is up
          // and before logout completes, we might need to throw an error or use a more
          // sophisticated router blocking mechanism if available with Next.js router events.
          // For now, this is a simplified prompt.
          // A true "block and then proceed" is harder with async operations like logout.
        } else {
          // User clicked "Cancel" - attempt to stop navigation.
          // Stopping Next.js navigation programmatically after `routeChangeStart`
          // can be tricky. Often, `throw new Error('Navigation cancelled by user')`
          // in `routeChangeStart` was a way, but it's a bit hacky.
          // With the new App Router, `router.events` is different.
          // This part is the most challenging.

          // For a simpler UX, if they cancel, they stay, and the original navigation is implicitly aborted
          // by not calling router.push(url) or letting the default proceed.
          // However, the browser's back button might still have navigated.
          console.log("User chose to stay.");
          // To truly stop the navigation that triggered this, you might need to
          // re-route them back if the navigation already partially happened.
          // This is where it gets complex.
        }
      }
    },
    [currentUser, enabled, message, logout, router]
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !enabled || !currentUser) {
      return;
    }

    // For leaving the entire site (closing tab/window, navigating to external URL)
    window.addEventListener('beforeunload', handleBeforeUnload);

    // For internal Next.js route changes
    // Note: `router.events` is from `next/router` (Pages Router).
    // For App Router (`next/navigation`), a direct equivalent of `routeChangeStart`
    // to *block* navigation is not as straightforward.
    // You might need to use a different strategy, like wrapping links
    // or using a layout component that intercepts navigation.

    // The following `router.events` is for the PAGES ROUTER.
    // If using APP ROUTER, this specific part needs rethinking.
    // router.events?.on('routeChangeStart', handleRouteChangeStart);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // router.events?.off('routeChangeStart', handleRouteChangeStart);
    };
  }, [enabled, currentUser, handleBeforeUnload, handleRouteChangeStart, router.events]);
}
