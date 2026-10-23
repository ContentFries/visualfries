// visualfries.com: send the bare domain to www with a permanent redirect, serve everything else from the static build.
export default {
	/** @param {Request} request @param {{ ASSETS: { fetch: (request: Request) => Promise<Response> } }} env */
	async fetch(request, env) {
		const url = new URL(request.url);
		if (url.hostname === 'visualfries.com') {
			url.hostname = 'www.visualfries.com';
			return Response.redirect(url.toString(), 301);
		}
		return env.ASSETS.fetch(request);
	}
};
