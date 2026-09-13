import { assertDeploySource } from '../../scripts/production-source-preflight.mjs';

const expectedBranch = process.env.RUOSHUI_PAGES_BRANCH || 'main';
const metadata = assertDeploySource({ expectedBranch });

process.env.RUOSHUI_DEPLOY_COMMIT_SHA = metadata.commit;
process.env.RUOSHUI_DEPLOY_COMMIT_MESSAGE = metadata.message;
process.env.RUOSHUI_DEPLOY_SOURCE_BRANCH = metadata.branch;

await import('./deploy-cloudflare-pages.mjs');
