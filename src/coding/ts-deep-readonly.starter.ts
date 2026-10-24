// Like Readonly / Partial, but all the way down (nested objects and arrays too).
// Functions should stay as they are.

type DeepReadonly<T> = unknown
type DeepPartial<T> = unknown

type Config = {
  server: { host: string; port: number }
  tags: string[]
  debug: boolean
}

const config: DeepReadonly<Config> = { server: { host: 'localhost', port: 3000 }, tags: ['dev'], debug: true }
config.server.port = 80      // should be a type error (then delete this line)
