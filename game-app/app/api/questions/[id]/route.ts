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
    return NextResponse.json({ error: "Missing ID" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { answer, image_url, is_used } = body;

    const updates: Record<string, unknown> = {};
    if (answer !== undefined) {
      let str = answer.toUpperCase().trim();
      str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
      str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
      str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
      str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
      str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
      str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
      str = str.replace(/Đ/g, "D");
      updates.answer = str;
    }
    if (image_url !== undefined) updates.image_url = image_url;
    if (is_used !== undefined) updates.is_used = is_used;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "Nothing to update" },
        { status: 400 }
      );
    }

    const { data: updatedQuestion, error } = await supabaseAdmin
      .from("questions")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(updatedQuestion);
  } catch {
    return NextResponse.json(
      { error: "Lỗi cập nhật câu hỏi." },
      { status: 500 }
    );
  }
};

export const DELETE = async (
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
    return NextResponse.json({ error: "Missing ID" }, { status: 400 });
  }

  try {
    const { error } = await supabaseAdmin
      .from("questions")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Lỗi xóa câu hỏi." },
      { status: 500 }
    );
  }
};
