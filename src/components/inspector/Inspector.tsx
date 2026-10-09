'use client';

import { IconButton } from '@/components/ui/IconButton';
import type { IconName } from '@/components/ui/Icon';
import { Workspace } from '@/components/workspace/Workspace';
import { fieldsFor } from '@/lib/dex';
import { useOpenTeam, useSelectedMember, useStore, type InspectorView } from '@/lib/store';
import { StatsView } from './StatsView';
import { MovesView } from './MovesView';
import { AbilityView, DetailsView, ItemView, LevelView, NatureView, TeraView } from './Pickers';
import { CompareView, MatchupsView, TeamView } from './AnalysisViews';
import { LocationsView, PokedexView } from './PokedexViews';

/**
 * Right panel. Views swap instantly by design: no transition here. In the merged
 * (tablet) layout the workspace is its first tab, so the card and party live here too.
 */
export function Inspector() {
	const team = useOpenTeam();
	const member = useSelectedMember();
	const view = useStore((s) => s.inspector);
	const merged = useStore((s) => s.merged);
	const compare = useStore((s) => s.compareSpecies);
	const setInspector = useStore((s) => s.setInspector);
	const casual = team.mode === 'casual';
	const fields = fieldsFor(team);
	// Each key row on the card has a tab of its own too, shown only where the format has that field.
	const editors: [InspectorView, IconName, string, boolean][] = [
		['level', 'level', 'Level', fields.level],
		['ability', 'ability', 'Ability', fields.ability],
		['item', 'item', 'Item', fields.item],
		['nature', 'nature', 'Nature', fields.nature],
		['tera', 'tera', 'Tera', fields.tera],
		['moves', 'moves', 'Moves', true],
	];
	const shown = editors.filter(([, , , on]) => on).map(([v, icon, label]) => [v, icon, label] as [InspectorView, IconName, string]);
	const views: [InspectorView, IconName, string][] = casual
		? [['team', 'team', 'Team analysis'], ['pokedex', 'pokedex', 'Pokédex'], ['locations', 'locations', 'Locations'], ...shown, ['matchups', 'matchups', 'Matchups']]
		: [['team', 'team', 'Team analysis'], ['stats', 'stats', 'Stats'], ...shown, ['matchups', 'matchups', 'Matchups'], ['details', 'details', 'Details']];
	// Merged: the card comes first, and while comparing the Compare analysis sits beside it.
	const tabs: [InspectorView, IconName, string][] = merged
		? [['card', 'party', 'Party and card'], ...(compare ? [['compare', 'compare', 'Compare'] as [InspectorView, IconName, string]] : []), ...views]
		: views;
	const needsMember = (v: InspectorView) => v !== 'team' && v !== 'compare' && v !== 'card';
	const home: InspectorView = merged ? 'card' : 'team';
	const current: InspectorView = view === 'card' && !merged ? 'team' : view === 'compare' && !compare ? home : needsMember(view) && !member ? home : view;

	const strip = (
		<div className='flex min-h-[48px] shrink-0 flex-wrap items-center gap-0.5 border-b border-line px-4 py-1'>
			{tabs.map(([v, icon, label]) => (
				<IconButton
					key={v}
					icon={icon}
					label={label}
					selected={current === v}
					disabled={v !== 'card' && v !== 'compare' && (!!compare || (needsMember(v) && !member))}
					onClick={() => setInspector(v)}
				/>
			))}
		</div>
	);

	if (current === 'card')
		return (
			<aside aria-label='Inspector' className='flex min-h-0 flex-1 flex-col'>
				{strip}
				<Workspace />
			</aside>
		);

	let body: React.ReactNode = null;
	if (current === 'team') body = <TeamView team={team} />;
	else if (current === 'compare' && compare) body = <CompareView team={team} candidate={compare} />;
	else if (member) {
		const props = { team, member };
		body = {
			stats: <StatsView {...props} />,
			moves: <MovesView key={member.uid} {...props} />,
			ability: <AbilityView {...props} />,
			item: <ItemView {...props} />,
			nature: <NatureView {...props} />,
			tera: <TeraView {...props} />,
			level: <LevelView {...props} />,
			details: <DetailsView {...props} />,
			matchups: <MatchupsView {...props} />,
			pokedex: <PokedexView {...props} />,
			locations: <LocationsView {...props} />,
		}[current as Exclude<InspectorView, 'team' | 'compare' | 'card'>];
	}

	return (
		<aside aria-label='Inspector' className='flex min-h-0 flex-1 flex-col'>
			{strip}
			<div className='min-h-0 flex-1 overflow-y-auto px-6 py-5'>{body}</div>
		</aside>
	);
}
