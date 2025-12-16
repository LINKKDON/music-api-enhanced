// 歌曲宝解灰接口
// 路由: /song/url/gequbao

const { randomBytes } = require('crypto')

module.exports = async (query, request) => {
  const keyword = query.keywords || query.name
  if (!keyword) {
    return {
      status: 400,
      body: {
        code: 400,
        message: '缺少搜索关键词 keywords',
        data: [],
      },
    }
  }

  try {
    // 1. 搜索获取 ID
    const searchUrl = `https://www.gequbao.com/s/${encodeURIComponent(keyword)}`
    const searchRes = await fetch(searchUrl)
    const searchHtml = await searchRes.text()
    
    // 匹配第一个歌曲链接 /music/12345
    const idMatch = searchHtml.match(/<a href="\/music\/(\d+)" target="_blank" class="music-link d-block">/)
    const id = idMatch ? idMatch[1] : null

    if (!id) {
       return {
        status: 404,
        body: { code: 404, message: '未找到歌曲', data: [] }
      }
    }

    // 2. 获取 play_id
    const musicUrl = `https://www.gequbao.com/music/${id}`
    const musicRes = await fetch(musicUrl)
    const musicHtml = await musicRes.text()
    
    // 匹配 window.appData 中的 play_id
    const playIdMatch = musicHtml.match(/"play_id":"(.*?)"/)
    const playId = playIdMatch ? playIdMatch[1] : null

    if (!playId) {
        return {
        status: 404,
        body: { code: 404, message: '未找到播放ID', data: [] }
      }
    }

    // 3. 获取播放链接
    const apiUrl = 'https://www.gequbao.com/api/play-url'
    const headers = {
      'accept': 'application/json, text/javascript, */*; q=0.01',
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'cookie': `server_name_session=${randomBytes(16).toString('hex')}`,
      'Referer': `https://www.gequbao.com/music/${id}`,
      'x-requested-with': 'XMLHttpRequest',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    const body = `id=${encodeURIComponent(playId)}`
    
    const apiRes = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: body
    })
    
    const data = await apiRes.json()

    if (data.code === 1 && data.data && data.data.url) {
        return {
            status: 200,
            body: {
                code: 200,
                message: '请求成功',
                data: {
                    url: data.data.url,
                    type: 'mp3',
                    source: 'gequbao'
                }
            }
        }
    }

    return {
        status: 404,
        body: { code: 404, message: '获取链接失败', data: [] }
    }

  } catch (error) {
    console.error('Gequbao Error:', error)
    return {
      status: 500,
      body: {
        code: 500,
        message: '服务器错误',
        error: error.message,
        data: []
      }
    }
  }
}