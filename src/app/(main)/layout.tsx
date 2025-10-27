import Header from '@/components/Header'
import Live2DWidget from '@/components/Live2DWidget'
import React from 'react'

export default function MainLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div>
      <Header />

      {/* 使用picture标签实现WebP和JPEG的条件加载 */}
      <picture className="fixed inset-0 z-0 opacity-60 dark:opacity-30 pointer-events-none">
        {/* 优先加载WebP格式（支持的浏览器会选择这个） */}
        <source srcSet="/background.webp" type="image/webp" />

        {/* WebP不支持时回退到JPEG */}
        <img
          src="/background.jpeg"
          alt="Background"
          style={{
            objectFit: 'cover',
            width: '100vw',
            height: '100vh',
            position: 'fixed',
            top: 0,
            left: 0
          }}
        />
      </picture>

      {children}
      <Live2DWidget />
    </div>
  )
}
