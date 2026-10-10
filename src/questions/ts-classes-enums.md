## Quick answer

- **Classes:** TypeScript adds **access modifiers** (`public`, `private`, `protected`), `readonly`, **abstract** classes, `implements` and **parameter properties**. `private` is **compile-time only**; JavaScript's `#private` is enforced at runtime.
- **Enums:** a named set of constants. They're one of the few TypeScript features that **generate runtime code**. Modern teams often prefer **union literal types** or **`as const` objects**, especially since Node's built-in TypeScript support and `erasableSyntaxOnly` reject enums.

---

## Classes and modifiers

```ts
class BankAccount {
  public owner: string               // default: accessible everywhere
  protected balance = 0              // this class + subclasses
  private pin: string                // this class only (compile-time)
  readonly id = crypto.randomUUID()  // set once
  static bankName = 'TS Bank'        // on the class, not instances
  #auditLog: string[] = []           // JavaScript private field: hidden at RUNTIME too

  constructor(owner: string, pin: string) {
    this.owner = owner
    this.pin = pin
  }

  deposit(amount: number): void {
    if (amount <= 0) throw new Error('Amount must be positive')
    this.balance += amount
    this.#auditLog.push(`deposit ${amount}`)
  }

  get currentBalance() { return this.balance }   // getter
}

const acc = new BankAccount('Asha', '1234')
acc.pin        // ❌ Property 'pin' is private and only accessible within class 'BankAccount'.
acc['pin']     // ⚠️ allowed! bracket access is TypeScript's escape hatch for `private`
acc.#auditLog  // ❌ Property '#auditLog' is not accessible outside class 'BankAccount' because it has a private identifier.
               //    (in plain JavaScript this is a SyntaxError: truly private)
```

**`private` vs `#private`:**

| | `private` (TypeScript) | `#private` (JavaScript) |
|---|---|---|
| Enforced | Only by the compiler | **At runtime** by the JS engine |
| `obj['x']` / `JSON.stringify` / debugging | Visible | Hidden |
| Subclass with the same name | Conflicts | Independent |
| Use when | Team convention, testability | Real encapsulation (libraries, security-sensitive code) |

---

## Parameter properties

**A shorthand that declares and assigns in the constructor:**

```ts
class UserService {
  constructor(
    private readonly http: HttpClient,
    private readonly baseUrl: string,
  ) {}
  // same as declaring the two fields and assigning this.http = http, this.baseUrl = baseUrl

  getUser(id: string) { return this.http.get(`${this.baseUrl}/users/${id}`) }
}
```

**Heads-up:** this syntax generates code, so it's **not erasable**. Node's type stripping and `erasableSyntaxOnly` reject it. Write explicit fields in those setups.

---

## Abstract classes vs interfaces

```ts
abstract class PaymentProvider {
  abstract charge(amountCents: number): Promise<string>     // subclasses MUST implement it

  async pay(amountCents: number) {                          // shared, real implementation
    if (amountCents <= 0) throw new Error('Invalid amount')
    const id = await this.charge(amountCents)
    console.log('paid', id)
    return id
  }
}

class StripeProvider extends PaymentProvider {
  override async charge(amountCents: number) { return 'pi_123' }   // `override` (with noImplicitOverride) catches renamed base methods
}

new PaymentProvider()   // ❌ Cannot create an instance of an abstract class.
```

| | Interface | Abstract class |
|---|---|---|
| Runtime code | None (erased) | Real JS class |
| Implementation | Only shape | Can include shared methods and fields |
| Multiple | A class can `implements A, B` | Only one `extends` |
| Use for | Contracts, dependency injection, mocks | Shared base behaviour + forced methods |

**In React codebases, classes are rare** (function components and hooks). They appear in services, SDKs, error classes (`class ApiError extends Error`) and backend code (NestJS).

---

## Enums

```ts
// numeric enum: auto-increments from 0, with a reverse mapping
enum Direction { Up, Down, Left, Right }
Direction.Up          // 0
Direction[0]          // 'Up'  (reverse mapping)

// string enum: no reverse mapping, readable values (better for APIs and logs)
enum Status {
  Active = 'ACTIVE',
  Banned = 'BANNED',
}
function setStatus(s: Status) {}
setStatus(Status.Active)
setStatus('ACTIVE')   // ❌ string enums are nominal: plain strings aren't accepted
```

**What an enum compiles to** (it's real JavaScript):

```js
var Direction;
(function (Direction) {
  Direction[Direction["Up"] = 0] = "Up";
  Direction[Direction["Down"] = 1] = "Down";
  // …
})(Direction || (Direction = {}));
```

**Enum problems:**
- They generate runtime code and **aren't erasable**. Node's type stripping throws `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`, and `erasableSyntaxOnly` flags them.
- **Numeric enums accept any number** in older TypeScript versions, and reverse mappings add confusion.
- `const enum` is inlined, but it breaks with per-file transpilers (`isolatedModules`: Vite, esbuild, SWC).

---

## Modern alternatives

**1. A union of literals** (zero runtime code):

```ts
type Status = 'ACTIVE' | 'BANNED'
setStatus('ACTIVE')     // ✅ plain strings work, with autocomplete
```

**2. An `as const` object** (when you also need the values at runtime, e.g. for a dropdown):

```ts
export const Status = {
  Active: 'ACTIVE',
  Banned: 'BANNED',
} as const

export type Status = (typeof Status)[keyof typeof Status]   // 'ACTIVE' | 'BANNED'

setStatus(Status.Active)          // like an enum
setStatus('BANNED')               // plain strings work too
Object.values(Status)             // ['ACTIVE', 'BANNED'] for <select> options
```

**Same name for the value and the type is fine.** TypeScript keeps values and types in separate spaces.

---

## Interview Q&A

**Q: `private` vs `#private`?**
`private` is checked only by the compiler and still exists at runtime (bracket access works). `#private` is a JavaScript feature enforced by the engine.

**Q: Abstract class vs interface?**
An interface is a type-only contract; an abstract class is a real class that can share implementation and force subclasses to implement abstract members.

**Q: Why do many teams avoid enums?**
They're not type-only: they generate runtime code, aren't supported by type-stripping tools like Node's, and `const enum` breaks with isolated modules. Union types or `as const` objects give the same safety with plain JavaScript.

**Q: What does `readonly` guarantee?**
Only that TypeScript code can't reassign the property. It's not a runtime freeze (use `Object.freeze` for that), and it's shallow.

---

## 🎯 Interview answer

> "TypeScript adds `public`, `protected`, `private` and `readonly` modifiers to classes, plus abstract classes, `implements`, `override` and parameter properties. I know `private` is compile-time only, since bracket access still works at runtime, so for real encapsulation I use JavaScript's `#private` fields. Abstract classes are real classes that share implementation and force subclasses to implement certain methods, while interfaces are type-only contracts, useful for dependency injection and mocks. Enums are a named set of constants, but they're one of the few TypeScript features that generate runtime code: numeric enums have reverse mappings, `const enum` breaks with isolated-module transpilers like esbuild, and Node's type stripping and `erasableSyntaxOnly` reject enums and parameter properties. So in modern code I prefer union literal types, or an `as const` object with a derived union type when I also need the values at runtime, for example for dropdown options."
