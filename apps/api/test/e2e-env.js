// Runs before load-env.js: e2e suites make many auth calls from one IP, so lift the throttle
// unless a suite sets its own limit. Explicit env always wins.
if (process.env.AUTH_THROTTLE_LIMIT === undefined) process.env.AUTH_THROTTLE_LIMIT = '10000';
if (process.env.AUTH_REFRESH_THROTTLE_LIMIT === undefined) process.env.AUTH_REFRESH_THROTTLE_LIMIT = '10000';
