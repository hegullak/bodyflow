"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export function SortableWorkoutBlock({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        position: "relative",
      }}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute inset-y-0 left-0 z-10 w-8 cursor-grab touch-none active:cursor-grabbing"
        aria-label="Drag to reorder"
      />
      {children}
    </div>
  );
}
