"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Pencil, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ───────────────────────────────────────────────────────────────────

interface AssignmentItem {
  id: number;
  title: string;
  subtitle?: string | null;
  badges?: string[];
  meta?: string;
  notes?: string | null;
}

interface SortableAssignmentListProps {
  items: AssignmentItem[];
  onReorder: (ids: number[]) => void;
  onEdit: (id: number) => void;
  onRemove: (id: number) => void;
}

// ── Dropdown Menu ───────────────────────────────────────────────────────────

function ContextMenu({ onEdit, onRemove }: { onEdit: () => void; onRemove: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
      >
        <MoreVertical className="size-3.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-card border rounded-lg shadow-lg py-1 min-w-[120px]">
            <button
              onClick={() => { onEdit(); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted flex items-center gap-2"
            >
              <Pencil className="size-3" /> Edit
            </button>
            <button
              onClick={() => { onRemove(); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted text-destructive flex items-center gap-2"
            >
              <Trash2 className="size-3" /> Remove
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Sortable Card ───────────────────────────────────────────────────────────

function SortableCard({
  item,
  onEdit,
  onRemove,
}: {
  item: AssignmentItem;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm bg-card",
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary/20"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
      >
        <GripVertical className="size-3.5" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{item.title}</p>
          {item.badges?.map((b) => (
            <span key={b} className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {b}
            </span>
          ))}
        </div>
        {item.subtitle && <p className="text-xs text-muted-foreground italic">{item.subtitle}</p>}
        {item.meta && <p className="text-xs text-muted-foreground">{item.meta}</p>}
        {item.notes && <p className="text-xs text-muted-foreground/70 mt-0.5 italic">Note: {item.notes}</p>}
      </div>
      <ContextMenu onEdit={onEdit} onRemove={onRemove} />
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function SortableAssignmentList({
  items,
  onReorder,
  onEdit,
  onRemove,
}: SortableAssignmentListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIdx = items.findIndex((i) => i.id === active.id);
    const newIdx = items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(items, oldIdx, newIdx);
    onReorder(reordered.map((i) => i.id));
  }

  if (items.length === 0) return null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {items.map((item) => (
            <SortableCard
              key={item.id}
              item={item}
              onEdit={() => onEdit(item.id)}
              onRemove={() => onRemove(item.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export type { AssignmentItem };
