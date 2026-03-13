import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const GET = async () => {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Supabase Admin is not configured." },
      { status: 500 }
    );
  }

  try {
    const { data: questions, error } = await supabaseAdmin
      .from("questions")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json(questions);
  } catch {
    return NextResponse.json(
      { error: "Không thể lấy danh sách câu hỏi." },
      { status: 500 }
    );
  }
};

export const POST = async (request: NextRequest) => {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Supabase Admin is not configured." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { answer, image_url } = body;

    if (!answer || !image_url) {
      return NextResponse.json(
        { error: "Thiếu dữ liệu answer hoặc image_url." },
        { status: 400 }
      );
    }

    // Chuẩn hóa đáp án: chữ hoa, không dấu (ở đây Next.js xử lý Uppercase, bỏ dấu có thể dùng regex cơ bản)
    const normalizedAnswer = (() => {
      let str = answer.toUpperCase().trim();
      str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
      str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
      str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
      str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
      str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
      str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
      str = str.replace(/Đ/g, "D");
      // Loại bỏ kí tự đặc biệt nếu cần, nhưng tạm thời cứ giữ lại các ký tự được phép
      return str;
    })();

    const { data: newQuestion, error } = await supabaseAdmin
      .from("questions")
      .insert({
        answer: normalizedAnswer,
        image_url: image_url,
        is_used: false,
      })
      .select()
      .single();

    if (error) {
      // Bắt lỗi trùng lặp (nếu sau này có RLS)
      throw error;
    }

    return NextResponse.json(newQuestion, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Lỗi khi tạo câu hỏi mới." },
      { status: 500 }
    );
  }
};
