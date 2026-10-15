import type { Team } from '../model';

/** Where the league comes from. A Google Sheet is re-read; an uploaded file never changes. */
export type LeagueSource =
	| { kind: 'google'; sheetId: string; url: string }
	| { kind: 'file'; name: string };

/** One draftable Pokémon: its price, and its Tera value when it can be a Tera Captain. */
export interface TierEntry {
	species: string;
	points: number;
	tera: number | null;
}

export interface ComplexBan {
	species: string;
	/** A move, ability or item that species may not use. */
	with: string;
}

export interface CoachPick {
	species: string;
	captain: boolean;
}

export interface Coach {
	name: string;
	picks: CoachPick[];
}

/** A figure the sheet states, with every place it was found, so the dialog can show disagreements. */
export interface Found {
	value: number;
	where: string;
}

/** Everything read from the league sheet. Replaced as a whole on every sync. */
export interface League {
	source: LeagueSource;
	title: string;
	syncedAt: number;
	tiers: TierEntry[];
	banned: string[];
	complexBans: ComplexBan[];
	coaches: Coach[];
	budget: {
		points: Found[];
		teraPoints: Found[];
		picks: Found[];
	};
	rules: {
		/** The Showdown format the Rules text names, when it names one Kingdra knows. */
		format: string | null;
		level: number | null;
		/** Showdown custom rules built from the Rules text: bans, clauses on (`OHKO Clause`) and off (`!Sleep Clause Mod`). */
		custom: string[];
		/** Rules text lines Kingdra reads and enforces. */
		enforced: string[];
		/** Rules text lines Kingdra can't check, shown so nobody assumes they are. */
		notEnforced: string[];
	};
	/** Sheet names that matched no Pokémon, skipped. */
	unmatched: string[];
}

/** What the user confirmed in the setup dialog. Overrides the sheet until changed. */
export interface DraftSettings {
	format: string;
	points: number;
	teraPoints: number;
	picks: number;
	/** The coach whose Drafts column is this user's. Null to ignore the Drafts tab for suggestions. */
	coach: string | null;
}

export interface RosterEntry {
	uid: string;
	species: string;
	captain: boolean;
	teraType: string;
}

/** The one draft a user keeps: the league, their roster and the battle teams built from it. */
export interface Draft {
	league: League;
	settings: DraftSettings;
	roster: RosterEntry[];
	teams: Team[];
	openTeamId: string;
	/** Dismissed sync suggestions: suggestion key → the sheet value it was dismissed against. */
	dismissed: Record<string, string>;
}
