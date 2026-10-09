import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import dbConnect, { User } from '@/lib/db';
import { normalizeLibrary } from '@/lib/model';
import { migrateLegacy, type LegacyPokemon } from '@/lib/migrate';

export async function GET() {
	const { userId } = await auth();
	if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
	await dbConnect();
	const user = await User.findOne({ clerkUserId: userId }).lean<{
		library?: unknown;
		pokemonParty?: LegacyPokemon[][];
		teamNames?: string[];
	}>();
	if (!user) return NextResponse.json({ library: null });
	if (user.library) return NextResponse.json({ library: normalizeLibrary(user.library) });
	if (user.pokemonParty?.length) {
		return NextResponse.json({ library: migrateLegacy(user.teamNames, user.pokemonParty), migrated: true });
	}
	return NextResponse.json({ library: null });
}

export async function PUT(request: Request) {
	const { userId } = await auth();
	if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
	let body: { library?: unknown };
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
	}
	if (!body.library) return NextResponse.json({ message: 'Missing library' }, { status: 400 });
	const library = normalizeLibrary(body.library);
	library.updatedAt = Date.now();
	await dbConnect();
	await User.updateOne({ clerkUserId: userId }, { $set: { library } }, { upsert: true });
	return NextResponse.json({ updatedAt: library.updatedAt });
}
