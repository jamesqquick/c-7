import { Command } from '@commander-js/extra-typings';
import { exec as execCb } from 'child_process';
import { outputFileSync, writeJsonSync } from 'fs-extra/esm';
import kebabCase from 'lodash.kebabcase';
import { coerce, compare } from 'semver';
import { promisify } from 'util';
import { z } from 'zod';

const exec = promisify(execCb);

interface Manifest {
  name: string;
  dependencies: {
    add: string[];
  };
  devDependencies: {
    add: string[];
  };
  environmentVariables: string[];
}

export const integration = new Command('integration')
  .argument('<integration-name>', 'Formatted name of the integration')
  .option('--commit-hash <hash>', 'Override integration source branch with a specific commit hash')
  .action(async (integrationNameRaw, options) => {
    // @todo check for integration name conflicts
    const integrationName = z.string().transform(kebabCase).parse(integrationNameRaw);

    const manifest: Manifest = {
      name: integrationName,
      dependencies: { add: [] },
      devDependencies: { add: [] },
      environmentVariables: [],
    };

    await exec('git fetch --tags');

    const { stdout: headRefStdOut } = await exec('git rev-parse --abbrev-ref HEAD');
    let [sourceRef] = headRefStdOut.split('\n');

    if (options.commitHash) {
      sourceRef = options.commitHash;
    }

    const { stdout: catalystTags } = await exec('git tag --list @bigcommerce/catalyst-core@\\*');
    const [latestCoreTag] = catalystTags
      .split('\n')
      .filter(Boolean)
      .sort((a, b) => {
        const versionA = coerce(a.replace('@bigcommerce/catalyst-core@', ''));
        const versionB = coerce(b.replace('@bigcommerce/catalyst-core@', ''));

        if (versionA && versionB) {
          return compare(versionA, versionB);
        }

        return 0;
      })
      .reverse();

    const PackageDependenciesSchema = z.object({
      dependencies: z.object({}).passthrough(),
      devDependencies: z.object({}).passthrough(),
    });

    const getPackageDeps = async (ref: string) => {
      const { stdout } = await exec(`git show ${ref}:core/package.json`);

      return PackageDependenciesSchema.parse(JSON.parse(stdout));
    };

    const integrationJson = await getPackageDeps(sourceRef);
    const latestCoreTagJson = await getPackageDeps(latestCoreTag);

    const diffObjectKeys = (a: Record<string, unknown>, b: Record<string, unknown>) => {
      return Object.keys(a).filter((key) => !Object.keys(b).includes(key));
    };

    manifest.dependencies.add = diffObjectKeys(
      integrationJson.dependencies,
      latestCoreTagJson.dependencies,
    );
    manifest.devDependencies.add = diffObjectKeys(
      integrationJson.devDependencies,
      latestCoreTagJson.devDependencies,
    );

    const { stdout: envVarDiff } = await exec(
      `git diff ${latestCoreTag}...${sourceRef} -- core/.env.example`,
    );

    if (envVarDiff.length > 0) {
      const envVars: string[] = [];
      const lines = envVarDiff.split('\n');
      const addedEnvVarPattern = /^\+([A-Z_]+)=/;

      lines.forEach((line) => {
        const match = line.match(addedEnvVarPattern);

        if (match) {
          envVars.push(match[1]);
        }
      });

      if (envVars.length > 0) {
        manifest.environmentVariables = envVars;
      }
    }

    const { stdout: integrationDiff } = await exec(
      `git diff ${latestCoreTag}...${sourceRef} -- ':(exclude)core/package.json' ':(exclude)pnpm-lock.yaml'`,
    );

    outputFileSync(`integrations/${integrationName}/integration.patch`, integrationDiff);
    writeJsonSync(`integrations/${integrationName}/manifest.json`, manifest, {
      spaces: 2,
    });

    console.log('Integration created successfully.');
  });