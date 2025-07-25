import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { getUser } from '../../functions/get-user'
import { authenticateUserHook } from '../hooks/authenticate-user'

export const getProfileRoute: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/profile',
    {
      schema: {
        onRequest: [authenticateUserHook],
        tags: ['auth'],
        description: 'Get authenticated user profile',
        operationId: 'getProfile',
        response: {
          200: z.object({
            profile: z.object({
              id: z.string(),
              name: z.string().nullable(),
              email: z.string().nullable(),
              avatarUrl: z.string().url(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.sub

      const { user } = await getUser({ userId })

      return reply.status(200).send({ profile: user })
    }
  )
}
