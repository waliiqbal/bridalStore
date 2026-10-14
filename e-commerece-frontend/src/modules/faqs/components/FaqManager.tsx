"use client";

import { useState, type FormEvent } from "react";
import { LuPencil, LuPlus, LuTrash2 } from "react-icons/lu";
import { Button } from "@/shared/admin/Button";
import { useAdminUi } from "@/shared/admin/AdminUiProvider";
import { Field, Input, Toggle } from "@/shared/admin/Form";
import { useAdminQuery } from "@/shared/admin/hooks";
import { EmptyState, Notice, PageHeader, Spinner } from "@/shared/admin/Layout";
import { Modal } from "@/shared/admin/Modal";
import { ReorderList } from "@/shared/admin/ReorderList";
import { RichTextField } from "@/shared/admin/RichTextField";
import { createFaq, deleteFaq, listFaqs, reorderFaqs, updateFaq } from "../api/faqs.api";
import type { AdminFaq } from "../types/faqs";

const plainText = (html: string) =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function FaqManager() {
  const ui = useAdminUi();
  const faqs = useAdminQuery(() => listFaqs(), []);
  // `null` = closed, `"new"` = adding, otherwise the question being edited
  const [editing, setEditing] = useState<AdminFaq | "new" | null>(null);

  async function reorder(next: AdminFaq[]) {
    try {
      await reorderFaqs(next.map((faq) => faq.id));
      faqs.reload();
    } catch (error) {
      ui.error(error);
    }
  }

  async function toggleShown(faq: AdminFaq, isActive: boolean) {
    try {
      await updateFaq(faq.id, { isActive });
      faqs.reload();
    } catch (error) {
      ui.error(error);
    }
  }

  async function remove(faq: AdminFaq) {
    const ok = await ui.confirm({
      title: "Delete this question?",
      message: `“${faq.question}” will be removed from your website.`,
      confirmLabel: "Delete question",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteFaq(faq.id);
      ui.success("Question deleted.");
      faqs.reload();
    } catch (error) {
      ui.error(error);
    }
  }

  return (
    <>
      <PageHeader
        title="FAQ"
        description="Questions customers often ask, with your answers. They appear on your FAQ page and in any Questions block you add to a page."
        actions={
          <Button onClick={() => setEditing("new")}>
            <LuPlus className="h-4 w-4" />
            Add question
          </Button>
        }
      />

      {faqs.error && (
        <div className="space-y-3">
          <Notice tone="error">{faqs.error}</Notice>
          <Button variant="secondary" onClick={faqs.reload}>
            Try again
          </Button>
        </div>
      )}
      {!faqs.error && !faqs.data && <Spinner />}

      {!faqs.error && faqs.data && faqs.data.length === 0 && (
        <EmptyState
          title="No questions yet"
          description="Good ones to start with: delivery time, custom sizing, returns, and how to care for the outfit."
          action={<Button onClick={() => setEditing("new")}>Add question</Button>}
        />
      )}

      {!faqs.error && faqs.data && faqs.data.length > 0 && (
        <>
          <p className="mb-3 text-sm text-muted">
            Drag the questions, or use the arrows, to change the order customers see.
          </p>
          <ReorderList
            items={faqs.data}
            getKey={(faq) => faq.id}
            onReorder={reorder}
            className="space-y-3"
            itemClassName="rounded-sm border border-line bg-white"
            renderItem={(faq, { controls }) => (
              <div className={`flex flex-wrap items-center gap-3 p-3 ${faq.isActive ? "" : "bg-cream/50"}`}>
                {controls}
                <div className="min-w-0 flex-1 basis-56">
                  <p className="font-medium">{faq.question}</p>
                  <p className="line-clamp-2 text-sm text-muted">{plainText(faq.answer)}</p>
                </div>
                <Toggle
                  checked={faq.isActive}
                  onChange={(value) => toggleShown(faq, value)}
                  label={faq.isActive ? "Shown" : "Hidden"}
                />
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="secondary" onClick={() => setEditing(faq)}>
                    <LuPencil className="h-4 w-4" />
                    Edit
                  </Button>
                  <button
                    type="button"
                    onClick={() => remove(faq)}
                    aria-label={`Delete question: ${faq.question}`}
                    className="flex h-9 w-9 items-center justify-center rounded-sm text-red-600 hover:bg-red-50"
                  >
                    <LuTrash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          />
        </>
      )}

      {editing && (
        <FaqEditor
          // A fresh editor each time it opens
          key={editing === "new" ? "new" : editing.id}
          faq={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            faqs.reload();
          }}
        />
      )}
    </>
  );
}

function FaqEditor({
  faq,
  onClose,
  onSaved,
}: {
  faq: AdminFaq | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const ui = useAdminUi();
  const [question, setQuestion] = useState(faq?.question ?? "");
  const [answer, setAnswer] = useState(faq?.answer ?? "");
  const [isActive, setIsActive] = useState(faq?.isActive ?? true);
  const [errors, setErrors] = useState<{ question?: string; answer?: string }>({});
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    const found = {
      question: question.trim() ? undefined : "Please write the question.",
      answer: plainText(answer) ? undefined : "Please write the answer.",
    };
    setErrors(found);
    if (found.question || found.answer) {
      ui.error(new Error(found.question ?? found.answer));
      return;
    }
    setSaving(true);
    try {
      const input = { question: question.trim(), answer, isActive };
      if (faq) await updateFaq(faq.id, input);
      else await createFaq(input);
      ui.success(faq ? "Question saved." : "Question added.");
      onSaved();
    } catch (error) {
      ui.error(error);
      setSaving(false);
    }
  }

  return (
    <Modal open title={faq ? "Edit question" : "Add question"} size="lg" onClose={onClose}>
      <form onSubmit={save} className="space-y-5">
        <Field label="Question" htmlFor="q-question" required error={errors.question}>
          <Input
            id="q-question"
            value={question}
            maxLength={500}
            autoFocus
            placeholder="e.g. How long does a made-to-order outfit take?"
            onChange={(event) => {
              setQuestion(event.target.value);
              setErrors((current) => ({ ...current, question: undefined }));
            }}
          />
        </Field>
        <Field label="Answer" htmlFor="q-answer" required error={errors.answer}>
          <RichTextField id="q-answer" value={answer} onChange={setAnswer} minHeight={140} />
        </Field>
        <Toggle
          checked={isActive}
          onChange={setIsActive}
          label="Show this question on the website"
          hint="Turn off to hide it without deleting it."
        />
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {faq ? "Save question" : "Add question"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
