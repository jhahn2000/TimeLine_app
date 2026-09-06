import assert from "node:assert/strict";
import test,{after} from "node:test";
import {createServer} from "vite";
import {fileURLToPath} from "node:url";

const root=fileURLToPath(new URL("..",import.meta.url));
const vite=await createServer({appType:"custom",configFile:false,root,server:{middlewareMode:true}});
after(async()=>vite.close());
const {choosePlaceName,distanceMeters,isCoordinateName,matchSavedPlace}=await vite.ssrLoadModule("/lib/places.ts");

test("기본 15m 반경 안의 가장 가까운 확정 장소를 찾는다",()=>{const places=[{id:1,name:"카페",address:"서울 A",lat:37.5,lng:127,radiusMeters:15},{id:2,name:"식당",address:"서울 B",lat:37.5002,lng:127,radiusMeters:15}],found=matchSavedPlace(37.50001,127,places);assert.equal(found.match.name,"카페");assert.ok(found.match.distanceMeters<2)});
test("30m라도 장소별 반경 밖이면 자동 적용하지 않는다",()=>{const found=matchSavedPlace(37.5,127,[{id:1,name:"카페",address:"",lat:37.5002,lng:127,radiusMeters:15}]);assert.equal(found.match,null);assert.equal(found.candidates.length,0)});
test("바로 옆 두 후보의 거리가 비슷하면 임의로 선택하지 않는다",()=>{const places=[{id:1,name:"식당",address:"",lat:37.5,lng:126.99996,radiusMeters:15},{id:2,name:"카페",address:"",lat:37.5,lng:127.00004,radiusMeters:15}],found=matchSavedPlace(37.5,127,places);assert.equal(found.match,null);assert.equal(found.ambiguous,true);assert.deepEqual(found.candidates.map(p=>p.name),["식당","카페"])});
test("좌표 문자열은 장소명으로 인정하지 않는다",()=>{assert.equal(isCoordinateName("37.5, 127.0"),true);assert.equal(isCoordinateName("geo:37.5,127.0"),true);assert.equal(isCoordinateName("위치 37.5, 127.0"),true);assert.equal(isCoordinateName("한일옥"),false)});
test("거리 계산은 가까운 두 장소도 구분한다",()=>assert.ok(distanceMeters({lat:37.5,lng:127},{lat:37.5001,lng:127})>10));
test("사용자 확정 이름이 저장 장소와 자동 검색보다 우선한다",()=>{assert.equal(choosePlaceName({manual:"내가 정한 카페",favorite:"저장 카페",google:"구글 카페",suggested:"추천 카페"}),"내가 정한 카페");assert.equal(choosePlaceName({favorite:"저장 카페",google:"구글 카페"}),"저장 카페")});
test("좌표 이름은 건너뛰고 실제 후보가 없을 때만 미등록으로 둔다",()=>{assert.equal(choosePlaceName({manual:"37.5,127",google:"구글 장소"}),"구글 장소");assert.equal(choosePlaceName({suggested:"geo:37.5,127"}),"장소명 입력 필요")});
