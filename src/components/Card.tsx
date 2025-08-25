// src/components/Card.tsx

import React from 'react';

interface CardProps {
  children: React.ReactNode; // Card 내부에 들어갈 모든 콘텐츠를 의미합니다.
  className?: string; // 선택적으로 외부에서 추가 Tailwind CSS 클래스를 받을 수 있도록 합니다.
}

// 이 컴포넌트는 기본적으로 서버 컴포넌트입니다.
// 상호작용이 필요 없다면 'use client' 지시어가 필요 없습니다.
export default function Card({ children, className }: CardProps) {
  return (
    <div
      className={`
        rounded-lg
        background-box-main-color
        p-6
        shadow-xl
        ${className || ''}
      `}
    >
      {children}
    </div>
  );
}