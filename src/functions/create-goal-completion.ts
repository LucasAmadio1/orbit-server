import dayjs from 'dayjs'
import { count, eq, lte, sql } from 'drizzle-orm'
import { and } from 'drizzle-orm'
import { gte } from 'drizzle-orm'
import { db } from '../db'
import { goalCompletions, goals, users } from '../db/schema'

interface CreateGoalCompletionRequest {
  userId: string
  goalId: string
}

export async function createGoalCompletion({
  userId,
  goalId,
}: CreateGoalCompletionRequest) {
  const firstDayOfWeek = dayjs().startOf('week').toDate()
  const lastDayOfWeek = dayjs().endOf('week').toDate()

  const goalsCompletionCounts = db.$with('goal_completion_counts').as(
    db
      .select({
        goalId: goalCompletions.goalId,
        completionCount: count(goalCompletions.id).as('completionCount'),
      })
      .from(goalCompletions)
      .innerJoin(goals, eq(goals.id, goalCompletions.goalId))
      .where(
        and(
          gte(goalCompletions.createdAt, firstDayOfWeek),
          lte(goalCompletions.createdAt, lastDayOfWeek),
          eq(goalCompletions.goalId, goalId),
          eq(goals.userId, userId)
        )
      )
      .groupBy(goalCompletions.goalId)
  )

  const result = await db
    .with(goalsCompletionCounts)
    .select({
      desiredWeeklyFrequency: goals.desiredWeeklyFrequency,
      completionCount: sql`
              COALESCE(${goalsCompletionCounts.completionCount}, 0)
            `.mapWith(Number),
    })
    .from(goals)
    .leftJoin(goalsCompletionCounts, eq(goalsCompletionCounts.goalId, goals.id))
    .where(and(eq(goals.id, goalId), eq(goals.userId, userId)))
    .limit(1)

  const { completionCount, desiredWeeklyFrequency } = result[0]

  if (completionCount >= desiredWeeklyFrequency) {
    throw new Error('Goal already completed this week!')
  }

  const isLastCompletionFromGoal =
    completionCount + 1 === desiredWeeklyFrequency

  const earnedExperience = isLastCompletionFromGoal ? 7 : 5

  const goalCompletion = await db.transaction(async (tx) => {
    const [goalCompletion] = await db
      .insert(goalCompletions)
      .values({ goalId })
      .returning()

    await db
      .update(users)
      .set({
        experience: sql`${users.experience} + ${earnedExperience}`,
      })
      .where(eq(users.id, userId))

    return goalCompletion
  })

  return {
    goalCompletion,
  }
}
