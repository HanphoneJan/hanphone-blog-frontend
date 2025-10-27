'use client'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Home,
  FileText,
  User,
  PenTool,
  Bookmark,
  Tag,
  MessageSquare,
  Notebook,
  Briefcase,
  UserCircle,
  Image as ImageIcon,
  Menu,
  X,
  Link
} from 'lucide-react'
import { useUser } from '@/contexts/UserContext'

interface AdminHeaderProps {
  children?: React.ReactNode
}

interface MenuItem {
  id: number
  path: string
  authName: string
  icon: React.ReactNode
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ children }) => {
  const router = useRouter()
  const [isCollapse, setIsCollapse] = useState(false)
  const [activePath, setActivePath] = useState('')
  const [screenWidth, setScreenWidth] = useState(1200) // 初始值设为大屏幕默认值
  const [showUserOptions, setShowUserOptions] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  // 新增状态管理客户端hydration后的视图判断
  const [isClientHydrated, setIsClientHydrated] = useState(false)

  // 用于计算下拉框位置的ref
  const avatarRef = useRef<HTMLDivElement>(null)
  const maskRef = useRef<HTMLDivElement>(null)
  // 创建一个ref用于portal容器
  const portalRef = useRef<HTMLDivElement | null>(null)

  const { userInfo, onLogout } = useUser()

  const menulist: MenuItem[] = [
    { id: 0, path: '/admin/', authName: '后台首页', icon: <Home size={20} /> },
    { id: 1, path: '/admin/blog-input', authName: '撰写博客', icon: <PenTool size={20} /> },
    { id: 2, path: '/admin/blogs', authName: '博客管理', icon: <FileText size={20} /> },
    { id: 3, path: '/admin/types', authName: '分类管理', icon: <Bookmark size={20} /> },
    { id: 4, path: '/admin/tags', authName: '标签管理', icon: <Tag size={20} /> },
    { id: 5, path: '/admin/essays', authName: '随笔管理', icon: <Notebook size={20} /> },
    { id: 6, path: '/admin/comments', authName: '评论管理', icon: <MessageSquare size={20} /> },
    { id: 7, path: '/admin/projects', authName: '项目管理', icon: <Briefcase size={20} /> },
    { id: 8, path: '/admin/blog-files', authName: '文件管理', icon: <ImageIcon size={20} /> },
    { id: 9, path: '/admin/users', authName: '用户管理', icon: <User size={20} /> },
    { id: 10, path: '/admin/links', authName: '友链管理', icon: <Link size={20} /> },
    { id: 11, path: '/admin/personal', authName: '个人中心', icon: <UserCircle size={20} /> }
  ]

  // 计算下拉框位置
  const getDropdownPosition = () => {
    if (typeof window === 'undefined' || !avatarRef.current) {
      return { top: 0, left: 0, width: 180 }
    }

    const rect = avatarRef.current.getBoundingClientRect()
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft

    return {
      top: rect.bottom + scrollTop,
      left: rect.left + scrollLeft - 140, // 左移调整位置，使下拉框对齐头像右侧
      width: 180 // 固定宽度
    }
  }

  const calculateWidth = () => {
    return isCollapse ? '64px' : '150px'
  }

  const toggleMenu = () => {
    if (isMobileView) {
      setIsMobileMenuOpen(!isMobileMenuOpen)
    } else {
      setIsCollapse(!isCollapse)
    }
  }

  const closeMobileMenu = () => {
    if (isMobileView) {
      setIsMobileMenuOpen(false)
    }
  }

  const goToHomePage = () => {
    setShowUserOptions(false)
    closeMobileMenu()
    router.push('/')
  }

  const screenAdapter = () => {
    const newWidth = window.innerWidth
    setScreenWidth(newWidth)
    // 在大屏幕上自动展开菜单
    if (newWidth > 768 && isCollapse) {
      setIsCollapse(false)
    }
    // 在小屏幕上自动关闭移动菜单
    if (newWidth > 768) {
      setIsMobileMenuOpen(false)
    }
  }

  const handleMenuClick = (path: string) => {
    console.log(path)
    localStorage.setItem('activePath', path)
    setActivePath(path)
    router.push(path)
    closeMobileMenu()
  }

  // 点击页面其他区域关闭下拉框
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setShowUserOptions(false)
      }
    }

    // 监听滚动事件，关闭下拉框
    const handleScroll = () => {
      setShowUserOptions(false)
    }

    window.addEventListener('click', handleClickOutside)
    window.addEventListener('scroll', handleScroll)

    return () => {
      window.removeEventListener('click', handleClickOutside)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // 客户端hydration完成后初始化
  useEffect(() => {
    // 标记客户端已完成hydration
    setIsClientHydrated(true)
    // 初始化屏幕宽度
    setScreenWidth(window.innerWidth)
    // 执行屏幕适配
    screenAdapter()
    // 监听窗口大小变化
    window.addEventListener('resize', screenAdapter)

    return () => {
      window.removeEventListener('resize', screenAdapter)
    }
  }, [])

  useEffect(() => {
    const savedPath = localStorage.getItem('activePath')
    if (savedPath) {
      setActivePath(savedPath)
    } else {
      setActivePath('/admin/')
      localStorage.setItem('activePath', '/admin/')
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setActivePath(window.location.pathname)
    }
  }, [])

  // 仅在客户端hydration完成后才计算视图类型
  const isMobileView = isClientHydrated && screenWidth <= 768
  const isTabletView = isClientHydrated && screenWidth > 768 && screenWidth <= 1024

  // 获取下拉框位置
  const dropdownPosition = getDropdownPosition()

  return (
    <div className="flex w-full h-screen bg-slate-950 overflow-hidden">
      {isMobileView && isMobileMenuOpen && (
        <div ref={maskRef} className="fixed inset-0 bg-black/50 z-40" onClick={closeMobileMenu} />
      )}

      <aside
        className={`z-50 bg-slate-800/40 backdrop-blur-sm text-slate-200 transition-all duration-300 flex-shrink-0 border-r border-slate-700/50 ${
          isMobileView
            ? 'fixed top-16 left-0 h-[calc(100vh-4rem)] z-45 transform transition-transform duration-300'
            : ''
        }`}
        style={{
          width: isMobileView ? '240px' : calculateWidth(),
          minHeight: isMobileView ? 'auto' : '100vh',
          transform: isMobileView
            ? isMobileMenuOpen
              ? 'translateX(0)'
              : 'translateX(-100%)'
            : 'none'
        }}
      >
        <nav
          className={`${
            isMobileView
              ? 'w-full h-full bg-slate-800 shadow-lg border border-slate-700/50 overflow-y-auto'
              : 'h-full'
          }`}
        >
          <ul className="py-4">
            {menulist.map(item => (
              <li
                key={item.id}
                className={`flex items-center py-3 px-4 cursor-pointer transition-all duration-300 rounded-lg mx-2 ${
                  activePath === item.path
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700/50'
                }`}
                onClick={() => handleMenuClick(item.path)}
              >
                <span className={`${isCollapse && !isMobileView ? 'mx-auto' : ''} text-blue-100`}>
                  {item.icon}
                </span>
                {(!isCollapse || isMobileView) && (
                  <span className={`ml-3 ${isMobileView ? 'font-medium' : ''}`}>
                    {item.authName}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-slate-800/40 backdrop-blur-sm text-slate-100 shadow-lg h-16 flex items-center justify-between px-4 sm:px-6 z-20 border-b border-slate-700/50">
          <div
            className="cursor-pointer text-blue-400 font-bold tracking-widest transition-colors hover:text-blue-300 p-2"
            onClick={toggleMenu}
            aria-label={isMobileMenuOpen ? '关闭菜单' : '打开菜单'}
          >
            {isMobileView ? (
              isMobileMenuOpen ? (
                <X size={24} />
              ) : (
                <Menu size={24} />
              )
            ) : (
              <span>|||</span>
            )}
          </div>

          <div
            className={`font-semibold text-blue-100 truncate ${
              isMobileView ? 'text-base' : isTabletView ? 'text-lg' : 'text-xl'
            }`}
          >
            博客后台管理系统
          </div>

          <div
            ref={avatarRef}
            className="relative flex items-center cursor-pointer"
            onClick={e => {
              e.stopPropagation()
              setShowUserOptions(!showUserOptions)
            }}
          >
            <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-slate-700 transition-transform duration-300 hover:scale-110">
              <Image
                src={userInfo?.avatar || '/default-avatar.png'}
                alt="用户头像"
                fill
                sizes="36px" // 头像固定36px(9*4)大小
                className="object-cover"
              />
            </div>
          </div>
        </header>

        {/* 使用createPortal将下拉框挂载到body */}
        {showUserOptions &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              ref={portalRef}
              style={{
                position: 'absolute',
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                width: dropdownPosition.width,
                zIndex: 9999 // 全局最高层级
              }}
              className="bg-slate-800 rounded-lg shadow-xl py-1 border border-slate-700/50 overflow-visible"
            >
              <div className="px-4 py-2 text-sm text-blue-100 font-medium">
                {userInfo?.nickname || '管理员'}
              </div>
              <div
                className="px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/50 cursor-pointer transition-colors"
                onClick={goToHomePage}
              >
                返回首页
              </div>
              <div
                className="px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/50 cursor-pointer transition-colors"
                onClick={() => {
                  onLogout()
                  setShowUserOptions(false)
                }}
              >
                退出登录
              </div>
            </div>,
            document.body // 挂载到body元素
          )}

        <main
          className={`flex-1 overflow-auto ${
            isMobileView ? 'p-0' : isTabletView ? 'p-1' : 'p-1'
          } bg-slate-900/60 z-10`}
        >
          {children}
        </main>
      </div>
    </div>
  )
}

export default AdminHeader
