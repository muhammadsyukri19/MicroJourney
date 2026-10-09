// TEMPLATE: LoginTemplate
// Page template untuk orchestrate HeroPanel & LoginForm di halaman Login.
'use client';

import React from 'react';
import HeroPanel from '@/components/login/HeroPanel';
import LoginForm from '@/components/login/LoginForm';

export default function LoginTemplate() {
  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'var(--font-inter)' }}>
      <HeroPanel />
      <LoginForm />
    </div>
  );
}
