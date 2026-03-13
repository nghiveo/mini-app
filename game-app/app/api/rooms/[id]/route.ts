import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const PUT = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Supabase Admin is not configured." },
      { status: 500 }
    );
  }

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing room ID" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { admin_name, duration, question_count, status } = body;

    const updates: Record<string, unknown> = {};
    if (admin_name !== undefined) updates.admin_name = admin_name;
    if (duration !== undefined) updates.duration = duration;
    if (question_count !== undefined) updates.question_count = question_count;
    if (status !== undefined) updates.status = status;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "Nothing to update" },
        { status: 400 }
      );
    }

    const { data: updatedRoom, error } = await supabaseAdmin
      .from("rooms")
      .update(updates)
      .eq("room_code", id) // API query bằng room_code thay vì BigInt ID để bảo mật frontend
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(updatedRoom);
  } catch {
    return NextResponse.json(
      { error: "Lỗi cập nhật cấu hình phòng." },
      { status: 500 }
    );
  }
};
