export function previousDay(day:string):string;
export function streakBefore(days:Iterable<string>,today:string):number;
export function attendanceState(days:Iterable<string>,today:string):{attended:boolean;streak:number;completed:number;nextStep:number|null;lastStep:number|null;nextReward:number;daysUntilSeven:number;cycle:{step:number;reward:number;complete:boolean;current:boolean}[]};
export function awardForStreak(streak:number):{step:number;amount:number;coupons:number;sevenCoupon:boolean;thirtyCoupon:boolean;badge:boolean};
export function kstDate(date:Date):string;
