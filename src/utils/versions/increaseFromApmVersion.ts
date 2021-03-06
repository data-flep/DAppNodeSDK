import { readManifest, writeManifest } from "../manifest";
import { readCompose, writeCompose, updateComposeImageTags } from "../compose";
import { getNextVersionFromApm } from "./getNextVersionFromApm";
import { ReleaseType } from "../../types";

export async function increaseFromApmVersion({
  type,
  ethProvider,
  dir,
  composeFileName
}: {
  type: ReleaseType;
  ethProvider: string;
  dir: string;
  composeFileName: string;
}): Promise<string> {
  // Check variables
  const nextVersion = await getNextVersionFromApm({ type, ethProvider, dir });

  // Load manifest
  const manifest = readManifest(dir);

  // Increase the version
  manifest.version = nextVersion;

  // Mofidy and write the manifest and docker-compose
  writeManifest(dir, manifest);
  const { name, version } = manifest;
  const compose = readCompose(composeFileName, dir);
  writeCompose(composeFileName, dir, updateComposeImageTags(compose, { name, version }));

  return nextVersion;
}
