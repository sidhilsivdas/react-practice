## 📄 Original answer (PDF)

**Question:** Explain how you would manage extremely complex, multi-page forms with complex validation dependencies.

**Answer:** I would use a robust form state library like React Hook Form paired with Zod for schema validation. For multi-page wizards, I lift the form state to a Context or a lightweight global store (Zustand) so data persists between steps.

**Real-time example:** A 10-step mortgage application. Zod validates the schema at each step. React Hook Form manages local rendering without re-rendering the whole form. Zustand holds the draft payload, allowing the user to navigate back and forth without losing data.

---

## 💡 Schema per step

```ts
import { z } from 'zod'

export const personalSchema = z.object({
  fullName: z.string().min(2, 'Enter your full name'),
  dateOfBirth: z.coerce.date().max(new Date(), 'Date of birth must be in the past'),
  email: z.string().email(),
})

export const incomeSchema = z
  .object({
    employmentType: z.enum(['employed', 'self-employed', 'retired']),
    annualIncome: z.coerce.number().positive(),
    employerName: z.string().optional(),
    yearsTrading: z.coerce.number().optional(),
  })
  // dependent validation: required fields depend on another answer
  .superRefine((data, ctx) => {
    if (data.employmentType === 'employed' && !data.employerName) {
      ctx.addIssue({ code: 'custom', path: ['employerName'], message: 'Employer name is required' })
    }
    if (data.employmentType === 'self-employed' && (data.yearsTrading ?? 0) < 2) {
      ctx.addIssue({ code: 'custom', path: ['yearsTrading'], message: 'At least 2 years of trading is required' })
    }
  })

// the full application = all steps merged (validated again on the server!)
export const applicationSchema = personalSchema.merge(incomeSchema.innerType()) /* … */
```

**Alternatives for branching data:** `z.discriminatedUnion('employmentType', [...])` gives a different shape per answer, with clean TypeScript types.

---

## 💡 One step

```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

function IncomeStep() {
  const draft = useApplicationStore((s) => s.draft)
  const saveStep = useApplicationStore((s) => s.saveStep)
  const goNext = useApplicationStore((s) => s.next)

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(incomeSchema),
    defaultValues: draft.income,                    // restore when navigating back
    mode: 'onBlur',                                 // validate when leaving a field, not on every keystroke
  })

  const employmentType = watch('employmentType')    // show conditional fields

  return (
    <form onSubmit={handleSubmit((values) => { saveStep('income', values); goNext() })} noValidate>
      <label htmlFor="type">Employment type</label>
      <select id="type" {...register('employmentType')}>…</select>

      {employmentType === 'employed' && (
        <>
          <label htmlFor="employer">Employer name</label>
          <input id="employer" {...register('employerName')}
                 aria-invalid={!!errors.employerName} aria-describedby="employer-error" />
          {errors.employerName && <p id="employer-error" role="alert">{errors.employerName.message}</p>}
        </>
      )}
      <button disabled={isSubmitting}>Continue</button>
    </form>
  )
}
```

**Why React Hook Form:** inputs are **uncontrolled** (refs), so typing doesn't re-render the whole form. With 100+ fields this matters a lot for INP.

---

## 💡 Wizard state

```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Step = 'personal' | 'income' | 'property' | 'review'

export const useApplicationStore = create(
  persist(
    (set) => ({
      step: 'personal' as Step,
      draft: {} as Partial<Record<Step, unknown>>,
      saveStep: (step: Step, values: unknown) => set((s) => ({ draft: { ...s.draft, [step]: values } })),
      next: () => set((s) => ({ step: nextStep(s.step) })),
      back: () => set((s) => ({ step: prevStep(s.step) })),
      reset: () => set({ step: 'personal', draft: {} }),
    }),
    { name: 'mortgage-draft', storage: createJSONStorage(() => sessionStorage) }   // survives refresh in this tab
  )
)
```

**Better for long, important forms: save drafts on the server** (autosave each step, debounced). Then users can continue on another device, and you don't keep personal or financial data in browser storage.

---

## 💡 UX & architecture details

| Concern | Approach |
|---|---|
| **Step in the URL** | `/apply/income`: browser Back works, deep links resume, analytics per step |
| **Guarding steps** | Can't open "review" until earlier steps are valid; redirect to the first incomplete step |
| **Cross-step dependencies** | Validate the full schema before submit; re-validate later steps when earlier answers change (e.g. a changed employment type clears income details) |
| **Async validation** | Postcode lookup or "email already registered", debounced, with clear loading states |
| **Error summary** | On submit, a focused summary at the top linking to each invalid field (accessibility) |
| **Accessibility** | Labels, `aria-invalid`, `aria-describedby`, `autocomplete` attributes, focus moves to the step heading on navigation, progress announced ("Step 2 of 10") |
| **Unsaved changes** | Warn on leaving (`beforeunload` / a router blocker) |
| **Server validation** | **Always validate again on the server** with the same zod schema (shared package); map server errors back to fields |
| **Performance** | Lazy-load step components; RHF's `useWatch` for isolated subscriptions; avoid watching the whole form |
| **Testing** | Unit tests for schemas, component tests per step, a Playwright E2E for the full happy path + key validation paths |

**For huge dynamic forms** (forms driven by configuration from the server), consider a **schema-driven form engine** (JSON schema → fields) so business teams can change questions without deployments.

---

## 🎯 Interview answer

> "I'd use React Hook Form with zod: each step has its own schema, dependent rules like 'employer name is required when employed' use `superRefine` or discriminated unions, and React Hook Form keeps inputs uncontrolled so typing doesn't re-render the whole form, which matters for large forms. The wizard's draft lives outside the step components, in a small Zustand store or context, persisted to sessionStorage, or better, autosaved to the server so users can resume on another device without sensitive data sitting in browser storage. Each step restores its default values from the draft, the current step lives in the URL so Back and deep links work, and later steps are guarded until earlier ones are valid, with re-validation when earlier answers change. Before submitting, I validate the full combined schema, and the server validates again with the same shared schema, mapping errors back to fields. On top of that come accessible error messages and an error summary, focus management between steps, async field checks, unsaved-change warnings, lazy-loaded steps, and Playwright tests for the full journey."
