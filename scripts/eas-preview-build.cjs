const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const buildIdPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

function buildFrom(value) {
  const build = Array.isArray(value) ? value[0] : value;
  if (!build || !buildIdPattern.test(build.id) || typeof build.status !== 'string') throw new Error('EAS did not return a valid build.');
  return build;
}

function buildToReuse(builds) {
  if (!Array.isArray(builds)) throw new Error('EAS did not return a build list. No new build was queued.');
  // The CLI filters this list by project, preview profile/channel and app runtime.
  // Prefer a finished APK, then an active build, before joining a queued build.
  return ['FINISHED', 'IN_PROGRESS', 'IN_QUEUE', 'NEW'].map(status => builds.find(build => build.status === status && buildIdPattern.test(build.id))).find(Boolean);
}

function finishedArtifact(build, app) {
  if (build.status !== 'FINISHED') throw new Error(`EAS build is ${build.status}, not finished.`);
  if (build.platform !== 'ANDROID' || build.distribution !== 'INTERNAL' || build.buildProfile !== 'preview' || build.channel !== 'preview') throw new Error('The build is not an Android preview APK on the preview channel.');
  if (build.project?.id !== app.extra.eas.projectId || build.appVersion !== app.version || build.runtimeVersion !== app.version) throw new Error('The build belongs to another project or app runtime.');
  const url = new URL(build.artifacts?.buildUrl);
  if (url.protocol !== 'https:' || url.hostname !== 'expo.dev' || !url.pathname.toLowerCase().endsWith('.apk') || url.username || url.password) throw new Error('EAS did not provide an installable APK artifact.');
  return url.href;
}

async function waitForBuild(id, read, { pause = () => new Promise(resolve => setTimeout(resolve, 30000)), maxPolls = 220, report = console.log } = {}) {
  let failures = 0;
  let previous;
  for (let poll = 0; poll < maxPolls; poll++) {
    let build;
    try {
      build = buildFrom(await read(id));
      if (build.id !== id) throw new Error('EAS returned a different build.');
      failures = 0;
    } catch {
      if (++failures >= 3) throw new Error('Could not read EAS build status after three attempts.');
      await pause();
      continue;
    }
    if (build.status !== previous) report(`EAS build ${id}: ${build.status}`);
    previous = build.status;
    if (build.status === 'FINISHED') return build;
    if (['ERRORED', 'CANCELED', 'CANCELLED'].includes(build.status)) throw new Error(`EAS build ${id} ended with ${build.status}. Open its build page for logs.`);
    await pause();
  }
  throw new Error(`EAS build ${id} is still pending. Resume this workflow with existing_build_id=${id}; a new build is not needed.`);
}

async function main() {
  const { expo: app } = require('../app.json');
  const eas = args => JSON.parse(execFileSync('eas', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], timeout: 120000 }));
  let id = (process.env.EXISTING_BUILD_ID || '').trim();
  if (id && !buildIdPattern.test(id)) throw new Error('existing_build_id must be an EAS build UUID.');
  if (!id && process.env.REUSE_COMPATIBLE_BUILD === 'true') {
    const builds = eas(['build:list', '--platform', 'android', '--build-profile', 'preview', '--channel', 'preview', '--distribution', 'internal', '--app-version', app.version, '--runtime-version', app.version, '--limit', '20', '--json', '--non-interactive']);
    id = buildToReuse(builds)?.id || '';
  }
  if (!id) id = buildFrom(eas(['build', '--platform', 'android', '--profile', 'preview', '--non-interactive', '--no-wait', '--json'])).id;
  const dashboard = `https://expo.dev/accounts/manucharyan/projects/vizit-mobile/builds/${id}`;
  console.log(`Build page: ${dashboard}`);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `EAS build: ${dashboard}\n\nWaiting for a finished APK. A queued build is not ready to install.\n\n`);
  const build = await waitForBuild(id, value => eas(['build:view', value, '--json']));
  const apk = finishedArtifact(build, app);
  const directory = path.join(process.cwd(), 'artifacts');
  fs.mkdirSync(directory, { recursive: true });
  const download = process.env.DOWNLOAD_APK !== 'false';
  if (download) {
    const filename = path.join(directory, 'vizit-preview.apk');
    const response = await fetch(apk, { signal: AbortSignal.timeout(300000) });
    if (!response.ok || !response.body) throw new Error('Could not download the finished APK.');
    await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(filename));
    const entries = execFileSync('unzip', ['-Z1', filename], { encoding: 'utf8' }).split('\n');
    if (!entries.includes('AndroidManifest.xml')) throw new Error('Downloaded artifact is not an Android APK.');
  }
  const metadata = { id, status: build.status, version: build.appVersion, runtime: build.runtimeVersion, commit: build.gitCommitHash, apk, dashboard };
  fs.writeFileSync(path.join(directory, 'preview-build.json'), JSON.stringify(metadata, null, 2) + '\n');
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `APK ready: [Install Vizit ${build.appVersion}](${apk})\n\nRuntime: ${build.runtimeVersion}. Built commit: ${build.gitCommitHash || 'see EAS build page'}.\n\n${download ? 'The APK is also attached to this workflow as **vizit-preview-apk**. ' : ''}Install it over the existing app.\n`);
  console.log(`APK ready: ${apk}`);
}

module.exports = { buildFrom, buildToReuse, finishedArtifact, waitForBuild };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
