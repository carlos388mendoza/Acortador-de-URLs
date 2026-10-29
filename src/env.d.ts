declare global {
  const process: {
    env: Record<string, string | undefined>
    argv: string[]
    exit(code?: number): never
    cwd(): string
  }
}

export {}
