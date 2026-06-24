export function readFlag(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
}

export function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

const CLIENT_FLAGS = new Set(["--url", "--api-key"]);

const COMMAND_FLAGS = new Set([
  "--url",
  "--api-key",
  "--dir",
  "--file",
  "--out",
  "--name",
  "--package",
  "--exclude-package",
  "--contract-dir",
  "--no-git",
  "--no-color",
]);

export function stripFlags(args: string[], flags: Iterable<string>): string[] {
  const blocked = new Set(flags);
  return args.filter((arg, index, all) => {
    if (blocked.has(arg)) {
      return false;
    }

    const previous = all[index - 1];
    return !previous || !blocked.has(previous);
  });
}

export function stripClientFlags(args: string[]): string[] {
  return stripFlags(args, CLIENT_FLAGS);
}

export function positionalArgs(args: string[]): string[] {
  return stripFlags(args, COMMAND_FLAGS).filter(arg => !arg.startsWith("-"));
}
