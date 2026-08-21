import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

crons.interval(
  'check dead links',
  { hours: 24 },
  (internal as any).metadata.checkAllDeadLinks
)
crons.interval(
  'purge old trash',
  { hours: 24 },
  (internal as any).bookmarks.purgeOldTrash
)

export default crons
