import { expect } from "chai";
import fs from "fs";
import yaml from "js-yaml";
import Listr from "listr";
import { rmSafe, shellSafe } from "../shellSafe";
import { buildAndUpload } from "../../src/tasks/buildAndUpload";

const contentProvider = "http://ipfs.dappnode.io";

// This test will create the following fake files
// ./dappnode_package.json  => fake manifest
// ./dnp_0.0.0/             => build directory
//
// Then it will expect the function to generate transaction data
// and output it to the console and to ./dnp_0.0.0/deploy.txt

describe("buildAndUpload", () => {
  const ensName = "sdk-test.dnp.dappnode.eth";
  const version = "0.1.0";
  const imageTag = `${ensName}:${version}`;
  const manifestWithoutImage = {
    name: ensName,
    version,
    description: "Mock DNP for testing the SDK cli",
    type: "service",
    license: "GLP-3.0"
  };
  const manifestWithImage = {
    ...manifestWithoutImage,
    avatar: "/ipfs/QmDAppNodeDAppNodeDAppNodeDAppNodeDAppNodeDApp",
    image: {
      path: "dappnode.dnp.dappnode.eth_0.0.0.tar.xz",
      hash: "/ipfs/QmDAppNodeDAppNodeDAppNodeDAppNodeDAppNodeDApp",
      size: 100
    }
  };
  const manifestPath = "./dappnode_package.json";
  const composePath = "./docker-compose.yml";
  const avatarPath = "./test-avatar.png";
  const avatarSourcePath = "test/test-avatar-source.png";
  const buildDir = `./build_${version}`;

  /**
   * [NOTE] using an extremely lightweight image to accelerate tests
   */
  const Dockerfile = `
FROM hello-world
ENV test=1
`.trim();

  const compose = {
    version: "3.4",
    services: {
      [ensName]: {
        image: imageTag,
        build: "./build"
      }
    }
  };

  before(async () => {
    rmSafe(manifestPath);
    rmSafe(composePath);
    rmSafe("./build");
    rmSafe(buildDir);
    fs.mkdirSync("./build");
    fs.writeFileSync(manifestPath, JSON.stringify(manifestWithImage, null, 2));
    fs.writeFileSync(composePath, yaml.dump(compose, { indent: 2 }));
    fs.writeFileSync("./build/Dockerfile", Dockerfile);
    fs.copyFileSync(avatarSourcePath, avatarPath);
  });

  it("Should build and upload the current version", async () => {
    // Rewrite the manifest to not contain image
    fs.writeFileSync(
      manifestPath,
      JSON.stringify(manifestWithoutImage, null, 2)
    );

    const buildTasks = new Listr(
      buildAndUpload({
        dir: "./",
        buildDir,
        contentProvider,
        uploadTo: "ipfs",
        userTimeout: "5min"
      }),
      { renderer: "verbose" }
    );

    const { releaseMultiHash } = await buildTasks.run();

    // Check returned hash is correct
    expect(releaseMultiHash).to.include("/ipfs/Qm");
  }).timeout(60 * 1000);

  after(async () => {
    rmSafe(manifestPath);
    rmSafe(composePath);
    rmSafe("./build");
    rmSafe(buildDir);
    await shellSafe(`docker image rm -f ${imageTag}`);
  });
});
