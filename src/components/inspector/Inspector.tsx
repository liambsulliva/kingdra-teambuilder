'use client';

import { IconButton } from '@/components/ui/IconButton';
import type { IconName } from '@/components/ui/Icon';
import { useOpenTeam, useSelectedMember, useStore, type InspectorView } from '@/lib/store';
import { StatsView } from './StatsView';
import { MovesView } from './MovesView';
import { AbilityView, DetailsView, ItemView, LevelView, NatureView, TeraView } from './Pickers';
import { CompareView, MatchupsView, TeamView } from './AnalysisViews';
import { LocationsView, PokedexView } from './PokedexViews';

/** Right panel. Views swap instantly by design: no transition here. */
export function Inspector() {
	const team = useOpenTeam();
	const member = useSelectedMember();
	const view = useStore((s) => s.inspector);
	const compare = useStore((s) => s.compareSpecies);
	const setInspector = useStore((s) => s.setInspector);
	const activeSlot = useStore((s) => s.activeMoveSlot);
	const casual = team.mode === 'casual';
	const tabs: [InspectorView, IconName, string][] = casual
		? [['team', 'team', 'Team analysis'], ['pokedex', 'pokedex', 'Pokédex'], ['locations', 'locations', 'Locations'], ['matchups', 'matchups', 'Matchups']]
		: [['team', 'team', 'Team analysis'], ['stats', 'stats', 'Stats'], ['matchups', 'matchups', 'Matchups'], ['details', 'details', 'Details']];
	const needsMember = (v: InspectorView) => v !== 'team' && v !== 'compare';
	const current = view === 'compare' && !compare ? 'team' : needsMember(view) && !member ? 'team' : view;

	let body: React.ReactNode = null;
	if (current === 'team') body = <TeamView team={team} />;
	else if (current === 'compare' && compare) body = <CompareView team={team} candidate={compare} />;
	else if (member) {
		const props = { team, member };
		body = {
			stats: <StatsView {...props} />,
			moves: <MovesView key={`${member.uid}:${activeSlot}`} {...props} />,
			ability: <AbilityView {...props} />,
			item: <ItemView {...props} />,
			nature: <NatureView {...props} />,
			tera: <TeraView {...props} />,
			level: <LevelView {...props} />,
			details: <DetailsView {...props} />,
			matchups: <MatchupsView {...props} />,
			pokedex: <PokedexView {...props} />,
			locations: <LocationsView {...props} />,
		}[current as Exclude<InspectorView, 'team' | 'compare'>];
	}

	return (
		<aside aria-label='Inspector' className='flex min-h-0 flex-col'>
			<div className='flex h-12 shrink-0 items-center gap-0.5 border-b border-line px-4'>
				{tabs.map(([v, icon, label]) => (
					<IconButton key={v} icon={icon} label={label} selected={current === v} disabled={needsMember(v) && !member} onClick={() => setInspector(v)} />
				))}
</div>
			<div className='min-h-0 flex-1 overflow-y-auto px-6 py-5'>{body}</div>
		</aside>
	);
}
