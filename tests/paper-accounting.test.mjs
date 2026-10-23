import test from "node:test";
import assert from "node:assert/strict";
import {reserveMargin,settleIsolatedPosition,seasonEquity} from "../lib/paper-accounting.mjs";
test("margin and fee reserve exactly once",()=>{assert.deepEqual(reserveMargin(1_000_000,200_000,500),{freeCashAfter:799500,lockedMargin:200000,openingFee:500});});
test("settlement returns collateral plus net profit",()=>{assert.equal(settleIsolatedPosition(799500,200000,25000,250).freeCashAfter,1024250)});
test("isolated downside cannot create negative cash",()=>{assert.equal(settleIsolatedPosition(0,200000,-500000,100).freeCashAfter,0)});
test("equity counts locked margin during open trade",()=>{assert.equal(seasonEquity(799500,200000,1500),1001000)});
test("invalid amounts rejected",()=>{assert.throws(()=>reserveMargin(10000,11000,1));assert.throws(()=>settleIsolatedPosition(0,0,0,1));});
