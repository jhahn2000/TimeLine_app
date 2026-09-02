import assert from "node:assert/strict";
import test,{after} from "node:test";
import {createServer} from "vite";
import {fileURLToPath} from "node:url";

const root=fileURLToPath(new URL("..",import.meta.url));
const vite=await createServer({appType:"custom",configFile:false,root,server:{middlewareMode:true}});
after(async()=>vite.close());
const {parseTimeline,koreanTransport}=await vite.ssrLoadModule("/lib/timeline.ts");

test("새 형식의 방문·이동 기록을 모두 읽는다",()=>{
  const records=parseTimeline({semanticSegments:[
    {startTime:"2026-08-20T09:00:00+09:00",endTime:"2026-08-20T10:00:00+09:00",visit:{topCandidate:{placeID:"p1",placeLocation:"geo:35.981,126.716",semanticType:"UNKNOWN"}}},
    {startTime:"2026-08-20T10:00:00+09:00",endTime:"2026-08-20T10:10:00+09:00",activity:{topCandidate:{type:"IN_PASSENGER_VEHICLE"},distanceMeters:5200,start:"geo:35.981,126.716",end:"geo:35.950,126.700"}}
  ]});
  assert.equal(records.length,2);assert.equal(records[0].title,"장소명 입력 필요");assert.equal(records[0].startLat,"35.981");assert.equal(records[1].transportType,"자동차");assert.equal(records[1].distanceMeters,5200);assert.equal(records[1].endLng,"126.700");
});

test("기존 타임라인 형식도 계속 읽는다",()=>{
  const records=parseTimeline({timelineObjects:[{activitySegment:{activityType:"WALKING",distance:800,startLocation:{latitudeE7:359810000,longitudeE7:1267160000},endLocation:{latitudeE7:359820000,longitudeE7:1267170000},duration:{startTimestamp:"2026-08-20T11:00:00+09:00",endTimestamp:"2026-08-20T11:12:00+09:00"}}}]});
  assert.equal(records[0].transportType,"도보");assert.equal(records[0].distanceMeters,800);assert.equal(records[0].startLat,"35.981");
});

test("알 수 없는 이동수단은 원래 글자를 보존한다",()=>assert.equal(koreanTransport("FLYING_TAXI"),"FLYING_TAXI"));
