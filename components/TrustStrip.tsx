"use client";

import React from "react";

interface TrustStripProps {
  updatedAt?: string;
  cachedAt?: string;
  lastNewsTime?: string;
  tradeCount?: number;
  confidence?: string;
  variant?: "compact" | "full";
}

export default function TrustStrip({
  updatedAt,
  cachedAt,
  lastNewsTime,
  tradeCount,
  confidence = "보통",
  variant = "full",
}: TrustStripProps) {
  const time = updatedAt || cachedAt || lastNewsTime;
  if (!time) return null;

  const formatted = new Date(time).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const bg = variant === "compact" ? "#FEF3C7" : "#F0FDF4";
  const color = variant === "compact" ? "#92400E" : "#166534";

  return (
    <div
      style={{
        fontSize: variant === "compact" ? 10 : 11,
        color,
        background: bg,
        padding: "4px 8px",
        borderRadius: 6,
        marginBottom: 8,
        display: "flex",
        alignItems: "center",
        gap: 6,
        flexWrap: "wrap",
      }}
    >
      📅 데이터 기준: {formatted}
      {lastNewsTime && <span>(뉴스 {new Date(lastNewsTime).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })})</span>}
      {tradeCount != null && <span>· 거래 {tradeCount}건</span>}
      <span>· 신뢰도 {confidence}</span>
      <span style={{ fontSize: 9, opacity: 0.7 }}>(이후 업데이트 미반영 가능)</span>
    </div>
  );
}
