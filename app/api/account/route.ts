import { NextRequest, NextResponse } from "next/server"
import { AccountDeletionError, deleteCurrentUserAccount } from "@/lib/accountDeletion"

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => ({}))

  if (body?.confirmText !== "삭제") {
    return NextResponse.json(
      { success: false, error: "확인 문구를 정확히 입력해주세요" },
      { status: 400 },
    )
  }

  try {
    const result = await deleteCurrentUserAccount(new URL(req.url).origin)
    return NextResponse.json({ success: true, email: result.email })
  } catch (error) {
    if (error instanceof AccountDeletionError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status },
      )
    }

    console.error("[account/delete]", error)
    return NextResponse.json(
      { success: false, error: "계정 삭제 중 오류가 발생했습니다" },
      { status: 500 },
    )
  }
}
