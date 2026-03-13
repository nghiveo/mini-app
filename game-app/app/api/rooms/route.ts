import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

const generateRoomCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const POST = async () => {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Supabase Admin is not configured." },
      { status: 500 }
    );
  }

  try {
    // Thử tạo mã phòng tối đa 5 lần nếu bị trùng
    let roomCode = "";
    let isCreated = false;
    let newRoom = null;

    for (let i = 0; i < 5; i++) {
      roomCode = generateRoomCode();
      const { data, error } = await supabaseAdmin
        .from("rooms")
        .insert({
          room_code: roomCode,
          admin_name: "Admin",
          duration: 60,
          question_count: 18,
          status: "waiting",
        })
        .select()
        .single();
      
      if (!error && data) {
        newRoom = data;
        isCreated = true;
        break;
      }
    }

    if (!isCreated) {
      throw new Error("Không thể tạo mã phòng sau nhiều lần thử.");
    }

    return NextResponse.json(newRoom, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Lỗi tạo phòng." },
      { status: 500 }
    );
  }
};

export const GET = async (request: NextRequest) => {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Supabase Admin is not configured." },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Missing room code" }, { status: 400 });
  }

  try {
    const { data: room, error } = await supabaseAdmin
      .from("rooms")
      .select("*")
      .eq("room_code", code)
      .single();

    if (error || !room) {
      return NextResponse.json(
        { error: "Phòng không tồn tại hoặc đã bị đóng." },
        { status: 404 }
      );
    }

    return NextResponse.json(room);
  } catch {
    return NextResponse.json(
      { error: "Lỗi tìm kiếm phòng." },
      { status: 500 }
    );
  }
};
