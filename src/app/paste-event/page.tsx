import { PasteEventForm } from "@/components/PasteEventForm";

export default function PasteEventPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Paste Event</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Manual analyzer — rules-first scoring, optional AI classification.
        </p>
      </div>
      <PasteEventForm />
    </div>
  );
}
