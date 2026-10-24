## Problem

Type the props of a `Button` component, so wrong usage is caught **while you type** instead of in the browser.

| Prop | Type | Required? |
|---|---|---|
| `children` | Anything React can render | ✅ required |
| `variant` | `'primary'` or `'secondary'` | optional (default `'primary'`) |
| `size` | `'sm'`, `'md'` or `'lg'` | optional (default `'md'`) |
| `onClick` | A function with no arguments that returns nothing | optional |

**Note:** the editor's last line (`variant="danger"`) is there on purpose. Once your types are right, it becomes a type error. Delete that line to get the "no type errors" test passing.

## Examples

```tsx
<Button>Save</Button>                                   // ✅
<Button variant="secondary" size="lg" onClick={() => save()}>Go</Button>   // ✅

<Button variant="danger">X</Button>   // ❌ not a variant
<Button size="xl">X</Button>          // ❌ not a size
<Button />                            // ❌ children are missing
<Button onClick="save">X</Button>     // ❌ onClick must be a function
```

## Hints

1. Props are just an object type: `type ButtonProps = { ... }`.
2. `ReactNode` (already imported) is the type for "anything React can render": text, numbers, elements, arrays, `null`.
3. Optional props use `?`, and the default value in the destructuring fills them in.
4. "No arguments, returns nothing" is `() => void`.

<!-- SOLUTION -->

## Solution

```tsx
import type { ReactNode } from 'react'

type ButtonProps = {
  children: ReactNode
  variant?: 'primary' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
}

function Button({ children, variant = 'primary', size = 'md', onClick }: ButtonProps) {
  return (
    <button className={`btn btn-${variant} btn-${size}`} onClick={onClick}>
      {children}
    </button>
  )
}
```

## Typing props: the options

```tsx
// 1. Annotate the destructured parameter (most common)
function Button({ children }: ButtonProps) { ... }

// 2. Inline, for tiny components
function Badge({ label }: { label: string }) { ... }

// 3. React.FC: works, but it's no longer recommended
const Button: React.FC<ButtonProps> = ({ children }) => { ... }
```

Most teams use option 1: a plain function with typed props. `React.FC` adds nothing useful today, and generic components can't use it.

## Which type for children?

| Type | Allows |
|---|---|
| `ReactNode` | **Anything renderable**: string, number, element, array, `null`, `undefined`. Use this by default |
| `ReactElement` | Only a JSX element (not text) |
| `string` | Only text, e.g. a `label` |
| `PropsWithChildren<Props>` | Adds `children?: ReactNode` to your props (optional children) |

## Why the defaults still work

`variant?: 'primary' | 'secondary'` means `variant` may be `undefined`. The default (`variant = 'primary'`) fills it in, so **inside** the component `variant` is just `'primary' | 'secondary'`.

## 🎯 Interview answer

> "I type props as an object type and annotate the destructured parameter. Optional props get a `?` and a default value in the destructuring. For `children` I use `ReactNode`, which covers anything React can render. Literal unions like `'primary' | 'secondary'` restrict a prop to the allowed values, and callbacks get a function type like `() => void`. I don't use `React.FC` anymore, because it adds nothing and doesn't work for generic components."
