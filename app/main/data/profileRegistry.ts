import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export type ProfileRegistryEntry = {
  id: string;
  displayName: string;
  directoryName: string;
  createdAt: string;
  lastOpenedAt: string;
};

export type ProfileRegistry = {
  profiles: ProfileRegistryEntry[];
  activeProfileId: string;
};

const registryFileName = 'profiles.json';

export const getProfileRegistryPath = (appDataDirectory: string) =>
  join(appDataDirectory, registryFileName);

const defaultRegistry = (now: Date): ProfileRegistry => {
  const timestamp = now.toISOString();
  const profileId = randomUUID();

  return {
    profiles: [
      {
        id: profileId,
        displayName: 'Local profile',
        directoryName: profileId,
        createdAt: timestamp,
        lastOpenedAt: timestamp,
      },
    ],
    activeProfileId: profileId,
  };
};

const parseRegistry = (contents: string): ProfileRegistry => {
  const registry = JSON.parse(contents) as ProfileRegistry;

  if (!Array.isArray(registry.profiles) || registry.profiles.length === 0) {
    throw new Error('Profile registry must contain at least one profile');
  }

  if (!registry.profiles.some((profile) => profile.id === registry.activeProfileId)) {
    throw new Error('Profile registry activeProfileId does not match a profile');
  }

  return registry;
};

export const writeProfileRegistry = (
  appDataDirectory: string,
  registry: ProfileRegistry,
) => {
  mkdirSync(appDataDirectory, { recursive: true });
  writeFileSync(
    getProfileRegistryPath(appDataDirectory),
    `${JSON.stringify(registry, null, 2)}\n`,
  );
};

export const readOrCreateProfileRegistry = (
  appDataDirectory: string,
  now = new Date(),
): ProfileRegistry => {
  mkdirSync(appDataDirectory, { recursive: true });

  try {
    const registry = parseRegistry(
      readFileSync(getProfileRegistryPath(appDataDirectory), 'utf8'),
    );
    const timestamp = now.toISOString();
    const nextRegistry = {
      ...registry,
      profiles: registry.profiles.map((profile) =>
        profile.id === registry.activeProfileId
          ? { ...profile, lastOpenedAt: timestamp }
          : profile,
      ),
    };

    writeProfileRegistry(appDataDirectory, nextRegistry);
    return nextRegistry;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }

    const registry = defaultRegistry(now);
    writeProfileRegistry(appDataDirectory, registry);
    return registry;
  }
};

export const getActiveProfile = (registry: ProfileRegistry) => {
  const profile = registry.profiles.find(
    (candidate) => candidate.id === registry.activeProfileId,
  );

  if (!profile) {
    throw new Error('Profile registry active profile could not be resolved');
  }

  return profile;
};

export const getProfileDirectory = (
  appDataDirectory: string,
  profile: ProfileRegistryEntry,
) => join(appDataDirectory, 'profiles', profile.directoryName);
