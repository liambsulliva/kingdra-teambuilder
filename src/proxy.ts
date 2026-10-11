import { clerkMiddleware } from '@clerk/nextjs/server';

// Only the API reads the session on the server. The page itself is static and
// loads the library from the client, so it skips Clerk here: a returning user
// whose short-lived session token has expired would otherwise wait on a
// handshake redirect through Clerk before the HTML arrives.
//
// /__clerk is Clerk's Frontend API proxy. A live instance on *.vercel.app has no
// clerk.<domain> CNAME, so clerk-js sends its sign-in and session calls there. The path
// has to be matched or Next answers 404 before Clerk sees the request. The proxy is keyed
// off the live publishable key, not the request host, because the host Next reports is
// not guaranteed to be the public one. Development keys keep talking to Clerk directly.
const liveKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_live_') ?? false;

export default clerkMiddleware({ frontendApiProxy: { enabled: liveKey } });
export const config = {
	matcher: ['/__clerk(.*)', '/(api|trpc)(.*)'],
};
