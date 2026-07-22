"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AuctionPanel, { type AuctionDetail } from "@/components/AuctionPanel";
import {
  budgetBand,
  cashNeedApprox,
  eokToManwon,
  filterByBudgetBand,
  formatManwonShort,
  isHighRiskSignal,
  loadWishlistIds,
  recommendReason,
  LS_AUCTION_BUDGET_EOK,
  LS_AUCTION_HIDE_HIGH,
  LS_AUCTION_DELTA_PCT,
} from "@/lib/auction/budgetFilter";

const GATE_URL = process.env.NEXT_PUBLIC_GATE_URL || "/gate";
const LS_BUDGET_EOK = LS_AUCTION_BUDGET_EOK;
const LS_HIDE_HIGH = LS_AUCTION_HIDE_HIGH;
const LS_DELTA_PCT = LS_AUCTION_DELTA_PCT;

// Types
interface AuctionItemBase {
  id: string | number;
  case_no?: string;
  display_no?: string;
  court: string;
  kind: "아파트" | "오피스텔" | "다세대" | "연립" | "단독" | "상가" | string;
  address?: string;
  area_m2?: number;
  appraisal_price: number;
  min_bid_price: number;
  fail_count: number;
  sale_date: string;
  lat: number;
  lon: number;
  bld_nm: string;
  discount_vs_appraisal_pct?: number;
  discount_vs_market_pct?: number | null;
  discount_pct?: number | null;
  price_ref_label?: string | null;
  signal?: string | null;
  signal_level?: string | null;
  round?: number | null;
  liquidity?: { level?: string; avg_monthly?: number } | null;
}

interface ShortTradeItem extends AuctionItemBase {
  matched_apt_nm: string;
}

interface RentalItem extends AuctionItemBase {
  edu_score: number;
  drawdown_from_peak: number;
  market_price: number;
}

type AuctionItem = AuctionItemBase & Partial<ShortTradeItem & RentalItem>;

type TabType = "all" | "short-trade" | "rental";
type SortType = "recommend" | "discount_desc" | "min_bid_asc" | "sale_date_asc" | "fail_count_desc";

const TAB_LABELS: Record<TabType, string> = {
  all: "전체",
  "short-trade": "시세차익",
  rental: "월세수익",
};

const SORT_OPTIONS: { value: SortType; label: string }[] = [
  { value: "recommend", label: "추천순 (신호등·할인)" },
  { value: "discount_desc", label: "할인율 높은순" },
  { value: "min_bid_asc", label: "최저가순" },
  { value: "sale_date_asc", label: "마감임박순" },
  { value: "fail_count_desc", label: "유찰많은순" },
];

const KIND_COLORS: Record<string, { bg: string; text: string }> = {
  아파트: { bg: "#DBEAFE", text: "#1E40AF" },
  오피스텔: { bg: "#FCE7F3", text: "#BE185D" },
  다세대: { bg: "#FEF3C7", text: "#B45309" },
  연립: { bg: "#FEF3C7", text: "#B45309" },
  단독: { bg: "#EDE9FE", text: "#6D28D9" },
  상가: { bg: "#FCE7F3", text: "#BE185D" },
};

const KIND_DEFAULT = { bg: "#F1F5F9", text: "#475569" };

const DDAY_COLORS = [
  { days: 0, bg: "#FEF2F2", text: "#DC2626", label: "오늘" },
  { days: 3, bg: "#FEF2F2", text: "#DC2626" },
  { days: 7, bg: "#FFF7ED", text: "#EA580C" },
  { days: 14, bg: "#FFFBEB", text: "#D97706" },
  { days: 30, bg: "#F0FDF4", text: "#16A34A" },
  { days: Infinity, bg: "#F1F5F9", text: "#64748B" },
];

const formatPrice = (price: number): string => {
  if (price >= 100000000) {
    const eok = Math.floor(price / 100000000);
    const man = Math.floor((price % 100000000) / 10000);
    return man > 0 ? `${eok}억 ${man}만원` : `${eok}억원`;
  }
  return `${Math.floor(price / 10000)}만원`;
};

const formatNumber = (num: number): string => {
  return num.toLocaleString("ko-KR", { useGrouping: true });
};

const getDDay = (saleDate?: string | null): { days: number; label: string; bg: string; text: string } => {
  if (!saleDate) return { days: 999, label: "기일 미정", bg: "#F1F5F9", text: "#64748B" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sale = new Date(String(saleDate).replace(/\./g, "-"));
  if (Number.isNaN(sale.getTime())) return { days: 999, label: "기일 미정", bg: "#F1F5F9", text: "#64748B" };
  sale.setHours(0, 0, 0, 0);
  const diffMs = sale.getTime() - today.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  for (const d of DDAY_COLORS) {
    if (days <= d.days) {
      return { days, label: days <= 0 ? "오늘" : `D-${days}`, bg: d.bg, text: d.text };
    }
  }
  return { days, label: `D-${days}`, bg: "#F1F5F9", text: "#64748B" };
};

const getKindColor = (kind: string) => KIND_COLORS[kind] || KIND_DEFAULT;

const formatArea = (m2: number): string => {
  const pyeong = Math.round(m2 * 0.3025 * 10) / 10;
  return `${m2}㎡ (약 ${pyeong}평)`;
};

const getDiscountColor = (pct: number): string => {
  if (pct >= 30) return "#DC2626";
  if (pct >= 20) return "#EA580C";
  if (pct >= 10) return "#D97706";
  return "#059669";
};

const fetchAuctionData = async (tab: TabType): Promise<AuctionItem[]> => {
  let url = "";
  switch (tab) {
    case "all":
      url = `${GATE_URL}/auction/list?lat_min=33&lat_max=39&lon_min=124&lon_max=132&limit=500`;
      break;
    case "short-trade":
      url = `${GATE_URL}/auction/filter/short-trade?limit=500`;
      break;
    case "rental":
      url = `${GATE_URL}/auction/filter/rental?limit=500`;
      break;
  }
  
  const res = await fetch(url);
  if (!res.ok) throw new Error("데이터를 불러오는데 실패했습니다.");
  const data = await res.json();
  // gate list: { items, disclaimer } | filter: array | { items }
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
};

const discOf = (i: AuctionItem) =>
  Number(i.discount_pct ?? i.discount_vs_market_pct ?? i.discount_vs_appraisal_pct ?? 0);

const sortItems = (items: AuctionItem[], sort: SortType): AuctionItem[] => {
  const sorted = [...items];
  switch (sort) {
    case "recommend":
      return sorted.sort((a, b) => {
        // 위험(🔴) 제외 우선
        const aRed = (a.signal_level === "위험" || a.signal === "🔴") ? 1 : 0;
        const bRed = (b.signal_level === "위험" || b.signal === "🔴") ? 1 : 0;
        if (aRed !== bRed) return aRed - bRed;
        // 그 다음 할인율 큰 순
        return discOf(b) - discOf(a);
      });
    case "discount_desc":
      return sorted.sort((a, b) => discOf(b) - discOf(a));
    case "min_bid_asc":
      return sorted.sort((a, b) => a.min_bid_price - b.min_bid_price);
    case "sale_date_asc":
      return sorted.sort((a, b) => {
        const ta = a.sale_date ? new Date(String(a.sale_date).replace(/\./g, "-")).getTime() : 0;
        const tb = b.sale_date ? new Date(String(b.sale_date).replace(/\./g, "-")).getTime() : 0;
        return ta - tb;
      });
    case "fail_count_desc":
      return sorted.sort((a, b) => (b.fail_count || 0) - (a.fail_count || 0));
  }
};

const SkeletonCard = () => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 animate-pulse space-y-3">
    <div className="flex items-center gap-2">
      <div className="h-5 w-20 bg-gray-200 rounded-full"></div>
      <div className="h-5 w-16 bg-gray-200 rounded-full ml-auto"></div>
    </div>
    <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
    <div className="h-3 w-1/2 bg-gray-200 rounded"></div>
    <div className="grid grid-cols-2 gap-3 mt-2">
      <div className="h-12 bg-gray-200 rounded-lg"></div>
      <div className="h-12 bg-gray-200 rounded-lg"></div>
    </div>
    <div className="h-6 w-1/3 bg-gray-200 rounded"></div>
    <div className="flex items-center gap-2">
      <div className="h-5 w-20 bg-gray-200 rounded"></div>
      <div className="h-5 w-16 bg-gray-200 rounded ml-auto"></div>
    </div>
  </div>
);

const DetailModal = ({ item, onClose, tab }: { item: AuctionItem | null; onClose: () => void; tab: TabType }) => {
  if (!item) return null;
  
  const dday = getDDay(item.sale_date);
  const kindColor = getKindColor(item.kind);
  const discA = item.discount_vs_appraisal_pct ?? item.discount_pct ?? 0;
  const discM = item.discount_vs_market_pct ?? item.discount_pct ?? null;
  const discountColor = getDiscountColor(Number(discA));
  const areaM2 = item.area_m2 ?? 0;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-xl font-bold text-slate-900">물건 상세 정보</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Header Badge Row */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ background: kindColor.bg, color: kindColor.text }}>
              {item.kind}
            </span>
            <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ background: dday.bg, color: dday.text }}>
              {dday.label} ({item.sale_date})
            </span>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-amber-50 text-amber-700">
              유찰 {item.fail_count}회
            </span>
            {tab === "short-trade" && "matched_apt_nm" in item && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-emerald-50 text-emerald-700">
                {(item as ShortTradeItem).matched_apt_nm}
              </span>
            )}
            {tab === "rental" && "edu_score" in item && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700">
                학군 {(item as RentalItem).edu_score}
              </span>
            )}
          </div>
          
          {/* Case Info */}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-sm font-medium text-gray-500 mb-3">사건 정보</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">사건번호</span><p className="font-medium text-slate-900 mt-1">{item.case_no}</p></div>
              <div><span className="text-gray-500">관할법원</span><p className="font-medium text-slate-900 mt-1">{item.court}</p></div>
              <div className="col-span-2"><span className="text-gray-500">건물명</span><p className="font-medium text-slate-900 mt-1">{item.bld_nm || "-"}</p></div>
              <div className="col-span-2"><span className="text-gray-500">주소</span><p className="font-medium text-slate-900 mt-1">{item.address}</p></div>
            </div>
          </div>
          
          {/* Price Info */}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-sm font-medium text-gray-500 mb-3">가격 정보</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-gray-500 text-sm">감정가</p>
                <p className="font-bold text-2xl text-slate-900 tabular-nums mt-1">{formatManwonShort(item.appraisal_price)}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-gray-500 text-sm">최저입찰가</p>
                <p className="font-bold text-2xl text-red-600 tabular-nums mt-1">{formatManwonShort(item.min_bid_price)}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-gray-500 text-sm">할인 ({item.price_ref_label || "참고"})</p>
                <p className="font-bold text-2xl tabular-nums mt-1" style={{ color: discountColor }}>
                  {discM != null ? `${Number(discM) > 0 ? "-" : "+"}${Math.abs(Number(discM)).toFixed(0)}%` : `${Number(discA).toFixed(0)}%`}
                </p>
              </div>
            </div>
          </div>
          
          {/* Area Info */}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-sm font-medium text-gray-500 mb-3">면적 정보</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-gray-500 text-sm">전용면적</p>
                <p className="font-bold text-xl text-slate-900 tabular-nums mt-1">{areaM2 > 0 ? formatArea(areaM2) : "-"}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-gray-500 text-sm">평당 감정가</p>
                <p className="font-bold text-xl text-slate-900 tabular-nums mt-1">
                  {areaM2 > 0 ? formatManwonShort(Math.round(item.appraisal_price / (areaM2 * 0.3025))) : "-"}
                </p>
              </div>
            </div>
          </div>
          
          {/* Tab-specific info */}
          {(tab === "short-trade" || (tab === "all" && "matched_apt_nm" in item)) && "matched_apt_nm" in item && (
            <div className="border-t border-gray-100 pt-6 bg-emerald-50 rounded-xl p-4">
              <h3 className="text-sm font-medium text-emerald-700 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                시세차익 분석
              </h3>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div><p className="text-emerald-600 font-medium">매칭 아파트</p><p className="font-bold text-slate-900 mt-1">{(item as ShortTradeItem).matched_apt_nm}</p></div>
              </div>
            </div>
          )}
          
          {(tab === "rental" || (tab === "all" && "edu_score" in item)) && "edu_score" in item && (
            <div className="border-t border-gray-100 pt-6 bg-blue-50 rounded-xl p-4">
              <h3 className="text-sm font-medium text-blue-700 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
                월세수익 분석
              </h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><p className="text-blue-600 font-medium">학군 점수</p><p className="font-bold text-2xl tabular-nums mt-1 text-blue-700">{(item as RentalItem).edu_score}</p></div>
                <div><p className="text-blue-600 font-medium">고점 대비 하락률</p><p className="font-bold text-2xl tabular-nums mt-1 text-red-600">{(item as RentalItem).drawdown_from_peak.toFixed(1)}%</p></div>
                <div><p className="text-blue-600 font-medium">시세</p><p className="font-bold text-xl tabular-nums mt-1 text-slate-900">{formatPrice((item as RentalItem).market_price)}</p></div>
              </div>
            </div>
          )}
          
          {/* Coordinates */}
          <div className="border-t border-gray-100 pt-6 text-sm text-gray-500">
            <p>위도: {item.lat.toFixed(6)} / 경도: {item.lon.toFixed(6)}</p>
          </div>
        </div>
        
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 rounded-b-2xl">
          <button onClick={onClose} className="w-full bg-slate-900 text-white py-3 rounded-xl font-medium hover:bg-slate-800 transition-colors">
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

const AuctionCard = ({
  item, tab, onClick, budgetManwon, delta, wishlisted,
}: {
  item: AuctionItem; tab: TabType; onClick?: () => void
  budgetManwon: number | null; delta: number
  wishlisted?: boolean
}) => {
  const dday = getDDay(item.sale_date);
  const kindColor = getKindColor(item.kind);
  const disc = item.discount_pct ?? item.discount_vs_market_pct ?? item.discount_vs_appraisal_pct ?? 0;
  const discountColor = getDiscountColor(typeof disc === "number" ? disc : 0);
  const areaPyeong = item.area_m2 ? Math.round(item.area_m2 * 0.3025 * 10) / 10 : null;
  const band = budgetBand(item.min_bid_price ?? 0, budgetManwon, delta);
  const refLabel = item.price_ref_label || "감정가";
  const signal = item.signal || (item.signal_level === "위험" ? "🔴" : item.signal_level === "비쌈" ? "🟡" : item.signal_level === "저렴" ? "🟢" : "");
  const signalLevelLabel = item.signal_level || "";
  const signalColor = signalLevelLabel === "저렴" ? "#16A34A" : signalLevelLabel === "비쌈" ? "#EA9A0B" : signalLevelLabel === "위험" ? "#DC2626" : "#6B7280";
  const signalBg = signalLevelLabel === "저렴" ? "#E7F6EE" : signalLevelLabel === "비쌈" ? "#FCF3DF" : signalLevelLabel === "위험" ? "#FBEAEA" : "#F3F4F6";
  const reason = recommendReason(item, budgetManwon, delta);
  const cash = cashNeedApprox(item.min_bid_price);
  
  return (
    <article 
      className="group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-gray-200 transition-all duration-200 p-4 cursor-pointer"
      tabIndex={0}
      role="button"
      onClick={onClick}
      onKeyDown={e => e.key === "Enter" && onClick?.()}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {signal && <span className="text-base leading-none" title={signalLevelLabel}>{signal}</span>}
          {signalLevelLabel && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: signalBg, color: signalColor }}>
              {signalLevelLabel}
            </span>
          )}
          {item.round != null && item.round > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
              {item.round}차
            </span>
          )}
          {item.liquidity?.level && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold"
              title="지역 월평균 실거래 (거래 많을수록 되팔기 쉬움 — 1순위)"
              style={item.liquidity.level === "매우희소"
                ? { background: "#FBEAEA", color: "#DC2626" }
                : item.liquidity.level === "희소"
                ? { background: "#FCF3DF", color: "#EA9A0B" }
                : { background: "#E7F6EE", color: "#0B7D54" }}>
              거래 {item.liquidity.level}·{item.liquidity.avg_monthly}건/월
            </span>
          )}
          <span className="px-2 py-1 rounded-md text-xs font-semibold shrink-0" style={{ background: kindColor.bg, color: kindColor.text }}>
            {item.kind}
          </span>
          {wishlisted && (
            <span className="text-red-500 text-sm leading-none" title="찜">♥</span>
          )}
          {band.tag === "over" && band.overPct != null && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-100">
              예산 +{band.overPct.toFixed(0)}%
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="px-2 py-1 rounded-md text-xs font-semibold shrink-0" style={{ background: dday.bg, color: dday.text }}>
            {dday.label}
          </span>
          {item.fail_count > 0 && (
            <span className="px-2 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 shrink-0" title="입찰자가 없어서 유찰된 횟수 — 유찰될수록 최저가가 내려갑니다">
              유찰 {item.fail_count}회
            </span>
          )}
        </div>
      </div>
      
      <div className="mb-3 min-h-[40px]">
        <p className="font-medium text-slate-900 text-sm line-clamp-1">{item.address || item.bld_nm || item.display_no || "주소 없음"}</p>
        {item.bld_nm && item.address && <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{item.bld_nm}</p>}
      </div>
      
      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
        <span className="font-medium text-slate-700">{areaPyeong != null ? formatArea(item.area_m2!) : "-"}</span>
        <span className="text-gray-400 truncate max-w-[120px]">{item.court}</span>
      </div>
      
      <div className="mb-3">
        <div className="flex items-baseline justify-between gap-2 mb-1.5">
          <span className="text-sm text-gray-500" title="법원이 평가한 물건 가치 (시세와 다를 수 있음)">감정 {formatManwonShort(item.appraisal_price)}</span>
          <span className="text-lg font-bold tabular-nums text-red-600">{formatManwonShort(item.min_bid_price)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold tabular-nums" style={{ color: discountColor }}>
            {disc != null ? `${Number(disc) > 0 ? "-" : "+"}${Math.abs(Number(disc)).toFixed(0)}%` : "—"}
          </span>
          <span className="text-xs text-gray-400" title="할인율 비교 기준 — 시세(실거래), 감정가(법원평가) 등">기준 {refLabel}</span>
        </div>
      </div>
      
      <div className="pt-3 border-t border-gray-50 space-y-2">
        <p className="text-[12px] text-slate-600 leading-snug">
          <span className="font-semibold text-slate-800">왜 떴나 · </span>
          {reason}
        </p>
        {cash != null && (
          <p className="text-[11px] text-slate-500">
            필요 현금 대략 <span className="font-semibold text-slate-700">{formatManwonShort(cash)}</span>
            <span className="text-gray-400"> (대출 0 가정)</span>
          </p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">{item.display_no || item.case_no || ""}</span>
          {band.inBand && budgetManwon ? (
            <span className="text-[11px] text-slate-500">예산 창 안</span>
          ) : null}
        </div>
        <div className="flex gap-2 mt-2">
          <button
            onClick={(e) => { e.stopPropagation(); onClick?.(); }}
            className="flex-1 text-center text-xs font-semibold py-1.5 rounded-lg border border-gray-200 text-slate-700 hover:bg-gray-50 transition-colors"
          >
            상세보기
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); window.location.href = `/map?focus=${item.id}`; }}
            className="flex-1 text-center text-xs font-semibold py-1.5 rounded-lg border border-gray-200 text-slate-700 hover:bg-gray-50 transition-colors"
          >
            🗺️ 지도에서 보기
          </button>
        </div>
      </div>
    </article>
  );
};

function AuctionPageInner() {
  const searchParams = useSearchParams();
  const initialWishOnly = searchParams.get("tab") === "wish";

  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [sortType, setSortType] = useState<SortType>("recommend");
  const [detailLoading, setDetailLoading] = useState(false);
  const [items, setItems] = useState<AuctionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<AuctionItem | null>(null);
  const [mounted, setMounted] = useState(false);
  /** 투자 가능 금액 (억 단위 입력 UI) */
  const [budgetEok, setBudgetEok] = useState<string>("");
  const [hideHighRisk, setHideHighRisk] = useState(true);
  const [deltaPct, setDeltaPct] = useState(10); // 5 | 10 | 15
  const [showAllBudget, setShowAllBudget] = useState(false);
  const [onlyWishlist, setOnlyWishlist] = useState(initialWishOnly);
  const [wishlistTick, setWishlistTick] = useState(0);
  
  const abortRef = useRef<AbortController | null>(null);
  
  useEffect(() => {
    setMounted(true);
    try {
      const b = localStorage.getItem(LS_BUDGET_EOK);
      if (b != null) setBudgetEok(b);
      const h = localStorage.getItem(LS_HIDE_HIGH);
      if (h != null) setHideHighRisk(h === "1");
      const d = localStorage.getItem(LS_DELTA_PCT);
      if (d != null) {
        const n = Number(d);
        if (n === 5 || n === 10 || n === 15) setDeltaPct(n);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      if (budgetEok) localStorage.setItem(LS_BUDGET_EOK, budgetEok);
      else localStorage.removeItem(LS_BUDGET_EOK);
      localStorage.setItem(LS_HIDE_HIGH, hideHighRisk ? "1" : "0");
      localStorage.setItem(LS_DELTA_PCT, String(deltaPct));
    } catch { /* ignore */ }
  }, [budgetEok, hideHighRisk, deltaPct, mounted]);
  
  const loadData = useCallback(async (tab: TabType) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchAuctionData(tab);
      if (!abortRef.current.signal.aborted) {
        setItems(data);
      }
    } catch (err) {
      if (!abortRef.current.signal.aborted) {
        setError(err instanceof Error ? err.message : "데이터를 불러오는데 실패했습니다.");
      }
    } finally {
      if (!abortRef.current.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);
  
  useEffect(() => {
    loadData(activeTab);
    return () => { if (abortRef.current) abortRef.current.abort(); };
  }, [activeTab, loadData]);

  const budgetManwon = useMemo(() => {
    const n = parseFloat(budgetEok);
    if (!Number.isFinite(n) || n <= 0) return null;
    return eokToManwon(n);
  }, [budgetEok]);

  const delta = deltaPct / 100;
  
  const wishSet = useMemo(() => {
    void wishlistTick;
    return new Set(loadWishlistIds());
  }, [wishlistTick, mounted]);

  const filteredItems = useMemo(() => {
    let list = items;
    if (hideHighRisk) {
      list = list.filter((it) => !isHighRiskSignal(it.signal_level, it.signal));
    }
    if (budgetManwon && !showAllBudget) {
      list = filterByBudgetBand(list, budgetManwon, delta);
    }
    if (onlyWishlist) {
      list = list.filter((it) => wishSet.has(Number(it.id)));
    }
    return list;
  }, [items, hideHighRisk, budgetManwon, showAllBudget, delta, onlyWishlist, wishSet]);

  const sortedItems = useMemo(() => sortItems(filteredItems, sortType), [filteredItems, sortType]);
  
  const stats = useMemo(() => {
    if (sortedItems.length === 0) return { total: 0, avgDiscount: 0, avgMinBid: 0 };
    const total = sortedItems.length;
    const avgDiscount = sortedItems.reduce((sum, i) => {
      const d = i.discount_pct ?? i.discount_vs_market_pct ?? i.discount_vs_appraisal_pct ?? 0;
      return sum + Number(d);
    }, 0) / total;
    const avgMinBid = sortedItems.reduce((sum, i) => sum + i.min_bid_price, 0) / total;
    return { total, avgDiscount, avgMinBid };
  }, [sortedItems]);
  
  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      </div>
    );
  }
  
  const handleCardClick = async (item: AuctionItem) => {
    // 리스트 요약 모달 대신 gate 상세 우선 로드 (판정 스트립·플래그)
    setDetailLoading(true);
    try {
      const res = await fetch(`${GATE_URL}/auction/${item.id}`);
      if (res.ok) {
        const detail = await res.json();
        // AuctionPanel 호환 객체로 세션 스토리지에 넣고 지도 없이 패널 오픈은 페이지 내 상태
        setSelectedItem({ ...item, ...detail, _fullDetail: detail } as any);
      } else {
        setSelectedItem(item);
      }
    } catch {
      setSelectedItem(item);
    } finally {
      setDetailLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl" role="img" aria-label="scales">⚖️</span>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">비비옥션</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  예산 안에서 · 위험한 건 빼고 · 해도 되나 먼저
                  {" · "}
                  <a href="/map" className="text-indigo-600 hover:underline font-medium">지도에서 보기</a>
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {/* 내 예산 배지 */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: budgetManwon ? "#E7F6EE" : "#F3F4F6" }}>
                {budgetManwon ? (
                  <>
                    <span>💰 내 예산</span>
                    <span className="font-bold text-slate-900 tabular-nums">{budgetEok}억</span>
                  </>
                ) : (
                  <span className="text-gray-400">예산 미설정</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-lg">
                <span className="text-gray-500">추천</span>
                <span className="font-bold text-slate-900 tabular-nums">{formatNumber(stats.total)}</span>
                <span className="text-gray-500">건</span>
              </div>
              {budgetManwon && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 rounded-lg text-indigo-800">
                  <span>예산 {budgetEok}억 ±{deltaPct}%</span>
                  <span className="text-indigo-500 text-xs">
                    ({formatManwonShort(budgetManwon * (1 - delta))}~{formatManwonShort(budgetManwon * (1 + delta))})
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 예산 · 필터 (메인 루프) */}
          <div className="pb-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-end gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex-1 min-w-[140px]">
                <label htmlFor="budget-eok" className="block text-xs font-semibold text-slate-600 mb-1">
                  투자 가능 금액 (억)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="budget-eok"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={0.1}
                    placeholder="예: 3"
                    value={budgetEok}
                    onChange={(e) => setBudgetEok(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-base font-semibold tabular-nums focus:ring-2 focus:ring-slate-500 outline-none"
                  />
                  <span className="text-sm text-gray-500 shrink-0">억</span>
                </div>
              </div>
              <div>
                <label htmlFor="delta-pct" className="block text-xs font-semibold text-slate-600 mb-1">여유 ±</label>
                <select
                  id="delta-pct"
                  value={deltaPct}
                  onChange={(e) => setDeltaPct(Number(e.target.value))}
                  className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white"
                >
                  <option value={5}>5%</option>
                  <option value={10}>10%</option>
                  <option value={15}>15%</option>
                </select>
              </div>
              <label className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hideHighRisk}
                  onChange={(e) => setHideHighRisk(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span>위험 물건 숨김 (초보 추천)</span>
              </label>
              {budgetManwon && (
                <label className="flex items-center gap-2 px-3 py-2.5 text-sm cursor-pointer select-none text-gray-600">
                  <input
                    type="checkbox"
                    checked={showAllBudget}
                    onChange={(e) => setShowAllBudget(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span>예산 밖도 보기</span>
                </label>
              )}
              <label className="flex items-center gap-2 px-3 py-2.5 text-sm cursor-pointer select-none text-gray-600">
                <input
                  type="checkbox"
                  checked={onlyWishlist}
                  onChange={(e) => setOnlyWishlist(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span>관심 등록한 것만 ({wishSet.size})</span>
              </label>
            </div>
            {!budgetManwon && (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                예산을 넣으면 그 안에서(±{deltaPct}%)만 추천합니다. 예산 밖 ‘대박 할인’은 기본으로 안 띄웁니다.
              </p>
            )}
          </div>
          
          {/* Tabs */}
          <div className="pb-4 border-b border-gray-100">
            <div className="flex flex-wrap gap-2" role="tablist">
              {(["all", "short-trade", "rental"] as TabType[]).map((tab) => (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={activeTab === tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 ${
                    activeTab === tab
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {TAB_LABELS[tab]}
                </button>
              ))}
            </div>
          </div>
          
          {/* Sort & Controls */}
          <div className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <label htmlFor="sort-select" className="text-sm text-gray-500 whitespace-nowrap">정렬</label>
              <select
                id="sort-select"
                value={sortType}
                onChange={(e) => setSortType(e.target.value as SortType)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none min-w-[180px]"
              >
                {SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <p className="text-sm text-gray-500">
              표시 {sortedItems.length}건 / 전체 {items.length}건
            </p>
          </div>
        </div>
      </header>
      
      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
            <span>{error}</span>
            <button onClick={() => loadData(activeTab)} className="ml-auto px-3 py-1 text-sm font-medium bg-red-100 rounded-lg hover:bg-red-200 transition-colors">재시도</button>
          </div>
        )}
        
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : sortedItems.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="text-4xl mb-3">📭</div>
            <h3 className="mt-2 text-lg font-medium text-slate-900">
              {budgetManwon
                ? `예산 ${budgetEok}억(±${deltaPct}%) 안에서는 지금 후보가 없어요`
                : "표시할 물건이 없습니다"}
            </h3>
            <p className="mt-2 text-gray-500 text-sm max-w-md mx-auto">
              {budgetManwon
                ? "예산을 조금 올리거나, ± 폭을 넓히거나, 위험 숨김을 끄거나, 「예산 밖도 보기」를 켜 보세요."
                : "다른 탭을 선택하거나 나중에 다시 시도해 보세요."}
            </p>
            {budgetManwon && !showAllBudget && (
              <button
                type="button"
                onClick={() => setShowAllBudget(true)}
                className="mt-4 px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg"
              >
                예산 밖 물건도 보기
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedItems.map((item) => (
              <AuctionCard
                key={item.id}
                item={item}
                tab={activeTab}
                budgetManwon={budgetManwon}
                delta={delta}
                wishlisted={wishSet.has(Number(item.id))}
                onClick={() => handleCardClick(item)}
              />
            ))}
          </div>
        )}
        
        {!loading && sortedItems.length > 0 && (
          <div className="mt-8 text-center text-sm text-gray-500">
            총 <span className="font-bold text-slate-900">{formatNumber(sortedItems.length)}</span>건 표시 중
          </div>
        )}
      </main>
      
      {/* 상세: gate 풀 상세면 AuctionPanel, 아니면 요약 모달 */}
      {selectedItem && (selectedItem as any)._fullDetail ? (
        <AuctionPanel
          detail={(selectedItem as any)._fullDetail as AuctionDetail}
          onClose={() => {
            setSelectedItem(null);
            setWishlistTick((t) => t + 1);
          }}
          budgetManwon={budgetManwon}
          budgetDelta={delta}
        />
      ) : (
        <DetailModal item={selectedItem} onClose={() => setSelectedItem(null)} tab={activeTab} />
      )}
      {detailLoading && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 pointer-events-none">
          <div className="bg-white rounded-xl px-4 py-3 text-sm shadow-lg">상세 불러오는 중…</div>
        </div>
      )}
    </div>
  );
}

export default function AuctionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-gray-400">
        로딩 중…
      </div>
    }>
      <AuctionPageInner />
    </Suspense>
  );
}