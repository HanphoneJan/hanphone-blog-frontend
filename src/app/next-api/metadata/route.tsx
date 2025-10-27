import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'Valid URL is required' }, { status: 400 })
  }

  try {
    // 确保URL格式正确
    let formattedUrl = url

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      formattedUrl = `https://${url}`
    }

    // 设置请求头，模拟浏览器访问
    const response = await fetch(formattedUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const html = await response.text()

    // 简单的元数据提取，不依赖外部库
    const titleMatch = html.match(/<title>(.*?)<\/title>/i)
    const title = titleMatch ? titleMatch[1] : new URL(formattedUrl).hostname

    const descMatch =
      html.match(/<meta name="description" content="(.*?)"/i) ||
      html.match(/<meta property="og:description" content="(.*?)"/i)
    const description = descMatch ? descMatch[1] : ''

    // 尝试获取favicon
    let favicon = ''
    const iconMatch = html.match(/<link rel="(?:icon|shortcut icon)" href="(.*?)"/i)
    if (iconMatch) {
      favicon = iconMatch[1]
      // 处理相对URL
      if (favicon && !favicon.startsWith('http')) {
        try {
          favicon = new URL(favicon, formattedUrl).href
        } catch (e) {
          favicon = ''
          console.log('Error constructing favicon URL:', e)
        }
      }
    }

    // 如果没有找到favicon，尝试使用默认路径
    if (!favicon) {
      try {
        const urlObj = new URL(formattedUrl)
        favicon = `${urlObj.protocol}//${urlObj.hostname}/favicon.ico`
      } catch (e) {
        favicon = ''
        console.log('Error constructing default favicon URL:', e)
      }
    }

    return NextResponse.json({
      title,
      description,
      avatar: favicon
    })
  } catch (error) {
    console.error('Error fetching metadata:', error)

    // 即使出错，也尝试返回基本favicon
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
      const favicon = `${urlObj.protocol}//${urlObj.hostname}/favicon.ico`
      return NextResponse.json({
        title: urlObj.hostname,
        description: '',
        avatar: favicon
      })
    } catch (e) {
      console.log('Error constructing fallback favicon URL:', e)
      return NextResponse.json({ error: 'Failed to fetch metadata' }, { status: 500 })
    }
  }
}
