import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

interface IncomingMember {
  fullName: string;
  title?: string;
}

interface AssignedMember extends IncomingMember {
  teamNumber: number;
  positionInTeam: number;
}

const TEAM_COUNT = 4;

const shuffleInPlace = <T,>(items: T[]): void => {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
};

export const POST = async (request: NextRequest) => {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Supabase chưa được cấu hình trên server." },
      { status: 500 }
    );
  }

  const body = (await request.json()) as { members?: IncomingMember[] };

  if (!body.members || !Array.isArray(body.members) || body.members.length < TEAM_COUNT) {
    return NextResponse.json(
      { error: "Danh sách nhân sự không hợp lệ hoặc ít hơn 4 người." },
      { status: 400 }
    );
  }

  const members: IncomingMember[] = body.members.filter(
    (member) => member.fullName && member.fullName.trim().length > 0
  );

  if (members.length < TEAM_COUNT) {
    return NextResponse.json(
      { error: "Cần tối thiểu 4 nhân sự để chia đều cho 4 đội." },
      { status: 400 }
    );
  }

  const shuffled: AssignedMember[] = members.map((member) => ({
    ...member,
    teamNumber: 0,
    positionInTeam: 0,
  }));

  shuffleInPlace(shuffled);

  const baseSize = Math.floor(shuffled.length / TEAM_COUNT);
  const remainder = shuffled.length % TEAM_COUNT;

  let index = 0;
  const teams: Record<number, AssignedMember[]> = {};

  for (let team = 1; team <= TEAM_COUNT; team += 1) {
    const teamSize = baseSize + (team <= remainder ? 1 : 0);
    teams[team] = [];

    for (let i = 0; i < teamSize; i += 1) {
      const member = shuffled[index];
      const assigned: AssignedMember = {
        ...member,
        teamNumber: team,
        positionInTeam: i + 1,
      };
      teams[team].push(assigned);
      index += 1;
    }
  }

  const flatAssignments = Object.values(teams).flat();

  const { data: setup, error: insertSetupError } = await supabaseAdmin
    .from("team_setups")
    .insert({
      total_members: flatAssignments.length,
    })
    .select()
    .single();

  if (insertSetupError || !setup) {
    return NextResponse.json(
      { error: "Không thể lưu thông tin chia đội.", details: insertSetupError?.message },
      { status: 500 }
    );
  }

  const { error: insertMembersError } = await supabaseAdmin
    .from("team_setup_members")
    .insert(
      flatAssignments.map((member) => ({
        setup_id: setup.id,
        full_name: member.fullName,
        title: member.title ?? null,
        team_number: member.teamNumber,
        position_in_team: member.positionInTeam,
      }))
    );

  if (insertMembersError) {
    return NextResponse.json(
      { error: "Không thể lưu danh sách thành viên đã chia.", details: insertMembersError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    setupId: setup.id,
    teams,
  });
};

