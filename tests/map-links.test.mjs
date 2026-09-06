import assert from "node:assert/strict";
import test,{after} from "node:test";
import {createServer} from "vite";
import {fileURLToPath} from "node:url";

const root=fileURLToPath(new URL("..",import.meta.url));
const vite=await createServer({appType:"custom",configFile:false,root,server:{middlewareMode:true}});
after(async()=>vite.close());
const {googlePlaceUrl,naverAppUrl,naverWebUrl,resolvedMapPlaceName}=await vite.ssrLoadModule("/lib/map-links.ts");

test("확정된 title을 좌표 형태의 startPlace보다 우선한다",()=>assert.equal(resolvedMapPlaceName({title:"호텔 로씨오",startPlace:"geo:36.969646,126.781488"}),"호텔 로씨오"));
test("좌표밖에 없으면 장소명을 미등록으로 표시한다",()=>assert.equal(resolvedMapPlaceName({title:"36.969646, 126.781488",startPlace:"geo:36.969646,126.781488"}),"장소명 미등록"));
test("네이버 앱 스킴에 한글 출발지와 도착지를 안전하게 넣는다",()=>{const url=naverAppUrl([{lat:36.969646,lng:126.781488,name:"호텔 로씨오"},{lat:37.079783,lng:127.052891,name:"관광지 & 카페"}],"http://127.0.0.1:5174");const params=new URL(url).searchParams;assert.equal(params.get("sname"),"호텔 로씨오");assert.equal(params.get("dname"),"관광지 & 카페");assert.equal(params.get("slat"),"36.969646")});
test("네이버 웹 링크도 장소명을 쓰며 좌표를 이름으로 쓰지 않는다",()=>{const url=decodeURIComponent(naverWebUrl([{lat:36.9,lng:126.7,name:"호텔 로씨오"},{lat:37.1,lng:127.1,name:"장소명 미등록"}]));assert.match(url,/호텔 로씨오/);assert.match(url,/장소명 미등록/)});
test("구글 위치 링크에 확정 이름과 좌표를 함께 넣는다",()=>{const url=new URL(googlePlaceUrl({lat:36.969646,lng:126.781488,name:"호텔 로씨오"}));assert.equal(url.searchParams.get("query"),"호텔 로씨오 36.969646,126.781488")});
