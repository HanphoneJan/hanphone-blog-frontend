import { Suspense } from 'react'
export default function BlogInfoLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // 使用一个根div包裹所有元素
    <div>
      <div className="min-h-screen z-1 flex flex-col bg-white dark:bg-slate-950">
        <Suspense>
          <div>{children}</div>
        </Suspense>
      </div>
    </div>
  )
}
