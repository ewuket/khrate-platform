'use client';

import { useEffect } from 'react';
import { getToken } from '../lib/api';

export default function Home() {
  useEffect(() => {
    window.location.href = getToken() ? '/deals' : '/login';
  }, []);
  return null;
}
