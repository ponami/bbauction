"use client"

import { useState, useEffect } from "react"

export function DynamicPeriod() {
  const [periodText, setPeriodText] = useState("2006년 ~ 현재")

  useEffect(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const date = now.getDate()
    setPeriodText(`2006년 ~ 현재\n(${year}년 ${month}월 ${date}일)`)
  }, [])

  return <span style={{ whiteSpace: "pre-line" }}>{periodText}</span>
}
