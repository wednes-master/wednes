// src/components/Header.tsx
'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

function useToast() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');

  const show = useCallback((msg: string, duration = 2000) => {
    setMessage(msg);
    setOpen(true);
    window.clearTimeout((show as any)._t);
    (show as any)._t = window.setTimeout(() => setOpen(false), duration);
  }, []);

  useEffect(() => {
    return () => {
      window.clearTimeout((show as any)._t);
    };
  }, []);

  return { open, message, show };
}

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const navItems = [
    { href: '/', label: '홈' },
    { href: '/tools', label: '도구' },
  ];

  const toast = useToast();

  const handleLoginClick = () => {
    toast.show('준비중입니다');
  };

  const handleMobileLoginClick = () => {
    setIsMenuOpen(false);
    toast.show('준비중입니다');
  };

  const handleToolsClick = (e?: React.MouseEvent) => {
    if (e) e.preventDefault(); // 링크 이동 막기
    toast.show('준비중입니다'); // 토스트 노출
  };

  return (
    <header className="top-0 z-50 bg-surface-dark shadow-md background-layout-color">
      <div className="max-w-[1216px] mx-auto py-3 px-4 sm:px-6 flex justify-between items-center">
        <Link href="/" className="flex items-center">
          <Image
            src="/wednes.png"
            alt="로아툴 로고"
            width={150}
            height={30}
            priority
            className="-ml-2"
          />
        </Link>

        <div className="flex items-center">
          <button
            type="button"
            className="
              hidden md:block
              px-[10px] py-[5px]
              bg-sub text-white
              rounded-[5px]
              border border-transparent
              font-semibold
              transition
              cursor-pointer
              hover:bg-[var(--wednes-bg-sub)] hover:border-sub
            "
            onClick={handleLoginClick}
          >
            로그인
          </button>

          <button
            type="button"
            className="md:hidden text-text-primary hover:text-brand-primary focus:outline-none ml-4"
            onClick={() => setIsMenuOpen(true)}
            aria-label="메뉴 열기"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="hidden md:block w-full h-[1.5px] background-color" />

      {/* PC 네비게이션 */}
      <nav className="hidden md:block max-w-[1216px] mx-auto py-2 px-4 sm:px-6">
        <ul className="flex justify-start space-x-8 font-semibold text-base items-center text-explan-color">
        {navItems.map(({ href, label }) => {
            const isActive = pathname === href || (pathname === '/' && href === '/home');

            const isTools = href === '/tools';
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={isTools ? handleToolsClick : undefined} // '도구'만 토스트로 처리
                  className={[
                    'transition-colors duration-200',
                    isActive ? 'text-sub' : '',
                    'hover:text-sub underline-offset-4 decoration-2',
                  ].join(' ')}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* 모바일 메뉴 */}
      <div
        className={[
          'md:hidden fixed inset-0 z-40 bg-surface-dark transform',
          isMenuOpen ? 'translate-x-0' : 'translate-x-full',
          'transition-transform duration-300 ease-in-out',
          isMenuOpen ? 'pointer-events-auto' : 'pointer-events-none',
        ].join(' ')}
      >
        <nav className="h-full w-full p-4 flex flex-col background-box-main-color">
          <div className="flex justify-end mb-8">
            <button
              type="button"
              className="text-text-primary hover:text-brand-primary focus:outline-none"
              onClick={() => setIsMenuOpen(false)}
              aria-label="메뉴 닫기"
            >
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 기존 리스트 영역 */}
          <ul className="flex flex-col flex-grow text-xl font-medium text-text-primary">
            {navItems.map(({ href, label }, index, arr) => {
              const isActive = pathname === href || (pathname === '/' && href === '/home');
              return (
                <li
                  key={href}
                  className={index < arr.length - 1 ? 'border-b border-zinc-700' : ''}
                >
                  <Link
                    href={href}
                    onClick={() => setIsMenuOpen(false)}
                    className={[
                      'block py-4 transition-colors duration-200',
                      isActive ? 'text-sub-color' : '',
                      'hover:text-sub-color hover:underline underline-offset-4 decoration-2',
                    ].join(' ')}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}

            <li className="mt-auto pt-4">
              <button
                type="button"
                className="w-full bg-brand-primary text-base-dark font-semibold rounded-md py-3 hover:bg-brand-secondary transition"
                onClick={handleMobileLoginClick}
              >
                로그인 / 회원가입
              </button>
            </li>
          </ul>
        </nav>
      </div>

      {/* 토스트 뷰 */}
      <Toast open={toast.open} message={toast.message} />
    </header>
  );
}

function Toast({ open, message }: { open: boolean; message: string }) {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className={[
        'pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4',
      ].join(' ')}
    >
      <div
        role="status"
        className={[
          'transition-all duration-300 ease-out',
          open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
          'max-w-[90%] sm:max-w-md w-auto',
        ].join(' ')}
      >
        <div className="rounded-lg bg-[rgba(30,30,30,0.92)] text-white shadow-lg backdrop-blur px-4 py-3 flex items-center gap-3">
          {/* 아이콘(선택) */}
          <svg
            className="w-5 h-5 text-emerald-400 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          <span className="text-sm font-medium">{message}</span>
        </div>
      </div>
    </div>
  );
}