"use client";

import { useEffect, useRef, useState } from "react";

export default function InlineEditor({
  value,
  onChange,
  forceEdit = false,
  onEditingChange,
  displayClassName,
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value || "");
  const ref = useRef(null);

  useEffect(() => {
    if (editing && ref.current) ref.current.focus();
  }, [editing]);

  useEffect(() => {
    let _timer = null;
    try {
      if (forceEdit) {
        _timer = setTimeout(() => {
          try {
            setEditing(true);
          } catch (e) {}
          try {
            if (typeof onEditingChange === "function") onEditingChange(true);
          } catch (e) {}
        }, 0);
      }
    } catch (e) {}
    return () => {
      try {
        if (_timer) clearTimeout(_timer);
      } catch (e) {}
    };
  }, [forceEdit, onEditingChange]);

  useEffect(() => {
    if (editing) return;
    const newText = value || "";
    if (newText === text) return;
    const id = setTimeout(() => setText(newText), 0);
    return () => clearTimeout(id);
  }, [value, editing, text]);

  function commit() {
    setEditing(false);
    try {
      if (typeof onEditingChange === "function") onEditingChange(false);
    } catch (e) {}
    if (typeof onChange === "function" && text !== value) onChange(text);
  }

  return editing ? (
    <input
      ref={ref}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") {
          setEditing(false);
          try {
            if (typeof onEditingChange === "function") onEditingChange(false);
          } catch (e) {}
          setText(value || "");
        }
      }}
      className="task-text-input"
      style={{
        background: "transparent",
        border: "none",
        color: "var(--foreground)",
        outline: "none",
        fontSize: 14,
      }}
    />
  ) : (
    <div
      className={displayClassName}
      style={{ cursor: "text" }}
      onDoubleClick={() => {
        setEditing(true);
        try {
          if (typeof onEditingChange === "function") onEditingChange(true);
        } catch (e) {}
      }}
    >
      {value}
    </div>
  );
}
