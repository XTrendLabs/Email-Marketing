'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard'); }, []);
  return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#0a0b0f',color:'#6366f1',fontSize:'18px',fontFamily:'Inter,sans-serif'}}>🚀 Loading OutreachPro...</div>;
}
