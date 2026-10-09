/** @type {import('next').NextConfig} */
const nextConfig = {
	// Pokémon Showdown loads its data with dynamic requires; keep it a plain
	// Node dependency of the validation route instead of bundling it.
	serverExternalPackages: ['pokemon-showdown'],
};

export default nextConfig;
