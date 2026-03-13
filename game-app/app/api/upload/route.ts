import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { v4 as uuidv4 } from "uuid";

export const POST = async (request: NextRequest) => {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Supabase Admin is not configured." },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Không tìm thấy file ảnh." },
        { status: 400 }
      );
    }

    // Validate type cơ bản
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File upload phải là hình ảnh (jpg, png...)." },
        { status: 400 }
      );
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `public/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from("question_images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError || !uploadData) {
      throw uploadError || new Error("Upload failed without error message");
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("question_images")
      .getPublicUrl(filePath);

    return NextResponse.json(
      { url: publicUrlData.publicUrl },
      { status: 201 }
    );
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Lỗi tải ảnh lên server." },
      { status: 500 }
    );
  }
};
