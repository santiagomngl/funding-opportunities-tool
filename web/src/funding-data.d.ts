// Provided by the funding-data plugin in vite.config.ts: the agent data files,
// read when the site is built.
declare module "virtual:funding-data" {
  const data: import("./lib/types.ts").SiteData;
  export default data;
}
