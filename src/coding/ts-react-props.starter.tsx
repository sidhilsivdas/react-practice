import type { ReactNode } from 'react'

// Type the Button's props:
//   children → anything React can render (required)
//   variant  → 'primary' | 'secondary' (optional, defaults to 'primary')
//   size     → 'sm' | 'md' | 'lg' (optional, defaults to 'md')
//   onClick  → a function with no arguments that returns nothing (optional)
type ButtonProps = any

function Button({ children, variant = 'primary', size = 'md', onClick }: ButtonProps) {
  return (
    <button className={`btn btn-${variant} btn-${size}`} onClick={onClick}>
      {children}
    </button>
  )
}

// Try it: the second one should be a type error once ButtonProps is typed
const ok = <Button variant="secondary">Save</Button>
const wrong = <Button variant="danger">Delete</Button>
