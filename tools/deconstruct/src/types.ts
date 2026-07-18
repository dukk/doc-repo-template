export type ExtractAsset = {
  absPath: string;
  relPath: string;
};

export type ExtractResult = {
  markdown: string;
  assets: ExtractAsset[];
  metadata: Record<string, unknown>;
};

export type ExtractContext = {
  /** Read-only path under the package `.original/` directory. */
  originalPath: string;
  /** Staging directory for extractor work (media, temp files). */
  workDir: string;
};

export type Extractor = {
  name: string;
  canHandle(input: { path: string }): boolean;
  extract(ctx: ExtractContext): Promise<ExtractResult>;
};

export type CustomExtractorConfig = {
  name: string;
  match: string[];
  command: string[];
};

export type ExtractorsFile = {
  extractors?: CustomExtractorConfig[];
};

export type DeconstructOptions = {
  inputPath: string;
  outDir: string;
  type?: string;
  title?: string;
  extractor?: string;
  force?: boolean;
  /** Repo root used to locate deconstruct.extractors.yaml */
  repoRoot?: string;
  /** Injectable command runner (tests). */
  runCommand?: CommandRunner;
};

export type CommandRunner = (
  command: string,
  args: string[],
  opts?: { cwd?: string; env?: NodeJS.ProcessEnv },
) => Promise<{ stdout: string; stderr: string; code: number }>;

export type DeconstructResult = {
  packageDir: string;
  originalRel: string;
  extractor: string;
  sourceFiles: string[];
};
