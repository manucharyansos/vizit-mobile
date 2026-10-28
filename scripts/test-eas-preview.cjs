const test = require('node:test');
const assert = require('node:assert/strict');
const { buildFrom, buildToReuse, finishedArtifact, waitForBuild } = require('./eas-preview-build.cjs');
const app = { version: '1.0.1', extra: { eas: { projectId: 'project-fixture' } } };
// Shape from eas-cli@26.0.0 build/graphql/types/Build.js (BuildFragment).
const build = { id: '11111111-2222-3333-4444-555555555555', status: 'FINISHED', platform: 'ANDROID', distribution: 'INTERNAL', buildProfile: 'preview', updateChannel: { id: 'channel-fixture', name: 'preview' }, app: { id: 'project-fixture' }, appVersion: '1.0.1', runtime: { id: 'runtime-fixture', version: '1.0.1' }, artifacts: { buildUrl: 'https://expo.dev/artifacts/eas/fixture.apk' } };

test('automatic updates reuse a compatible finished or running build before creating another one', () => {
  const queued = { ...build, status: 'IN_QUEUE' };
  const running = { ...build, status: 'IN_PROGRESS' };
  assert.equal(buildToReuse([queued, running, build]), build);
  assert.equal(buildToReuse([queued, running]), running);
  assert.equal(buildToReuse([{ ...build, status: 'ERRORED' }]), undefined);
  assert.throws(() => buildToReuse({}), /No new build was queued/);
});

test('only a finished, matching preview runtime exposes an APK for installation', () => {
  assert.equal(buildFrom([build]), build);
  assert.equal(finishedArtifact(build, app), build.artifacts.buildUrl);
  for (const patch of [{ status: 'IN_QUEUE' }, { platform: 'IOS' }, { runtime: { version: '1.0.0' } }, { appVersion: '1.0.0' }, { updateChannel: { name: 'production' } }, { buildProfile: 'production' }, { app: { id: 'another-project' } }, { updateChannel: null }, { app: null }, { runtime: null }, { artifacts: { buildUrl: 'https://expo.dev/artifacts/eas/fixture.aab' } }]) assert.throws(() => finishedArtifact({ ...build, ...patch }, app));
});

test('queued and building states are followed until the actual build finishes', async () => {
  const states = ['IN_QUEUE', 'IN_PROGRESS', 'FINISHED'];
  let reads = 0;
  const result = await waitForBuild(build.id, async () => ({ ...build, status: states[reads++] }), { pause: async () => {}, report: () => {} });
  assert.equal(result.status, 'FINISHED');
  assert.equal(reads, 3);
});

test('a failed or cancelled native build fails the workflow', async () => {
  for (const status of ['ERRORED', 'CANCELED']) await assert.rejects(waitForBuild(build.id, async () => ({ ...build, status }), { pause: async () => {}, report: () => {} }), new RegExp(status));
});

test('transient reads retry, persistent read failures stop, and long queues give a resumable build ID', async () => {
  let count = 0;
  assert.equal((await waitForBuild(build.id, async () => { if (count++ === 0) throw Error('network'); return build; }, { pause: async () => {}, report: () => {} })).status, 'FINISHED');
  await assert.rejects(waitForBuild(build.id, async () => { throw Error('network'); }, { pause: async () => {}, report: () => {} }), /three attempts/);
  await assert.rejects(waitForBuild(build.id, async () => ({ ...build, status: 'IN_QUEUE' }), { pause: async () => {}, maxPolls: 2, report: () => {} }), /existing_build_id=11111111/);
});
