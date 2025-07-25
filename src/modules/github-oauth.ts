import { env } from '../env'

interface AccessTokenResponse {
  access_token: string
}

interface getUserResponse {
  id: number
  name: string | null
  email: string | null
  avatar_url: string
}

export async function getAccessTokenFromCode(code: string) {
  const accessTokenURL = new URL('https://github.com/login/oauth/access_token')

  accessTokenURL.searchParams.set('client_id', env.GITHUB_CLIENT_ID)
  accessTokenURL.searchParams.set('client_secret', env.GITHUB_CLIENT_SECRET)
  accessTokenURL.searchParams.set('code', code)

  const response = await fetch(accessTokenURL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
  })

  const { access_token }: AccessTokenResponse = await response.json()

  return access_token
}

export async function getUserFromAccessToken(accessToken: string) {
  const response = fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const data: getUserResponse = (await response).json()

  return data
}
