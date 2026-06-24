const enabled =
  !process.env.NO_COLOR &&
  (process.env.FORCE_COLOR === "1" || process.stdout.isTTY === true);

function paint(open: string, text: string, close = "\x1b[0m"): string {
  return enabled ? `${open}${text}${close}` : text;
}

export const c = {
  reset: (text: string) => paint("\x1b[0m", text),
  bold: (text: string) => paint("\x1b[1m", text),
  dim: (text: string) => paint("\x1b[2m", text),
  teal: (text: string) => paint("\x1b[36m", text),
  green: (text: string) => paint("\x1b[32m", text),
  red: (text: string) => paint("\x1b[31m", text),
  yellow: (text: string) => paint("\x1b[33m", text),
  blue: (text: string) => paint("\x1b[34m", text),
  magenta: (text: string) => paint("\x1b[35m", text),
  cyan: (text: string) => paint("\x1b[96m", text),
  white: (text: string) => paint("\x1b[97m", text),
};

export function brand(text: string): string {
  return c.bold(c.teal(text));
}

export function pkg(text: string): string {
  return c.bold(c.cyan(text));
}

export function path(text: string): string {
  return c.magenta(text);
}

export function url(text: string): string {
  return c.blue(text);
}

export function command(text: string): string {
  return c.yellow(text);
}

export function statLabel(text: string): string {
  return c.dim(text);
}

export function statValue(text: string, tone: "services" | "structs" | "enums"): string {
  switch (tone) {
    case "services":
      return c.green(text);
    case "structs":
      return c.blue(text);
    case "enums":
      return c.magenta(text);
  }
}

export function formatPackageStats(services: number, structs: number, enums: number): string {
  return [
    `${statValue(String(services), "services")} ${statLabel("services")}`,
    `${statValue(String(structs), "structs")} ${statLabel("structs")}`,
    `${statValue(String(enums), "enums")} ${statLabel("enums")}`,
  ].join(c.dim(" · "));
}

export function success(message: string): void {
  console.log(`${c.green("✓")} ${message}`);
}

export function info(message: string): void {
  console.log(`${c.teal("→")} ${message}`);
}

export function warn(message: string): void {
  console.error(`${c.yellow("!")} ${c.yellow(message)}`);
}

export function fail(message: string): void {
  console.error(`${c.red("✗")} ${c.red(message)}`);
}

export function bullet(message: string): void {
  console.log(`  ${c.dim("•")} ${message}`);
}

export function heading(title: string, subtitle?: string): void {
  console.log(brand(title));
  if (subtitle) {
    console.log(c.dim(subtitle));
  }
}

export function printUsage(): void {
  console.log("");
  heading("srpc", "SRPC contract CLI");
  console.log("");
  console.log(c.bold("Usage"));
  console.log(`  ${command("srpc create")} ${c.dim("<name> [--dir <parent-dir>] [--no-git]")}`);
  console.log(`  ${command("srpc generate")} ${c.dim("[--contract-dir <dir>] [--out <file>]")}`);
  console.log("");
  console.log(c.bold("Package commands"));
  console.log(`  ${command("srpc package list")} ${c.dim("[--url <base-url>]")}`);
  console.log(`  ${command("srpc package get")} ${c.dim("<package> [--dir <contract-dir>] [--out <file>]")}`);
  console.log(`  ${command("srpc package pull")} ${c.dim("[package...] [--dir <contract-dir>]")}`);
  console.log(`  ${command("srpc package push")} ${c.dim("[package...] [--dir <contract-dir>]")}`);
  console.log(`  ${command("srpc package create")} ${c.dim("<package> [--file <path>] [--dir <contract-dir>]")}`);
  console.log(`  ${command("srpc package update")} ${c.dim("<package> [--file <path>] [--dir <contract-dir>]")}`);
  console.log(`  ${command("srpc package validate")} ${c.dim("<package> [--file <path>] [--dir <contract-dir>]")}`);
  console.log(`  ${command("srpc package delete")} ${c.dim("<package>")}`);
  console.log("");
  console.log(c.dim("  srpc remote ...   alias for srpc package ..."));
  console.log("");
  console.log(c.bold("Environment"));
  console.log(`  ${c.cyan("SRPC_URL")}             ${c.dim("Default server URL")} ${c.dim("(http://localhost:3100)")}`);
  console.log(`  ${c.cyan("SRPC_API_KEY")}         ${c.dim("API key for write operations")}`);
  console.log(`  ${c.cyan("SRPC_CONTRACT_DIR")}    ${c.dim("Default local contract directory")} ${c.dim("(contract)")}`);
  console.log(`  ${c.cyan("NO_COLOR")}             ${c.dim("Disable ANSI colors")}`);
  console.log("");
}
