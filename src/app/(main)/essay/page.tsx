'use client'
import { useState, useEffect, useCallback, useRef, useReducer, useMemo } from 'react'
import Image from 'next/image'
import { useUser } from '@/contexts/UserContext'
import ReactPlayer from 'react-player'
import {
  BookOpen,
  User,
  Clock,
  Heart,
  FileImage,
  FileVideo,
  FileText,
  FileCode,
  MessageCircle,
  Trash2,
  Reply,
  X,
  Send,
  ArrowBigUpDash
} from 'lucide-react'
import { showAlert } from '@/lib/Alert'
import { ENDPOINTS } from '@/lib/api'
import apiClient from '@/lib/utils'
import React from 'react'

// 定义文件类型
type FileType = 'image' | 'video' | 'text'

// 定义文件列表接口
interface FileList {
  Images: string[] // 图片URL数组
  Videos: string[] // 视频URL数组
  Texts: string[] // 文本文件URL数组
}

// 定义API返回的文件接口
interface EssayFileUrl {
  id: number
  url: string
  urlType: 'IMAGE' | 'VIDEO' | 'TEXT'
  urlDesc?: string | null
  isValid: boolean
  createTime: string
}

// 定义评论接口
interface Comment {
  id: number
  userId: number
  nickname: string
  avatar: string
  content: string
  createTime: string
  parentCommentId?: number | null
  adminComment: boolean
}

// 定义API返回的用户接口
interface ApiUser {
  id: number
  nickname: string
  username: string
  password: string
  email: string
  avatar: string
  loginProvince: string
  loginCity: string
  loginLat: string
  loginLng: string
  type: string
  createTime: string
  updateTime: string
  lastLoginTime: string
}

interface UserInfo {
  avatar?: string
  nickname?: string
  username?: string
  type?: string
  id?: number | null
  email?: string
  loginProvince?: string
  loginCity?: string
}

// 定义API返回的评论接口
interface ApiComment {
  id: number
  user: ApiUser
  createTime: string | null
  parentCommentId: number | null
  adminComment: boolean
  content: string
  parentEssayComment: ApiComment
}

// 定义随笔接口
interface Essay {
  id: number
  userId: number
  nickname: string
  avatar: string
  title: string
  content: string
  createTime: string
  likeCount: number
  isLiked: boolean
  fileList?: FileList
  comments: Comment[]
  commentCount: number
  recommend: boolean // 添加recommend字段
}

// 定义API返回的随笔接口
interface ApiEssay {
  id: number
  likes?: number | null
  liked: boolean
  user: ApiUser
  title: string
  content: string
  color?: string | null
  image?: string | null
  createTime: string
  essayFileUrls?: EssayFileUrl[]
  essayComments?: ApiComment[]
  recommend: boolean // 添加recommend字段
}

// 使用 useReducer 管理随笔状态
interface EssayState {
  essays: Essay[]
  loading: boolean
  commentInputs: Record<number, string>
  replyInputs: Record<number, string>
  showReplyBox: Record<number, boolean>
}

type EssayAction =
  | { type: 'SET_ESSAYS'; payload: Essay[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'UPDATE_LIKE'; payload: { essayId: number; isLiked: boolean; likeCount: number } }
  | { type: 'ADD_COMMENT'; payload: { essayId: number; comment: Comment } }
  | { type: 'DELETE_COMMENT'; payload: { essayId: number; commentId: number } }
  | { type: 'SET_COMMENT_INPUT'; payload: { essayId: number; value: string } }
  | { type: 'SET_REPLY_INPUT'; payload: { commentId: number; value: string } }
  | { type: 'TOGGLE_REPLY_BOX'; payload: { commentId: number; value: boolean } }

const essayReducer = (state: EssayState, action: EssayAction): EssayState => {
  switch (action.type) {
    case 'SET_ESSAYS':
      return { ...state, essays: action.payload }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'UPDATE_LIKE':
      return {
        ...state,
        essays: state.essays.map(essay =>
          essay.id === action.payload.essayId
            ? {
                ...essay,
                isLiked: action.payload.isLiked,
                likeCount: action.payload.likeCount
              }
            : essay
        )
      }
    case 'ADD_COMMENT':
      return {
        ...state,
        essays: state.essays.map(essay =>
          essay.id === action.payload.essayId
            ? {
                ...essay,
                comments: [...essay.comments, action.payload.comment],
                commentCount: essay.commentCount + 1
              }
            : essay
        )
      }
    case 'DELETE_COMMENT':
      return {
        ...state,
        essays: state.essays.map(essay => {
          if (essay.id === action.payload.essayId) {
            const updatedComments = essay.comments.filter(
              comment => comment.id !== action.payload.commentId
            )
            return {
              ...essay,
              comments: updatedComments,
              commentCount: updatedComments.length
            }
          }
          return essay
        })
      }
    case 'SET_COMMENT_INPUT':
      return {
        ...state,
        commentInputs: {
          ...state.commentInputs,
          [action.payload.essayId]: action.payload.value
        }
      }
    case 'SET_REPLY_INPUT':
      return {
        ...state,
        replyInputs: {
          ...state.replyInputs,
          [action.payload.commentId]: action.payload.value
        }
      }
    case 'TOGGLE_REPLY_BOX':
      return {
        ...state,
        showReplyBox: {
          ...Object.keys(state.showReplyBox).reduce((acc, key) => {
            acc[parseInt(key)] = false
            return acc
          }, {} as Record<number, boolean>),
          [action.payload.commentId]: action.payload.value
        }
      }
    default:
      return state
  }
}

// 获取文件图标
const getFileIcon = (type: FileType, fileName: string) => {
  if (type === 'image') {
    return <FileImage className="h-5 w-5" />
  } else if (type === 'video') {
    return <FileVideo className="h-5 w-5" />
  } else {
    if (fileName.endsWith('.pdf')) {
      return <FileText className="h-5 w-5" />
    } else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
      return <FileText className="h-5 w-5" />
    } else if (fileName.endsWith('.ppt') || fileName.endsWith('.pptx')) {
      return <FileText className="h-5 w-5" />
    } else if (fileName.endsWith('.md') || fileName.endsWith('.txt')) {
      return <FileCode className="h-5 w-5" />
    }
    return <FileText className="h-5 w-5" />
  }
}

// 判断文件类型
const getFileType = (url: string): FileType => {
  const lowerUrl = url.toLowerCase()
  if (
    lowerUrl.endsWith('.jpg') ||
    lowerUrl.endsWith('.jpeg') ||
    lowerUrl.endsWith('.png') ||
    lowerUrl.endsWith('.gif') ||
    lowerUrl.endsWith('.webp')
  ) {
    return 'image'
  } else if (
    lowerUrl.endsWith('.mp4') ||
    lowerUrl.endsWith('.webm') ||
    lowerUrl.endsWith('.mov') ||
    lowerUrl.endsWith('.avi')
  ) {
    return 'video'
  }
  return 'text'
}

const getFileName = (url: string) => {
  const fileName = url.split('/').pop() || '文件'
  try {
    return decodeURIComponent(fileName)
  } catch (e) {
    console.log('文件名解码错误' + e)
    return fileName
  }
}

// 使用React.memo优化随笔卡片组件，避免不必要的重新渲染
const EssayCard = React.memo(
  ({
    essay,
    isMobile,
    userInfo,
    administrator,
    onToggleLike,
    onSubmitComment,
    onSubmitReply,
    onDeleteComment,
    commentInput,
    replyInputs,
    showReplyBox,
    onCommentChange,
    onReplyChange,
    onToggleReplyBox,
    formatDate,
    openFile,
    getRepliedUserNickname
  }: {
    essay: Essay
    isMobile: boolean
    userInfo: UserInfo | null
    administrator: boolean
    onToggleLike: (essayId: number) => void
    onSubmitComment: (essayId: number) => void
    onSubmitReply: (essayId: number, commentId: number) => void
    onDeleteComment: (essayId: number, commentId: number) => void
    commentInput: string
    replyInputs: Record<number, string>
    showReplyBox: Record<number, boolean>
    onCommentChange: (essayId: number, value: string) => void
    onReplyChange: (commentId: number, value: string) => void
    onToggleReplyBox: (commentId: number) => void
    formatDate: (dateString: string) => string
    openFile: (url: string) => void
    getRepliedUserNickname: (
      comments: Comment[],
      parentId: number | null | undefined
    ) => string | null
  }) => {
    const commentInputRef = useRef<HTMLTextAreaElement>(null)
    const replyInputRefs = useRef<Record<number, HTMLTextAreaElement | null>>({})

    // 处理评论提交后保持焦点
    const handleSubmitComment = () => {
      onSubmitComment(essay.id)
      // 提交后不重置焦点，保持在输入框
      setTimeout(() => {
        if (commentInputRef.current) {
          commentInputRef.current.focus()
        }
      }, 0)
    }

    // 处理回复提交后保持焦点
    const handleSubmitReply = (commentId: number) => {
      onSubmitReply(essay.id, commentId)
      // 提交后不重置焦点，保持在输入框
      setTimeout(() => {
        if (replyInputRefs.current[commentId]) {
          replyInputRefs.current[commentId]?.focus()
        }
      }, 0)
    }

    // 使用 useMemo 缓存文件列表，避免每次渲染重新计算
    const allFiles = useMemo(
      () => [
        ...(essay.fileList?.Images.map(url => ({ url, type: 'image' as FileType })) || []),
        ...(essay.fileList?.Videos.map(url => ({ url, type: 'video' as FileType })) || []),
        ...(essay.fileList?.Texts.map(url => ({ url, type: 'text' as FileType })) || [])
      ],
      [essay.fileList]
    )

    return (
      <div
        className={`${
          isMobile
            ? 'w-full border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60'
            : 'bg-white/80 dark:bg-slate-800/40 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50 transition-all duration-300 hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600/50 overflow-hidden'
        }`}
      >
        <div className={`${isMobile ? 'px-4 pt-2' : 'p-6'}`}>
          {/* 用户信息 */}
          <div className="flex items-center mb-4">
            {essay.avatar ? (
              <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-slate-200 dark:border-slate-700">
                <Image
                  src={essay.avatar}
                  alt={`${essay.nickname}的头像`}
                  fill
                  loading="eager"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700/50 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0 border border-slate-200 dark:border-slate-700">
                <User className="h-5 w-5" />
              </div>
            )}

            <div className="ml-3 flex-1">
              <div className="flex flex-wrap items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800 dark:text-blue-100">
                    {essay.nickname}
                  </span>
                  {essay.recommend && (
                    <div className="flex items-center text-amber-500 dark:text-blue-600">
                      <ArrowBigUpDash className="h-4 w-4 fill-amber-500 dark:fill-blue-600" />
                    </div>
                  )}
                </div>
                <span className="text-slate-500 dark:text-slate-400 text-sm flex items-center gap-1 ml-2">
                  <Clock className="h-3 w-3" />
                  {formatDate(essay.createTime)}
                </span>
              </div>
            </div>
          </div>
          {/* 内容区域 - 增加溢出控制 */}
          <div className={`mb-4 ${isMobile ? 'text-base' : ''} overflow-hidden`}>
            {essay.title && (
              <h3 className="text-xl font-semibold text-slate-800 dark:text-blue-100 mb-3">
                {essay.title}
              </h3>
            )}
            {essay.content && (
              <div className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {essay.content}
              </div>
            )}
          </div>
          {/* 文件展示区域 */}
          {allFiles.length > 0 && (
            <div className="mb-5 space-y-4">
              {/* 文本文件 */}
              {allFiles.filter(file => file.type === 'text').length > 0 && (
                <div className="space-y-3">
                  {allFiles
                    .filter(file => file.type === 'text')
                    .map((file, index) => (
                      <div
                        key={`text-${index}`}
                        onClick={() => openFile(file.url)}
                        className="w-full h-14 p-2 bg-slate-100 dark:bg-slate-900/60 flex items-center gap-2 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-900 transition-colors rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700"
                      >
                        <div className="text-blue-600 dark:text-blue-400 p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded">
                          {getFileIcon('text', file.url)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                            {getFileName(file.url)}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            点击查看文件
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
              {/* 媒体文件 */}
              {allFiles.filter(file => file.type !== 'text').length > 0 && (
                <div
                  className={
                    isMobile
                      ? allFiles.filter(f => f.type !== 'text').length === 1
                        ? 'w-full'
                        : allFiles.filter(f => f.type !== 'text').length === 2
                        ? 'grid grid-cols-2 gap-1'
                        : 'grid grid-cols-3 gap-1'
                      : 'grid grid-cols-2 gap-3'
                  }
                >
                  {allFiles
                    .filter(file => file.type !== 'text')
                    .map((file, index) => {
                      const mediaCount = allFiles.filter(f => f.type !== 'text').length
                      let mediaStyle = ''

                      if (isMobile) {
                        if (mediaCount === 1) {
                          mediaStyle = 'aspect-square max-h-[300px] mx-auto'
                        } else {
                          mediaStyle = 'aspect-square'
                        }
                      } else {
                        mediaStyle = 'aspect-video object-cover'
                      }

                      return (
                        <div
                          key={`media-${index}`}
                          onClick={() => openFile(file.url)}
                          className={`relative rounded overflow-hidden border border-slate-200 dark:border-slate-700 cursor-pointer ${mediaStyle}`}
                        >
                          {file.type === 'image' && (
                            <>
                              <Image
                                src={file.url}
                                alt={`图片 ${index + 1}`}
                                fill
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 720px"
                                loading={index < 3 ? 'eager' : 'lazy'} // 前两张图片优先加载
                                className="object-cover transition-all duration-100"
                              />
                            </>
                          )}

                          {file.type === 'video' && (
                            <>
                              <ReactPlayer
                                src={file.url}
                                width="100%"
                                height="100%"
                                controls={true}
                              />
                            </>
                          )}
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          )}
          {/* 互动区域 */}
          <div
            className={`flex justify-between items-center ${
              isMobile
                ? 'pt-1 pb-2'
                : 'pt-2 border-t border-slate-200 dark:border-slate-700/30 mb-2'
            }`}
          >
            <button
              onClick={() => onToggleLike(essay.id)}
              disabled={!userInfo}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all ${
                !userInfo
                  ? 'text-slate-500 cursor-not-allowed'
                  : essay.isLiked
                  ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-900/40'
                  : 'bg-slate-100 dark:bg-slate-700/30 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/50'
              }`}
            >
              {essay.isLiked ? (
                <Heart className="h-4 w-4 fill-rose-600 dark:fill-rose-400" />
              ) : (
                <Heart className="h-4 w-4" />
              )}
              <span>{essay.likeCount} 点赞</span>
            </button>

            <button className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm bg-slate-100 dark:bg-slate-700/30 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-all">
              <MessageCircle className="h-4 w-4" />
              <span>{essay.commentCount} 评论</span>
            </button>
          </div>
          {/* 评论输入框 */}
          <div className={`relative flex items-center `}>
            <textarea
              ref={commentInputRef}
              value={commentInput}
              onChange={e => onCommentChange(essay.id, e.target.value)}
              placeholder="写下你的评论..."
              className={`w-full bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-t-lg p-3 pr-20 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors resize-none ${
                isMobile ? 'h-10' : 'h-14'
              }`}
            />
            <button
              onClick={handleSubmitComment}
              className="absolute right-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-full text-sm transition-colors disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
              disabled={!commentInput?.trim() || !userInfo}
            >
              发布
            </button>
          </div>
          {/* 评论列表 */}
          <div
            className={`space-y-3 border  border-slate-200 dark:border-slate-700/50   bg-slate-50 dark:bg-slate-900/30 rounded-b-lg  ${
              isMobile ? 'mb-4' : ''
            }`}
          >
            {essay.comments.length > 0 ? (
              <div className="space-y-0">
                {essay.comments.map((comment, index) => {
                  const repliedTo = getRepliedUserNickname(essay.comments, comment.parentCommentId)
                  const isLastComment = index === essay.comments.length - 1

                  return (
                    <div
                      key={comment.id}
                      className={`${
                        isMobile
                          ? 'bg-slate-50 dark:bg-slate-800/30 p-2'
                          : `p-3 ${
                              !isLastComment
                                ? 'border-b border-slate-200 dark:border-slate-700/50'
                                : ''
                            }`
                      }`}
                    >
                      <div className="flex items-start">
                        {comment.avatar ? (
                          <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-slate-200 dark:border-slate-700">
                            <Image
                              src={comment.avatar}
                              alt={`${comment.nickname}的头像`}
                              fill
                              loading="eager"
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700/50 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0 border border-slate-200 dark:border-slate-700">
                            <User className="h-4 w-4" />
                          </div>
                        )}

                        <div className="ml-2 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-medium text-slate-700 dark:text-blue-100">
                                {comment.nickname}
                              </span>
                              {repliedTo && (
                                <span className="text-xs text-slate-500 dark:text-slate-500">
                                  回复{' '}
                                  <span className="text-blue-600 dark:text-blue-300">
                                    {repliedTo}
                                  </span>
                                </span>
                              )}
                              <span className="text-xs text-slate-500 dark:text-slate-500">
                                {formatDate(comment.createTime)}
                              </span>
                            </div>
                            {administrator && (
                              <button
                                onClick={() => onDeleteComment(essay.id, comment.id)}
                                className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 flex items-center gap-1"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>删除</span>
                              </button>
                            )}
                          </div>
                          <p
                            className={`text-sm text-slate-700 dark:text-slate-300  ${
                              isMobile
                                ? 'cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700/20 rounded'
                                : ''
                            }
                          }`}
                            onClick={() => isMobile && onToggleReplyBox(comment.id)}
                          >
                            {comment.content}
                          </p>

                          {/* 评论操作区 */}
                          <div className="flex items-center gap-4 mt-1">
                            {!isMobile && (
                              <button
                                onClick={() => onToggleReplyBox(comment.id)}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
                              >
                                <Reply className="h-3 w-3" />
                                <span>回复</span>
                              </button>
                            )}
                          </div>

                          {/* 回复输入框 */}
                          {showReplyBox[comment.id] && (
                            <div className="mt-2 relative">
                              <textarea
                                ref={el => {
                                  replyInputRefs.current[comment.id] = el
                                }}
                                value={replyInputs[comment.id] || ''}
                                onChange={e => onReplyChange(comment.id, e.target.value)}
                                placeholder={`回复 @${comment.nickname}：`}
                                className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-2 pr-16 text-xs text-slate-700 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors resize-none h-16"
                              />
                              <div className="flex justify-end">
                                <button
                                  onClick={() => handleSubmitReply(comment.id)}
                                  className="absolute right-2 bottom-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm transition-colors disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center gap-1"
                                  disabled={!replyInputs[comment.id]?.trim() || !userInfo}
                                >
                                  <Send className="h-4 w-4" />
                                  发送回复
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center text-slate-500 dark:text-slate-500 text-sm py-3">
                暂无评论，快来发表第一条评论吧
              </div>
            )}
          </div>
        </div>
      </div>
    )
  },
  (prevProps, nextProps) => {
    // 自定义比较函数，只有当关键props变化时才重新渲染
    return (
      prevProps.essay.id === nextProps.essay.id &&
      prevProps.essay.likeCount === nextProps.essay.likeCount &&
      prevProps.essay.isLiked === nextProps.essay.isLiked &&
      prevProps.essay.commentCount === nextProps.essay.commentCount &&
      prevProps.commentInput === nextProps.commentInput &&
      JSON.stringify(prevProps.replyInputs) === JSON.stringify(nextProps.replyInputs) &&
      JSON.stringify(prevProps.showReplyBox) === JSON.stringify(nextProps.showReplyBox)
    )
  }
)

EssayCard.displayName = 'EssayCard'

export default function EssayPage() {
  const { userInfo: contextUserInfo, administrator, onShowLogin } = useUser()

  // 用户信息状态管理
  const [userInfo, setUserInfo] = useState<UserInfo>(() => {
    if (contextUserInfo) {
      return contextUserInfo
    }

    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('userInfo')
      if (storedUser) {
        try {
          return JSON.parse(storedUser)
        } catch (e) {
          console.error('Failed to parse user info from localStorage', e)
          return null
        }
      }
    }
    return null
  })

  // 监听context用户信息变化
  useEffect(() => {
    if (contextUserInfo) {
      setUserInfo(contextUserInfo)
      if (typeof window !== 'undefined') {
        localStorage.setItem('userInfo', JSON.stringify(contextUserInfo))
      }
    }
  }, [contextUserInfo])

  // 使用 useReducer 管理随笔状态
  const [state, dispatch] = useReducer(essayReducer, {
    essays: [],
    loading: true,
    commentInputs: {},
    replyInputs: {},
    showReplyBox: {}
  })

  const [screenWidth, setScreenWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  )

  // 图片放大和视频播放状态
  const [zoomData, setZoomData] = useState<{
    visible: boolean
    url: string
    type: FileType
  }>({ visible: false, url: '', type: 'image' })

  // 监听屏幕尺寸变化
  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // API调用函数
  const fetchData = async (url: string, method: string = 'GET', data?: unknown) => {
    try {
      const response = await apiClient({
        url,
        method,
        data: method !== 'GET' ? data : undefined,
        params: method === 'GET' ? data : undefined
      })

      return response.data
    } catch (error) {
      console.log(`Error fetching ${url}:`, error)
      return { code: 500, data: [] }
    }
  }

  // 初始化获取随笔列表
  useEffect(() => {
    getEssayList()
  }, [])

  // 获取随笔列表并转换格式
  const getEssayList = async () => {
    dispatch({ type: 'SET_LOADING', payload: true })
    const queryParams = userInfo?.id ? { userId: userInfo.id } : {}
    const res = await fetchData(ENDPOINTS.ESSAYS, 'GET', queryParams)

    if (res.code === 200 && res.data.length > 0) {
      const formattedList: Essay[] = res.data.map((item: ApiEssay) => {
        const comments: Comment[] = (item.essayComments || []).map(comment => ({
          id: comment.id,
          userId: comment.user.id,
          nickname: comment.user.nickname,
          avatar: comment.user.avatar,
          content: comment.content,
          createTime: comment.createTime || new Date().toISOString(),
          parentCommentId: comment.parentEssayComment?.id,
          adminComment: comment.adminComment
        }))

        return {
          id: item.id,
          userId: item.user.id,
          nickname: item.user.nickname,
          avatar: item.user.avatar,
          title: item.title,
          content: item.content,
          createTime: item.createTime,
          likeCount: item.likes || 0,
          isLiked: item.liked || false,
          comments,
          commentCount: comments.length,
          fileList: item.essayFileUrls?.length
            ? {
                Images: item.essayFileUrls
                  .filter((file: EssayFileUrl) => file.urlType === 'IMAGE')
                  .map((file: EssayFileUrl) => file.url),
                Videos: item.essayFileUrls
                  .filter((file: EssayFileUrl) => file.urlType === 'VIDEO')
                  .map((file: EssayFileUrl) => file.url),
                Texts: item.essayFileUrls
                  .filter((file: EssayFileUrl) => file.urlType === 'TEXT')
                  .map((file: EssayFileUrl) => file.url)
              }
            : { Images: [], Videos: [], Texts: [] },
          recommend: item.recommend || false // 添加recommend字段
        }
      })

      const sortedList = formattedList.sort((a, b) => {
        // 首先按照recommend字段排序，recommend为true的排在前面
        if (a.recommend && !b.recommend) return -1
        if (!a.recommend && b.recommend) return 1
        // 如果recommend字段相同，则按照创建时间排序
        return new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
      })

      dispatch({ type: 'SET_ESSAYS', payload: sortedList })
    } else {
      console.log('API获取数据失败')
    }
    dispatch({ type: 'SET_LOADING', payload: false })
  }

  // 点赞/取消点赞
  const toggleLike = useCallback(
    async (essayId: number) => {
      if (!userInfo) {
        showAlert('请先登录再点赞')
        onShowLogin()
        return
      }

      // 找到当前随笔
      const currentEssay = state.essays.find(essay => essay.id === essayId)
      if (!currentEssay) return

      const currentIsLiked = currentEssay.isLiked
      const newIsLiked = !currentIsLiked
      const newLikeCount = currentIsLiked ? currentEssay.likeCount - 1 : currentEssay.likeCount + 1

      // 立即更新UI
      dispatch({
        type: 'UPDATE_LIKE',
        payload: { essayId, isLiked: newIsLiked, likeCount: newLikeCount }
      })

      try {
        // 调用API
        const res = await fetchData(`${ENDPOINTS.ESSAYS}/${essayId}/like`, 'POST', {
          userId: userInfo.id,
          essayId: essayId,
          isLike: newIsLiked
        })

        if (res.code !== 200) {
          // 如果API调用失败，回滚状态
          dispatch({
            type: 'UPDATE_LIKE',
            payload: { essayId, isLiked: currentIsLiked, likeCount: currentEssay.likeCount }
          })
          showAlert('操作失败，请重试')
        }
      } catch (error) {
        console.log('点赞操作失败:', error)
        // 回滚状态
        dispatch({
          type: 'UPDATE_LIKE',
          payload: { essayId, isLiked: currentIsLiked, likeCount: currentEssay.likeCount }
        })
        showAlert('操作失败，请重试')
      }
    },
    [userInfo, state.essays, onShowLogin]
  )

  // 处理评论输入变化
  const handleCommentChange = useCallback((essayId: number, value: string) => {
    dispatch({ type: 'SET_COMMENT_INPUT', payload: { essayId, value } })
  }, [])

  // 提交评论
  const submitComment = useCallback(
    async (essayId: number) => {
      if (!userInfo) {
        showAlert('请先登录再评论')
        onShowLogin()
        return
      }

      const content = state.commentInputs[essayId]?.trim()
      if (!content) {
        showAlert('评论内容不能为空')
        return
      }

      try {
        const res = await fetchData(`${ENDPOINTS.ESSAYS}/${essayId}/comments`, 'POST', {
          userId: userInfo.id,
          content,
          parentCommentId: -1
        })

        if (res.code === 200) {
          // 创建新评论对象
          const newComment: Comment = {
            id: res.data.id,
            userId: userInfo.id,
            nickname: userInfo.nickname || '',
            avatar: userInfo.avatar || '',
            content,
            createTime: new Date().toISOString(),
            parentCommentId: null,
            adminComment: administrator || false
          }

          // 更新状态
          dispatch({ type: 'ADD_COMMENT', payload: { essayId, comment: newComment } })

          // 清空输入框
          dispatch({ type: 'SET_COMMENT_INPUT', payload: { essayId, value: '' } })
          showAlert('评论成功')
        } else {
          showAlert('评论失败，请重试')
        }
      } catch (error) {
        console.log('评论操作失败:', error)
        showAlert('评论失败，请重试')
      }
    },
    [userInfo, state.commentInputs, administrator, onShowLogin]
  )

  // 提交回复
  const submitReply = useCallback(
    async (essayId: number, commentId: number) => {
      if (!userInfo) {
        showAlert('请先登录再回复')
        onShowLogin()
        return
      }

      const content = state.replyInputs[commentId]?.trim()
      if (!content) {
        showAlert('回复内容不能为空')
        return
      }

      try {
        const res = await fetchData(`${ENDPOINTS.ESSAYS}/${essayId}/comments`, 'POST', {
          userId: userInfo.id,
          content,
          parentCommentId: commentId || -1
        })

        if (res.code === 200) {
          // 创建新回复对象
          const newReply: Comment = {
            id: res.data.id, // 假设API返回新评论的ID
            userId: userInfo.id,
            nickname: userInfo.nickname || '',
            avatar: userInfo.avatar || '',
            content,
            createTime: new Date().toISOString(),
            parentCommentId: commentId,
            adminComment: administrator || false
          }

          // 更新状态
          dispatch({ type: 'ADD_COMMENT', payload: { essayId, comment: newReply } })

          // 清空输入框并隐藏回复框
          dispatch({ type: 'SET_REPLY_INPUT', payload: { commentId, value: '' } })
          dispatch({ type: 'TOGGLE_REPLY_BOX', payload: { commentId, value: false } })
          showAlert('回复成功')
        } else {
          showAlert('回复失败，请重试')
        }
      } catch (error) {
        console.log('回复操作失败:', error)
        showAlert('回复失败，请重试')
      }
    },
    [userInfo, state.replyInputs, administrator, onShowLogin]
  )

  // 删除评论（仅管理员）
  const deleteComment = useCallback(
    async (essayId: number, commentId: number) => {
      if (!administrator) {
        showAlert('没有权限删除评论')
        return
      }
      try {
        const res = await fetchData(`${ENDPOINTS.ESSAYS}/comments/${commentId}/delete`, 'GET')

        if (res.code === 200) {
          // 更新状态
          dispatch({ type: 'DELETE_COMMENT', payload: { essayId, commentId } })
          showAlert('删除成功')
        } else {
          showAlert('删除失败，请重试')
        }
      } catch (error) {
        console.log('删除评论操作失败:', error)
        showAlert('删除失败，请重试')
      }
    },
    [administrator]
  )

  // 处理回复输入变化
  const handleReplyChange = useCallback((commentId: number, value: string) => {
    dispatch({ type: 'SET_REPLY_INPUT', payload: { commentId, value } })
  }, [])

  // 切换回复框显示状态
  const toggleReplyBox = useCallback(
    (commentId: number) => {
      if (!userInfo) {
        showAlert('请先登录再回复')
        onShowLogin()
        return
      }

      const currentValue = state.showReplyBox[commentId] || false
      dispatch({ type: 'TOGGLE_REPLY_BOX', payload: { commentId, value: !currentValue } })
    },
    [userInfo, state.showReplyBox, onShowLogin]
  )

  // 日期格式化
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) {
      return `${diffInSeconds}秒前`
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60)
    if (diffInMinutes < 60) {
      return `${diffInMinutes}分钟前`
    }

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) {
      return `${diffInHours}小时前`
    }

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) {
      return `${diffInDays}天前`
    }

    return new Intl.DateTimeFormat('zh-CN', {
      month: 'short',
      day: 'numeric'
    }).format(date)
  }, [])

  // 打开文件
  const openFile = useCallback((url: string) => {
    const fileType = getFileType(url)

    if (fileType === 'text') {
      const a = document.createElement('a')
      a.href = url
      a.download = getFileName(url)
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } else if (fileType === 'image') {
      setZoomData({
        visible: true,
        url,
        type: fileType
      })
    }
  }, [])

  // 关闭放大弹窗
  const closeZoom = useCallback(() => {
    setZoomData(prev => ({ ...prev, visible: false }))
  }, [])

  // 获取被回复的用户昵称
  const getRepliedUserNickname = useCallback(
    (comments: Comment[], parentId: number | null | undefined) => {
      if (!parentId) return null
      const parentComment = comments.find(comment => comment.id === parentId)
      return parentComment?.nickname || null
    },
    []
  )

  // 定义响应式判断变量
  const isMobile = screenWidth < 768
  const isTablet = screenWidth >= 768 && screenWidth < 1024

  return (
    <div className="min-h-screen z-1 flex flex-col bg-white dark:bg-slate-950 overflow-hidden">
      {/* 隐藏滚动条但保留滚动功能 */}
      <style jsx global>{`
        ::-webkit-scrollbar {
          display: none;
        }
        html {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* 背景装饰 */}
      <div className="fixed inset-0 bg-white/80 dark:bg-gray-900/40"></div>

      {/* 图片放大弹窗 */}
      {zoomData.visible && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={closeZoom}
        >
          <button
            className="absolute top-20 right-4 text-white bg-black/50 p-2 rounded-full hover:bg-black/70 transition-colors"
            onClick={e => {
              e.stopPropagation()
              closeZoom()
            }}
          >
            <X className="h-6 w-6" />
          </button>

          {zoomData.type === 'image' && (
            <div className="max-w-full max-h-[80vh] relative" onClick={e => e.stopPropagation()}>
              <Image
                src={zoomData.url}
                alt="放大图片"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 720px"
                width={1200}
                height={800}
                priority={true}
                className="max-w-full max-h-[90vh] object-contain"
              />
            </div>
          )}
        </div>
      )}

      {/* 主内容区 */}
      <main
        className={`flex-1 w-full mx-auto lg:py-0 relative z-10 px-0 md:px-6 lg:px-8 page-transition`}
      >
        <div className="max-w-5xl mx-auto">
          {/* 随笔列表 */}
          <div className="space-y-0">
            {state.loading ? (
              // 加载状态骨架屏 - 优化后
              <div className="space-y-0">
                {[1, 2, 3].map(item => (
                  <div
                    key={item}
                    className={`${
                      isMobile
                        ? 'w-full border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60'
                        : 'bg-white/80 dark:bg-slate-800/40 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 dark:border-slate-700/50 transition-all duration-300 overflow-hidden'
                    } animate-pulse`}
                  >
                    <div className={`${isMobile ? 'px-4 pt-2' : 'p-6'}`}>
                      {/* 用户信息骨架 */}
                      <div className="flex items-center mb-4">
                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700/50 flex-shrink-0 border border-slate-200 dark:border-slate-700"></div>
                        <div className="ml-3 flex-1">
                          <div className="flex flex-wrap items-center justify-between">
                            <div className="h-4 bg-slate-200 dark:bg-slate-700/50 rounded w-24"></div>
                            <div className="h-3 bg-slate-200 dark:bg-slate-700/50 rounded w-16 flex items-center gap-1 ml-2">
                              <div className="h-3 w-3 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 内容区域骨架 */}
                      <div className={`mb-4 ${isMobile ? 'text-base' : ''} overflow-hidden`}>
                        {/* 标题骨架 */}
                        <div className="h-6 bg-slate-200 dark:bg-slate-700/50 rounded w-3/4 mb-3"></div>
                        {/* 内容骨架 */}
                        <div className="space-y-2">
                          <div className="h-4 bg-slate-200 dark:bg-slate-700/50 rounded w-full"></div>
                          <div className="h-4 bg-slate-200 dark:bg-slate-700/50 rounded w-full"></div>
                          <div className="h-4 bg-slate-200 dark:bg-slate-700/50 rounded w-3/4"></div>
                        </div>
                      </div>

                      {/* 文件展示区域骨架 - 随机显示不同组合 */}
                      <div className="mb-5 space-y-4">
                        {Math.random() > 0.3 && (
                          <div className="w-full h-14 p-2 bg-slate-100 dark:bg-slate-900/60 flex items-center gap-2 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                            <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700/50 rounded flex items-center justify-center">
                              <FileText className="h-4 w-4 text-slate-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="h-4 bg-slate-200 dark:bg-slate-700/50 rounded w-3/4 mb-1"></div>
                              <div className="h-3 bg-slate-200 dark:bg-slate-700/50 rounded w-1/2"></div>
                            </div>
                          </div>
                        )}

                        {Math.random() > 0.2 && (
                          <div
                            className={
                              isMobile
                                ? Math.random() > 0.5
                                  ? 'grid grid-cols-1 gap-1'
                                  : 'grid grid-cols-2 gap-1'
                                : 'grid grid-cols-2 gap-3'
                            }
                          >
                            {[...Array(Math.random() > 0.5 ? 1 : 2)].map((_, i) => (
                              <div
                                key={i}
                                className="aspect-video bg-slate-200 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700 relative overflow-hidden"
                              >
                                {i === 0 && (
                                  <div className="absolute inset-0 bg-white/30 dark:bg-black/30 flex items-center justify-center"></div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 互动区域骨架 */}
                      <div
                        className={`flex justify-between items-center ${
                          isMobile
                            ? 'pt-1 pb-2'
                            : 'pt-2 border-t border-slate-200 dark:border-slate-700/30 mb-2'
                        }`}
                      >
                        <div className="h-8 bg-slate-200 dark:bg-slate-700/50 rounded-full w-20 flex items-center justify-center px-3">
                          <Heart className="h-4 w-4 text-slate-500" />
                          <div className="h-3 w-3 bg-slate-300 dark:bg-slate-600 rounded ml-1"></div>
                        </div>
                        <div className="h-8 bg-slate-200 dark:bg-slate-700/50 rounded-full w-20 flex items-center justify-center px-3">
                          <MessageCircle className="h-4 w-4 text-slate-500" />
                          <div className="h-3 w-3 bg-slate-300 dark:bg-slate-600 rounded ml-1"></div>
                        </div>
                      </div>

                      {/* 评论输入框骨架 */}
                      <div className={`relative flex items-center`}>
                        <div
                          className={`w-full bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-t-lg p-3 pr-20 ${
                            isMobile ? 'h-10' : 'h-14'
                          }`}
                        ></div>
                        <div className="absolute right-2 h-8 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full w-12 flex items-center justify-center">
                          <span className="h-3 bg-blue-600 dark:bg-blue-400 rounded w-6"></span>
                        </div>
                      </div>

                      {/* 评论列表骨架 */}
                      <div
                        className={`space-y-3 border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/30 rounded-b-lg ${
                          isMobile ? 'mb-4' : ''
                        }`}
                      >
                        {Math.random() > 0.3 && (
                          <div
                            className={`${
                              isMobile
                                ? 'bg-slate-100 dark:bg-slate-800/30 p-2'
                                : 'p-3 border-b border-slate-200 dark:border-slate-700/50'
                            }`}
                          >
                            <div className="flex items-start">
                              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700/50 flex-shrink-0 border border-slate-200 dark:border-slate-700"></div>
                              <div className="ml-2 flex-1">
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                                  <div className="h-4 bg-slate-200 dark:bg-slate-700/50 rounded w-16"></div>
                                  <div className="h-3 bg-slate-200 dark:bg-slate-700/50 rounded w-12"></div>
                                  <div className="h-4 bg-slate-200 dark:bg-slate-700/50 rounded w-8 flex items-center justify-center">
                                    <Reply className="h-3 w-3 text-slate-500" />
                                  </div>
                                </div>
                                <div className="h-4 bg-slate-200 dark:bg-slate-700/50 rounded w-full mb-1"></div>
                                <div className="h-4 bg-slate-200 dark:bg-slate-700/50 rounded w-3/4"></div>
                              </div>
                            </div>
                          </div>
                        )}

                        {Math.random() > 0.5 && (
                          <div className="mt-2 relative pl-6">
                            <div className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-2 pr-16 h-16"></div>
                            <div className="absolute right-2 bottom-2 h-6 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded w-8 flex items-center justify-center">
                              <span className="h-2 bg-blue-600 dark:bg-blue-400 rounded w-4"></span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : state.essays.length > 0 ? (
              state.essays.map(essay => (
                <EssayCard
                  key={essay.id}
                  essay={essay}
                  isMobile={isMobile}
                  userInfo={userInfo}
                  administrator={administrator}
                  onToggleLike={toggleLike}
                  onSubmitComment={submitComment}
                  onSubmitReply={submitReply}
                  onDeleteComment={deleteComment}
                  commentInput={state.commentInputs[essay.id] || ''}
                  replyInputs={state.replyInputs}
                  showReplyBox={state.showReplyBox}
                  onCommentChange={handleCommentChange}
                  onReplyChange={handleReplyChange}
                  onToggleReplyBox={toggleReplyBox}
                  formatDate={formatDate}
                  openFile={openFile}
                  getRepliedUserNickname={getRepliedUserNickname}
                />
              ))
            ) : (
              <div
                className={`${
                  isMobile
                    ? 'w-full p-6'
                    : 'bg-white/80 dark:bg-slate-800/40 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50 p-12 mx-auto max-w-2xl'
                } text-center`}
              >
                <div className="text-slate-500 dark:text-slate-500 mb-4">
                  <BookOpen className="h-12 w-12 mx-auto" />
                </div>
                <p className="text-slate-600 dark:text-slate-400">暂无随笔内容</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
