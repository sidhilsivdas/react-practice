// Implement these with conditional types and `infer` (no built-ins).

type MyReturnType<T> = unknown   // MyReturnType<() => string> → string
                                 // and MyReturnType<string> is an error (only functions)
type MyParameters<T> = unknown   // MyParameters<(a: number, b: string) => void> → [a: number, b: string]
type MyAwaited<T> = unknown      // MyAwaited<Promise<Promise<number>>> → number, MyAwaited<boolean> → boolean
type ElementType<T> = unknown    // ElementType<string[]> → string, ElementType<number> → number
