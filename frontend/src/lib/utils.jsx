import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import * as LucideIcons from "lucide-react";

// Merges Tailwind CSS classes conditionally without conflicts.
// 조건부 로직으로 Tailwind 클래스를 병합하며 충돌을 방지
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Renders a Lucide icon dynamically based on the name string.
// 이름 문자열을 기반으로 Lucide 아이콘을 동적으로 렌더링
export const getIcon = (name, props) => {
  if (!name) return null;
  const pascalName = name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  const IconComponent = LucideIcons[pascalName] || LucideIcons.HelpCircle;
  return <IconComponent {...props} />;
};
