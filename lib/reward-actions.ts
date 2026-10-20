"use server";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {claimAttendance} from "@/lib/rewards";
export async function attendanceAction(){
 let msg="",stamped=false;
 try{const r=await claimAttendance();stamped=!r.already;msg=r.already?"오늘은 이미 출석체크를 완료했습니다.":`출석 완료! +${r.amount}T 지급${r.coupons?" · 룰렛 쿠폰 "+r.coupons+"장 획득":""}`;}
 catch(e){msg=e instanceof Error?e.message:"출석 처리에 실패했습니다."}
 revalidatePath("/benefits/attendance");revalidatePath("/benefits");revalidatePath("/benefits/wallet");revalidatePath("/profile");
 redirect("/benefits/attendance?status="+encodeURIComponent(msg)+(stamped?"&stamp=1":""))
}
