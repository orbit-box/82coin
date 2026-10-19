"use server";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {claimAttendance} from "@/lib/rewards";
export async function attendanceAction(){try{await claimAttendance()}catch(e){const message=e instanceof Error?e.message:"출석 처리 실패";redirect("/benefits?status="+encodeURIComponent(message))}revalidatePath("/benefits");redirect("/benefits?status="+encodeURIComponent("출석 완료! 82토큰 10개가 지급되었습니다."))}
