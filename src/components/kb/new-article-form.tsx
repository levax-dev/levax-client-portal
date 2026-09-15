"use client"

import { useActionState } from "react"

import { createKbArticle, type ActionState } from "@/app/actions/kb"
import { SubmitButton } from "@/components/submit-button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { KbCategory } from "@/types/database"

const initialState: ActionState = null

export function NewArticleForm({ categories }: { categories: KbCategory[] }) {
  const [state, action] = useActionState(createKbArticle, initialState)

  return (
    <form action={action}>
      <FieldGroup>
        {state?.error && (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}
        <Field>
          <FieldLabel htmlFor="title">Title</FieldLabel>
          <Input id="title" name="title" required maxLength={200} />
        </Field>
        <Field>
          <FieldLabel htmlFor="categoryId">Category</FieldLabel>
          <Select name="categoryId">
            <SelectTrigger id="categoryId" className="w-full">
              <SelectValue placeholder="Uncategorized" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="excerpt">Excerpt</FieldLabel>
          <Textarea id="excerpt" name="excerpt" rows={2} placeholder="Eg. Learn how to raise and track a support ticket." />
        </Field>
        <Field>
          <FieldLabel htmlFor="content">Content</FieldLabel>
          <Textarea id="content" name="content" rows={14} required className="font-mono text-sm" />
          <FieldDescription>Markdown is supported — headings, lists, links, code blocks.</FieldDescription>
        </Field>
        <Label className="flex items-center gap-2 text-sm font-normal">
          <Checkbox name="isPublished" defaultChecked />
          Publish immediately
        </Label>
        <SubmitButton pendingText="Publishing…">Save article</SubmitButton>
      </FieldGroup>
    </form>
  )
}
