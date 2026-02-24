'use client'

import { useEffect, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export default function LogoutSync({ children }: Props) {
  useEffect(() => {
    const syncLogout = (event: StorageEvent) => {
      if (event.key === 'logout') {
        window.location.href = '/login';
      }
    };
    window.addEventListener('storage', syncLogout);
    return () => window.removeEventListener('storage', syncLogout);
  }, []);

  return <>{children}</>;
}