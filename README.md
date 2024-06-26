## 👋 Introduction

This is a full-stack Pokemon Teambuilder I am currently building. I started this project because I was building a little teambuilder for a pokemon draft league for my friends (think fantasy football if it was pokemon). It morphed into something else entirely, when I realized that a lot of the pokemon teambuilders on the market had pretty terrible UIs and lacked the ability to actually set moves and stats, unless you are using something like Pokemon Showdown. There is also a crucial lack of a tool that does Casual and Competitive teams at the same time. I hope to build this application into a tool that can do both, and adapt to the user's preferences at any given moment.

## 💻 Demo

Check out the [Demo](https://pokedraft.liambsullivan.com), hosted on Vercel.

## 💪 Features:
    
- ✅ Infinite Scroll to select pokemon
- ✅ Stat Calculator using Pokemon's IV/EVs + Natures + Lv
- ✅ Duplicate Pokemon Checks
- ✅ Login System via Clerk
- ✅ Smogon Breakdown
- ✅ Ability Select


## 🛣️ Roadmap

- ❌ Dark Mode Support
- ❌ Proper Responsiveness
- ❌ Input Validation
- ❌ Capitalized Natures
- ❌ POST + GET bug on first pokemon addition
- ❌ Import/Export Locally + Globally
- ❌ Casual Mode
- ❌ Multiple Team Support
- ❌ Search fetches from Backend
- ❌ Custom Sign-in Page
- ❌ Prefetch Pokemon Info preclick
- ❌ EV Limit


## ⚙️ Stack

- [**NextJS** + **Typescript**](https://nextjs.org) - NextJS is an all-in-one web framework that includes inbuilt SSR among other optimizations.
- [**Tailwind CSS**](https://tailwindcss.com/) - Tailwind CSS is a utility-first CSS framework.
- [**React**](https://react.dev) - A JavaScript library for building user interfaces.
- [**Flowbite**](https://flowbite.com/) - An extensible UI library built for Tailwind.
- [**Flowbite-React**](https://www.npmjs.com/package/flowbite-react) - React components for the Flowbite UI library.
- [**@clerk/nextjs**](https://www.npmjs.com/package/@clerk/nextjs) - A library for adding authentication and user management to Next.js applications.
- [**Mongodb**](https://www.npmjs.com/package/mongodb) - A MongoDB driver for Node.js.
- [**Mongoose**](https://www.npmjs.com/package/mongoose) - An object data modeling (ODM) library for MongoDB and Node.js.
- [**Node-Fetch**](https://www.npmjs.com/package/node-fetch) - A light-weight module that brings window.fetch to Node.js.
- [**Axios**](https://www.npmjs.com/package/axios) - A promise-based HTTP client for the browser and Node.js.
- [**Debounce**](https://www.npmjs.com/package/lodash.debounce) - A utility function that limits the rate at which a function can be called.
- [**dotenv**](https://www.npmjs.com/package/dotenv) - A zero-dependency module that loads environment variables from a .env file.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

- `next dev`: Starts the development server and watches for changes.
- `next build`: Builds the project for production.
- `next start`: Previews the production build locally.
- `next lint`: Lints the project using ESLint.

Make sure to install the Next CLI by running `npm install next`.
To create a new app with next, use `npx create-next-app@latest` instead.
