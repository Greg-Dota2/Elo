import GroupStageView from './GroupStageView'
import PSBracketView from './PSBracketView'
import { fetchLiveGroupsData, type Tier1Entry } from '@/lib/liveGroups'
import type { GroupData } from './GroupStageView'

interface Props {
  slug: string
  tier1Entry: Tier1Entry | undefined
  isOver: boolean
  archivedGroups: GroupData[] | null
}

export default async function LiveGroupStage({ slug, tier1Entry, isOver, archivedGroups }: Props) {
  const groupsData = await fetchLiveGroupsData(slug, tier1Entry, isOver, archivedGroups)
  if (groupsData.length === 0) return null

  return (
    <>
      <GroupStageView groups={groupsData.filter(g =>
        !/upper|lower|bracket|playoff|elimination|grand.?final/i.test(g.name) || /group/i.test(g.name)
      )} />
      <PSBracketView groups={groupsData} />
    </>
  )
}
