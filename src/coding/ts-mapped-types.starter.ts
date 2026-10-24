// Implement these WITHOUT the built-in Partial / Required / Readonly.
// Example input: type Todo = { title: string; done: boolean }

type MyPartial<T> = unknown    // { title?: string; done?: boolean }
type MyRequired<T> = unknown   // removes every ?
type MyReadonly<T> = unknown   // { readonly title: string; readonly done: boolean }
type Mutable<T> = unknown      // removes every readonly
type Nullable<T> = unknown     // { title: string | null; done: boolean | null }
