export const songs: string[] = Object.keys(
	import.meta.glob('/static/trackerfiles/**/*')
).map(p => p.replace(/^\/static/, '')).sort((a, b) =>
	a.localeCompare(b, undefined, { sensitivity: 'base' })
)