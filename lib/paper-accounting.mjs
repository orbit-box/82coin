/**
 * Cash and collateral accounting for the future simulated futures engine.
 * Pure functions only: they never execute real or simulated trades.
 */
export const money=(value:number)=>Math.round((value+Number.EPSILON)*10000)/10000;
function finite(n:number){if(!Number.isFinite(n))throw Error("유효하지 않은 금액입니다.");return n;}
export function reserveMargin(freeCash:number,margin:number,openingFee:number){
 finite(freeCash);finite(margin);finite(openingFee);
 if(freeCash<0||margin<=0||openingFee<0||margin+openingFee>freeCash)throw Error("증거금 또는 수수료가 부족합니다.");
 return {freeCashAfter:money(freeCash-margin-openingFee),lockedMargin:money(margin),openingFee:money(openingFee)};
}
export function settleIsolatedPosition(freeCash:number,lockedMargin:number,grossPnl:number,closingFee:number){
 [freeCash,lockedMargin,grossPnl,closingFee].forEach(finite);
 if(freeCash<0||lockedMargin<=0||closingFee<0)throw Error("정산 금액이 올바르지 않습니다.");
 // An isolated virtual position cannot incur a debit beyond its posted collateral.
 const grossSettlement=lockedMargin+grossPnl-closingFee;
 const returnedCollateral=money(Math.max(0,grossSettlement));
 const liquidationLoss=money(Math.max(0,-grossSettlement));
 return {freeCashAfter:money(freeCash+returnedCollateral),returnedCollateral,liquidationLoss,realizedPnl:money(returnedCollateral-lockedMargin)};
}
export function seasonEquity(freeCash:number,lockedMargins:number,unrealizedPnl:number){
 [freeCash,lockedMargins,unrealizedPnl].forEach(finite);
 if(freeCash<0||lockedMargins<0)throw Error("계좌 잔고가 올바르지 않습니다.");
 return money(freeCash+Math.max(0,lockedMargins+unrealizedPnl));
}
