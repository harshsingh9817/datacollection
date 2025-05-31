import { cn } from "@/lib/utils";
import React from "react";

interface AppLogoProps extends React.SVGProps<SVGSVGElement> {}

export function AppLogo({ className, ...props }: AppLogoProps) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-8 w-8", className)}
      {...props}
    >
      <rect width="32" height="32" rx="8" fill="hsl(var(--primary))" />
      {/* Simplified 'CC' or card icon */}
      <path
        d="M10 12C10 10.8954 10.8954 10 12 10H20C21.1046 10 22 10.8954 22 12V20C22 21.1046 21.1046 22 20 22H12C10.8954 22 10 21.1046 10 20V12Z"
        stroke="hsl(var(--primary-foreground))"
        strokeWidth="2"
      />
      <path d="M10 16H22" stroke="hsl(var(--primary-foreground))" strokeWidth="2" />
      <circle cx="13" cy="19" r="1.5" fill="hsl(var(--primary-foreground))" />
       <circle cx="19" cy="19" r="1.5" fill="hsl(var(--primary-foreground))" />
    </svg>
  );
}
