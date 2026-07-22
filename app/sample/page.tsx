import Link from "next/link"
import { Metadata } from "next"
import ValidationRubricCard from "@/components/reports/ValidationRubricCard"
import { REPORT_VALIDATION_SAMPLES } from "@/lib/reportValidationSamples"
import { getValidationRubric } from "@/lib/reportValidationRubric"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "샘플 분석 — 오를지AI",
  description: "오를지AI가 실제로 어떤 분석을 해주는지 직접 확인해보세요. 로그인 없이 무료로 볼 수 있습니다.",
}

const GATE_URL = process.env.NEXT_PUBLIC_GATE_URL || "https://orulzi-gate.fly.dev"
const SAMPLE_IDS = [3308, 2772, 14108, 22775, 14]

type SampleApt = {
  apt_id: number
  apt_nm: string
  sigungu?: string
  umd_nm?: string
  oreulji_score: number
  final_score?: number
  build_year?: number | null
  is_presale?: boolean
}

async function fetchSample(aptId: number): Promise<SampleApt | null> {
  try {
    const res = await fetch(`${GATE_URL}/apt/${aptId}?horizon=24`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

function sampleDesc(sample: SampleApt) {
  if (sample.is_presale) return "분양/입주 예정 샘플"
  if (sample.build_year) return `${sample.build_year}년 준공 · 실거래 기반 샘플`
  return "실거래 기반 샘플"
}

export default async function SamplePage() {
  const samples = (await Promise.all(SAMPLE_IDS.map(fetchSample))).filter((sample): sample is SampleApt => sample !== null)

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6F9", fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif", padding: "32px 16px 64px" }}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>

        {/* 헤더 */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src="/logo.png" alt="오를지AI" style={{ height: 32, objectFit: "contain", marginBottom: 16 }} />
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#111827", marginBottom: 8 }}>
            샘플 분석 미리보기
          </h1>
          <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.7, margin: 0 }}>
            로그인 없이 무료로 볼 수 있습니다.<br />
            오를지AI가 어떤 분석을 해주는지 직접 확인해보세요.
          </p>
        </div>

        {/* 샘플 카드 목록 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
          {samples.map(sample => {
            const score = sample.final_score ?? sample.oreulji_score ?? 0
            const region = [sample.sigungu, sample.umd_nm].filter(Boolean).join(" · ") || "위치 정보 확인 중"

            return (
              <Link
                key={sample.apt_id}
                href={`/share/${sample.apt_id}`}
                style={{ textDecoration: "none" }}
              >
                <div style={{
                  background: "#fff", borderRadius: 16, padding: "18px 20px",
                  border: "1px solid #E5E7EB", display: "flex", alignItems: "center",
                  justifyContent: "space-between", gap: 12,
                  transition: "box-shadow 0.15s",
                }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#111827", marginBottom: 3 }}>{sample.apt_nm}</div>
                    <div style={{ fontSize: 12, color: "#9CA3AF" }}>{region} · {sampleDesc(sample)} · {score}점</div>
                  </div>
                  <div style={{ fontSize: 22, flexShrink: 0 }}>→</div>
                </div>
              </Link>
            )
          })}
        </div>

        {/* 기능 설명 */}
        <div style={{ background: "#fff", borderRadius: 16, padding: "20px 22px", border: "1px solid #E5E7EB", marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 14 }}>분석에 포함된 항목</div>
          {[
            { icon: "🎯", text: "결론 한 줄 — 지금 사도 되는지 바로 알려드립니다" },
            { icon: "📋", text: "핵심 이유 3가지 — 왜 그 결론인지 근거를 보여드립니다" },
            { icon: "📊", text: "전세가율, 거래 환경, 시세 흐름 분석" },
            { icon: "🤖", text: "24개월 참고 신호 — 지역 흐름과 단지 특성을 함께 봅니다" },
            { icon: "💬", text: "가족에게 카톡으로 바로 공유 가능" },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10, fontSize: 13, color: "#374151" }}>
              <span style={{ flexShrink: 0, fontSize: 16 }}>{icon}</span>
              <span style={{ lineHeight: 1.5 }}>{text}</span>
            </div>
          ))}
        </div>

        <div style={{ background: "#fff", borderRadius: 16, padding: "20px 22px", border: "1px solid #E5E7EB", marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 14 }}>검수용 페르소나 샘플</div>
          <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.6, marginBottom: 12 }}>
            이번 검수는 문장 톤보다도, 각 페르소나가 실제로 의사결정에 쓸 숫자를 충분히 받는지 확인하는 용도입니다.
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {REPORT_VALIDATION_SAMPLES.map((sample) => (
              <div key={sample.id} style={{ display: "grid", gap: 10 }}>
                <Link href={sample.href} style={{ textDecoration: "none" }}>
                  <div style={{ border: "1px solid #E5E7EB", borderRadius: 12, padding: "14px 16px", background: "#F9FAFB" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 6 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>{sample.title}</div>
                      <span style={{ fontSize: 10, fontWeight: 800, color: "#3730A3", background: "#EEF2FF", borderRadius: 9999, padding: "2px 8px", whiteSpace: "nowrap" }}>{sample.label}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.6 }}>{sample.description}</div>
                  </div>
                </Link>
                <ValidationRubricCard rubric={getValidationRubric(sample.id as "first-home" | "agent" | "investor")} />
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Link href="/map" style={{
            display: "block", padding: "16px", borderRadius: 14, textAlign: "center",
            background: "#16A34A", color: "#fff", fontSize: 15, fontWeight: 700, textDecoration: "none",
          }}>
            내가 보는 아파트 직접 분석하기 →
          </Link>
          <Link href="/login" style={{
            display: "block", padding: "14px", borderRadius: 14, textAlign: "center",
            background: "#fff", color: "#374151", fontSize: 14, fontWeight: 600, textDecoration: "none",
            border: "1px solid #E5E7EB",
          }}>
            로그인하고 더 자세히 보기
          </Link>
        </div>
      </div>
    </div>
  )
}
