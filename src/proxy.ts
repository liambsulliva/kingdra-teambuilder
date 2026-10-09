import { clerkMiddleware } from '@clerk/nextjs/server';

// Only the API reads the session on the server. The page itself is static and
// loads the library from the client, so it skips Clerk here: a returning user
// whose short-lived session token has expired would otherwise wait on a
// handshake redirect through Clerk before the HTML arrives.
export default clerkMiddleware();
export const config = {
	matcher: ['/(api|trpc)(.*)'],
};
