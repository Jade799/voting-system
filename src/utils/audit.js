const API_KEY = 'ciCXad9TUoRtpmoBwysXQmr'
const SECRET_KEY = 'KlVlgYRoywQePMsMnTLK0YdXNRVR6aPu'

const getAccessToken = async () => {
  const url = `/baidu-api/oauth/2.0/token?grant_type=client_credentials&client_id=${API_KEY}&client_secret=${SECRET_KEY}`
  const res = await fetch(url)
  const data = await res.json()
  return data.access_token || null
}

export const checkTextSafe = async (text) => {
  try {
    const token = await getAccessToken()
    if (!token) return { safe: true, msg: '审核服务暂不可用，已放行' }

    const url = `/baidu-api/rest/2.0/solution/v1/img_conf/v1/text_censor/v1/user_defined?access_token=${token}`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ text })
    })

    const result = await response.json()
    if (result.conclusionType === 1) return { safe: true }
    return { safe: false, msg: result.data?.[0]?.msg || '内容包含敏感信息，请修改后重试' }
  } catch (error) {
    console.warn('审核服务通信异常，已临时放行:', error)
    return { safe: true, msg: '审核服务超时，已临时放行' }
  }
}
