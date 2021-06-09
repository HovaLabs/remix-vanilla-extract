import fs from "fs";
import path from "path";
import * as integration from "@vanilla-extract/integration";

function getVanillaExtractFiles(
  startPath: string,
  filter: RegExp,
  callback: (filename: string) => void
) {
  if (!fs.existsSync(startPath)) {
    console.log("no dir ", startPath);
    return;
  }

  const files = fs.readdirSync(startPath);
  for (let i = 0; i < files.length; i++) {
    const filename = path.join(startPath, files[i]);
    const stat = fs.lstatSync(filename);
    if (stat.isDirectory()) {
      getVanillaExtractFiles(filename, filter, callback);
    } else if (filter.test(filename)) callback(filename);
  }
}

const convertVanillaToCss = async (filePath: string) => {
  // Feels like a bit overkill to get a base64 file and convert it back here
  // TODO see if there's a cleaner function for doing this instead of calling 3 functions
  // CSS is crushed to base64 here: https://github.com/seek-oss/vanilla-extract/blob/e41529e50efe22e1429e3b60f6df83e299dea6c0/packages/integration/src/processVanillaFile.ts#L85
  const { source } = await integration.compile({
    filePath,
    externals: [],
    cwd: __dirname,
  });
  const contents = integration.processVanillaFile({
    source,
    filePath,
    outputCss: true,
  });

  const cssBase64 = (contents.split("?source=").pop() ?? "").split(";")[0];
  const css = Buffer.from(cssBase64, "base64").toString("utf-8");

  // Write files into the "styles" directory
  const pathArray = filePath.split(path.sep);
  const appIndex = pathArray.indexOf("app");
  const outputPathArray = filePath.split(path.sep).map((d, index) => {
    if (index === appIndex + 1) {
      return "styles";
    }
    return d;
  });
  const outputPath = outputPathArray.join(path.sep);
  const outputDirectory = outputPathArray.slice(0, -1).join(path.sep);
  // @ts-ignore
  await fs.mkdir(outputDirectory, { recursive: true }, () => {});
  await fs.writeFileSync(outputPath.replace(".ts", ""), css);
};

getVanillaExtractFiles(
  path.join(__dirname, "./app"),
  /\.css.ts$/,
  function (filename) {
    convertVanillaToCss(filename);
  }
);
