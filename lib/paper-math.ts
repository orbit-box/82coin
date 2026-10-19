/**
 * Pure, deterministic linear USDT perpetual paper-fill arithmetic.
 * This is not an execution engine: mark-price freshness, funding, liquidation,
 * per-member risk and atomic persistence must be verified before accepting orders.
 */
export type Side="LONG"|"SHORT";
export type PaperFill={
 side:Side;quantity:number;entryUsdt:number;exitUsdt:number;usdKrw:number;
 openingNotionalKrw:number;closingNotionalKrw:number;
 grossPnlKrw:number;openingFeeKrw:number;closingFeeKrw:number;fundingKrw:number;
 netPnlKrw:number;
};
export const PAPER_TAKER_FEE_RATE=0.0005;
export const PAPER_MAX_LEVERAGE=20;
export const PAPER_MAX_MARGIN_FRACTION=0.25;
const assertPositive=(value:number,label:string)=>{
 if(!Number.isFinite(value)||value<=0)throw Error(label+" must be positive and finite");
};
const amount=(v:number)=>Math.round((v+Number.EPSILON)*10000)/10000;
export function paperQuantity(marginKrw:number,leverage:number,priceUsdt:number,usdKrw:number){
 for(const [v,k] of [[marginKrw,"margin"],[priceUsdt,"price"],[usdKrw,"fx"]] as const)assertPositive(v,k);
 if(!Number.isInteger(leverage)||leverage<1||leverage>PAPER_MAX_LEVERAGE)throw Error("invalid leverage");
 return marginKrw*leverage/(priceUsdt*usdKrw);
}
export function paperUnrealized(side:Side,quantity:number,entryUsdt:number,markUsdt:number,usdKrw:number){
 if(side!=="LONG"&&side!=="SHORT")throw Error("invalid side");
 for(const [v,k] of [[quantity,"quantity"],[entryUsdt,"entry"],[markUsdt,"mark"],[usdKrw,"fx"]] as const)assertPositive(v,k);
 return amount(quantity*(markUsdt-entryUsdt)*usdKrw*(side==="LONG"?1:-1));
}
export function paperFill(args:{side:Side;quantity:number;entryUsdt:number;exitUsdt:number;usdKrw:number;fundingKrw?:number;feeRate?:number}):PaperFill{
 const {side,quantity,entryUsdt,exitUsdt,usdKrw}=args;
 for(const [v,k] of [[quantity,"quantity"],[entryUsdt,"entry"],[exitUsdt,"exit"],[usdKrw,"fx"]] as const)assertPositive(v,k);
 const feeRate=args.feeRate??PAPER_TAKER_FEE_RATE;
 if(!Number.isFinite(feeRate)||feeRate<0||feeRate>0.01)throw Error("invalid fee");
 const funding=args.fundingKrw??0;if(!Number.isFinite(funding))throw Error("invalid funding");
 const openingNotionalKrw=amount(quantity*entryUsdt*usdKrw);
 const closingNotionalKrw=amount(quantity*exitUsdt*usdKrw);
 const grossPnlKrw=paperUnrealized(side,quantity,entryUsdt,exitUsdt,usdKrw);
 const openingFeeKrw=amount(openingNotionalKrw*feeRate);
 const closingFeeKrw=amount(closingNotionalKrw*feeRate);
 return {side,quantity,entryUsdt,exitUsdt,usdKrw,openingNotionalKrw,closingNotionalKrw,
 grossPnlKrw,openingFeeKrw,closingFeeKrw,fundingKrw:amount(funding),
 netPnlKrw:amount(grossPnlKrw-openingFeeKrw-closingFeeKrw-funding)};
}
export function adjustedSeasonPnl(equityKrw:number,startEquityKrw:number,resetInjectionsKrw:number){
 if(![equityKrw,startEquityKrw,resetInjectionsKrw].every(Number.isFinite)||startEquityKrw<=0||resetInjectionsKrw<0)throw Error("invalid accounting");
 return amount(equityKrw-startEquityKrw-resetInjectionsKrw);
}
export function adjustedSeasonRoi(equityKrw:number,startEquityKrw:number,resetInjectionsKrw:number){
 return amount(adjustedSeasonPnl(equityKrw,startEquityKrw,resetInjectionsKrw)/startEquityKrw*100);
}
