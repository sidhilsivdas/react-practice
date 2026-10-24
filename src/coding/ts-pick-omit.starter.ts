// Implement these WITHOUT the built-in Pick / Exclude / Omit / Record.
// Example: type Todo = { title: string; description: string; done: boolean }

type MyPick<T, K> = unknown     // MyPick<Todo, 'title' | 'done'> → { title: string; done: boolean }
                                // and K must be a key of T
type MyExclude<T, U> = unknown  // MyExclude<'a' | 'b' | 'c', 'a'> → 'b' | 'c'
type MyOmit<T, K> = unknown     // MyOmit<Todo, 'description'> → { title: string; done: boolean }
type MyRecord<K, V> = unknown   // MyRecord<'a' | 'b', number> → { a: number; b: number }
