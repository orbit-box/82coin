"use server";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {claimAttendance} from "@/lib/rewards";
export async function attendanceAction(){
 let msg="";
 try{const r=await claimAttendance();msg=r.already?"오늘은 이미 출석체크를 완료했습니다.":"출석 완료! 82토큰 10개가 지급되었습니다."}
 catch(e){msg=e instanceof Error?e.message:"출석 처리에 실패했습니다."}
 revalidatePath("/benefits");redirect("/benefits?status="+encodeURIComponent(msg))
}
