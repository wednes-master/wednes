// src/components/Footer.tsx
// 이 컴포넌트는 클라이언트 상호작용이 없으므로 'use client' 지시어가 필요 없습니다.
export default function Footer() {
    return (
      <footer className="background-sub-color p-4 text-center text-main-color text-sm mt-8 background-layout-color">
        <div className="container mx-auto">
          <p>wednes@kakao.com</p> {/* 필요한 경우 이메일이나 다른 정보 추가 */}
          <p>&copy; {new Date().getFullYear()} hyeok.io All rights reserved.</p>
        </div>
      </footer>
    );
  }