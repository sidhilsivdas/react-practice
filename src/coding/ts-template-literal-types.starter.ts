// 1. EventHandlerName<'click'> → 'onClick'  (works for unions too)
type EventHandlerName<E extends string> = unknown

// 2. Getters<{ name: string; age: number }> → { getName: () => string; getAge: () => number }
type Getters<T> = unknown

// 3. A number followed by 'px', 'rem' or '%': '10px', '1.5rem', '50%'
type CssLength = unknown

const gap: CssLength = '1.5rem'
