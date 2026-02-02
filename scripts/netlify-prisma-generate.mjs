import { spawn } from 'node:child_process';

function shouldGenerate() {
  // Netlify sets NETLIFY=true in build.
  // We also allow explicit CI builds to generate the correct engine.
  return Boolean(process.env.NETLIFY) || process.env.CI === 'true' || process.env.CI === '1';
}

function prismaBin() {
  // Use local prisma CLI from node_modules for deterministic builds.
  return process.platform === 'win32' ? 'node_modules/.bin/prisma.cmd' : 'node_modules/.bin/prisma';
}

async function run(cmd, args) {
  return await new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

if (!shouldGenerate()) {
  process.exit(0);
}

// Generate Prisma Client + download correct query engine for the current build runtime.
// Retry once to avoid transient filesystem/network issues.
try {
  await run(prismaBin(), ['generate']);
} catch (e) {
  await run(prismaBin(), ['generate']);
}
