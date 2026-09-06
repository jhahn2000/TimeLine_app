import {env} from "cloudflare:workers";
import {and,asc,eq,gte,inArray,isNull,lte} from "drizzle-orm";
import {getDb} from "../../../db";
import {favoritePlaces,timelineRecords} from "../../../db/schema";
import {distanceMeters,isCoordinateName} from "../../../lib/places";

type RecordInput={tripId?:number|null;entryDate:string;recordType:"visit"|"activity";title:string;note?:string;startTime:string;endTime?:string;transportType?:string;originalTransportType?:string;distanceMeters?:number;startPlace?:string;endPlace?:string;startLat?:string;startLng?:string;endLat?:string;endLng?:string;sourceId?:string;placeNameSource?:string;confirmedPlaceId?:number|null};
type StoredTimelineRecord=typeof timelineRecords.$inferSelect;
const clean=(r:RecordInput)=>({...r,tripId:r.tripId||null,entryDate:r.startTime.slice(0,10)||r.entryDate,title:r.title.trim(),note:r.note?.trim()||"",endTime:r.endTime||null,transportType:r.transportType||null,originalTransportType:r.originalTransportType||null,distanceMeters:Number.isFinite(Number(r.distanceMeters))?Math.max(0,Math.round(Number(r.distanceMeters))):null,startPlace:r.startPlace?.trim()||null,endPlace:r.endPlace?.trim()||null,startLat:r.startLat||null,startLng:r.startLng||null,endLat:r.endLat||null,endLng:r.endLng||null,sourceId:r.sourceId||null,placeNameSource:r.placeNameSource||"unknown",confirmedPlaceId:r.confirmedPlaceId||null});
const insertColumns=["trip_id","entry_date","record_type","title","note","start_time","end_time","transport_type","original_transport_type","distance_meters","start_place","end_place","start_lat","start_lng","end_lat","end_lng","source_id","place_name_source","confirmed_place_id"];
const recordValues=(r:ReturnType<typeof clean>)=>[r.tripId,r.entryDate,r.recordType,r.title,r.note,r.startTime,r.endTime,r.transportType,r.originalTransportType,r.distanceMeters,r.startPlace,r.endPlace,r.startLat,r.startLng,r.endLat,r.endLng,r.sourceId,r.placeNameSource,r.confirmedPlaceId];
export async function GET(request:Request){const u=new URL(request.url),tripId=Number(u.searchParams.get("tripId")),from=u.searchParams.get("from")||"0000-01-01",to=u.searchParams.get("to")||"9999-12-31";try{const where=tripId?eq(timelineRecords.tripId,tripId):and(isNull(timelineRecords.tripId),gte(timelineRecords.entryDate,from),lte(timelineRecords.entryDate,to));return Response.json({records:await getDb().select().from(timelineRecords).where(where).orderBy(asc(timelineRecords.startTime)).limit(1000)})}catch{return Response.json({records:[]})}}
export async function POST(request:Request){try{const p=await request.json() as {records?:RecordInput[];tripId?:number|null},rows=(p.records||[]).filter(r=>r.startTime&&r.title&&(r.recordType==="visit"||r.recordType==="activity")).slice(0,1000).map(r=>clean({...r,tripId:p.tripId??r.tripId}));if(!rows.length)return Response.json({error:"저장할 기록이 없습니다."},{status:400});const statements=[];for(let i=0;i<rows.length;i+=5){const chunk=rows.slice(i,i+5),values=chunk.flatMap(recordValues),groups=chunk.map(()=>`(${insertColumns.map(()=>"?").join(",")})`).join(",");statements.push(env.DB.prepare(`INSERT INTO timeline_records (${insertColumns.join(",")}) VALUES ${groups}`).bind(...values))}await env.DB.batch(statements);return Response.json({count:rows.length},{status:201})}catch(error){console.error("timeline record save failed",error);return Response.json({error:"기록을 저장하지 못했습니다."},{status:500})}}
export async function PUT(request:Request){try{const p=await request.json() as RecordInput&{id:number;confirmPlace?:boolean;address?:string;radiusMeters?:number};if(!p.id||!p.title?.trim()||!p.startTime||isCoordinateName(p.title))return Response.json({error:"좌표가 아닌 확정 장소명을 입력해주세요."},{status:400});const cleaned=clean({...p,placeNameSource:p.recordType==="visit"?"manual":p.placeNameSource});if(p.confirmPlace&&p.recordType==="visit"&&p.startLat&&p.startLng){const radius=Math.min(500,Math.max(1,Math.round(Number(p.radiusMeters)||15))),token=crypto.randomUUID();await env.DB.batch([env.DB.prepare("INSERT INTO favorite_places (name,address,lat,lng,radius_meters) VALUES (?,?,?,?,?)").bind(cleaned.title,p.address?.trim()||cleaned.startPlace||"",p.startLat,p.startLng,radius),env.DB.prepare("UPDATE timeline_records SET entry_date=?,record_type=?,title=?,note=?,start_time=?,end_time=?,transport_type=?,original_transport_type=?,distance_meters=?,start_place=?,end_place=?,start_lat=?,start_lng=?,end_lat=?,end_lng=?,source_id=?,place_name_source='manual',confirmed_place_id=(SELECT max(id) FROM favorite_places) WHERE id=?").bind(cleaned.entryDate,cleaned.recordType,cleaned.title,cleaned.note,cleaned.startTime,cleaned.endTime,cleaned.transportType,cleaned.originalTransportType,cleaned.distanceMeters,cleaned.title,cleaned.endPlace,cleaned.startLat,cleaned.startLng,cleaned.endLat,cleaned.endLng,cleaned.sourceId,p.id)]);const[record]=await getDb().select().from(timelineRecords).where(eq(timelineRecords.id,p.id));return Response.json({record,confirmed:true,token})}const[record]=await getDb().update(timelineRecords).set(cleaned).where(eq(timelineRecords.id,p.id)).returning();return record?Response.json({record}):Response.json({error:"기록을 찾지 못했습니다."},{status:404})}catch{return Response.json({error:"기록과 저장 장소를 안전하게 수정하지 못해 기존 내용을 그대로 두었습니다."},{status:500})}}
export async function DELETE(request:Request){try{const id=Number(new URL(request.url).searchParams.get("id"));if(!id)return Response.json({error:"기록을 선택해주세요."},{status:400});await getDb().delete(timelineRecords).where(eq(timelineRecords.id,id));return Response.json({ok:true})}catch{return Response.json({error:"기록을 삭제하지 못했습니다."},{status:500})}}

export async function PATCH(request:Request){try{
  const p=await request.json() as {action:string;id?:number;ids?:number[];record?:RecordInput;records?:RecordInput[];token?:string;changes?:Array<{id:number;after:string;placeId:number}>;name?:string;address?:string;radiusMeters?:number;scope?:"record"|"day"|"favorite";applyIds?:number[]};
  if(p.action==="confirmPlace"){
    const id=Number(p.id),name=p.name?.trim()||"",radius=Math.min(500,Math.max(1,Math.round(Number(p.radiusMeters)||15))),scope=p.scope||"record";
    if(!id||isCoordinateName(name))return Response.json({error:"좌표가 아닌 확정 장소명을 입력해주세요."},{status:400});
    const [selected]=await getDb().select().from(timelineRecords).where(eq(timelineRecords.id,id)).limit(1);
    if(!selected||selected.recordType!=="visit"||!selected.startLat||!selected.startLng)return Response.json({error:"확정할 방문 기록과 좌표를 확인해주세요."},{status:400});
    const requested=[...new Set((p.applyIds||[]).map(Number).filter(Boolean))],possible=requested.length?await getDb().select().from(timelineRecords).where(inArray(timelineRecords.id,requested)):[];
    const eligible=scope==="record"?[]:possible.filter(row=>row.tripId===selected.tripId&&row.entryDate===selected.entryDate&&row.recordType==="visit"&&row.placeNameSource!=="manual"&&row.placeNameSource!=="same_day"&&row.startLat&&row.startLng&&distanceMeters({lat:Number(selected.startLat),lng:Number(selected.startLng)},{lat:Number(row.startLat),lng:Number(row.startLng)})<=radius);
    const statements=[];
    if(scope==="favorite")statements.push(env.DB.prepare("INSERT INTO favorite_places (name,address,lat,lng,radius_meters) VALUES (?,?,?,?,?)").bind(name,p.address?.trim()||"",selected.startLat,selected.startLng,radius));
    const favoriteId=scope==="favorite"?"(SELECT max(id) FROM favorite_places)":"NULL",source=scope==="record"?"manual":"same_day";
    statements.push(env.DB.prepare(`UPDATE timeline_records SET title=?,start_place=?,place_name_source='manual',confirmed_place_id=${favoriteId} WHERE id=?`).bind(name,name,id));
    statements.push(...eligible.map(row=>env.DB.prepare(`UPDATE timeline_records SET title=?,start_place=?,place_name_source=?,confirmed_place_id=${favoriteId} WHERE id=? AND place_name_source NOT IN ('manual','same_day')`).bind(name,name,source,row.id)));
    await env.DB.batch(statements);
    return Response.json({updated:1+eligible.length});
  }
  if(p.action==="applyPlaces"){
    const changes=(p.changes||[]).filter(change=>change.id&&change.after?.trim()&&change.placeId).slice(0,1000);
    if(!changes.length)return Response.json({error:"적용할 확정 장소가 없습니다."},{status:400});
    const statements=changes.map(change=>env.DB.prepare("UPDATE timeline_records SET title=?,start_place=?,place_name_source='favorite',confirmed_place_id=? WHERE id=? AND record_type='visit' AND place_name_source!='manual'").bind(change.after.trim(),change.after.trim(),change.placeId,change.id));
    await env.DB.batch(statements);return Response.json({count:changes.length});
  }
  if(p.action==="merge"){
    const ids=[...new Set((p.ids||[]).map(Number).filter(Boolean))];
    if(ids.length<2||!p.record)return Response.json({error:"합칠 이동 기록을 2개 이상 선택해주세요."},{status:400});
    const originals=await getDb().select().from(timelineRecords).where(inArray(timelineRecords.id,ids)).orderBy(asc(timelineRecords.startTime));
    if(originals.length!==ids.length||originals.some(r=>r.recordType!=="activity"))return Response.json({error:"선택한 이동 기록을 확인해주세요."},{status:400});
    const token=crypto.randomUUID(),record=clean({...p.record,recordType:"activity",sourceId:`merge:${token}`});
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO timeline_records (${insertColumns.join(",")}) VALUES (${insertColumns.map(()=>"?").join(",")})`).bind(...recordValues(record)),
      env.DB.prepare("INSERT INTO timeline_merge_history (merge_token, original_records) VALUES (?, ?)").bind(token,JSON.stringify(originals)),
      env.DB.prepare(`DELETE FROM timeline_records WHERE id IN (${ids.map(()=>"?").join(",")})`).bind(...ids)
    ]);
    const merged=await getDb().select().from(timelineRecords).where(eq(timelineRecords.sourceId,`merge:${token}`)).limit(1);
    return Response.json({record:merged[0],token});
  }
  if(p.action==="split"){
    const id=Number(p.id),parts=p.records||[];
    if(!id||parts.length!==2)return Response.json({error:"나눌 방문 기록과 두 장소를 확인해주세요."},{status:400});
    const [original]=await getDb().select().from(timelineRecords).where(eq(timelineRecords.id,id)).limit(1);
    if(!original||original.recordType!=="visit"||!original.endTime)return Response.json({error:"끝 시간이 있는 방문 기록만 나눌 수 있습니다."},{status:400});
    const splitTime=parts[0].endTime||"",validTime=parts[0].startTime===original.startTime&&parts[1].startTime===splitTime&&parts[1].endTime===original.endTime&&new Date(splitTime)>new Date(original.startTime)&&new Date(splitTime)<new Date(original.endTime);
    if(!validTime||parts.some(r=>!r.title?.trim()))return Response.json({error:"나눌 시간과 두 장소 이름을 다시 확인해주세요."},{status:400});
    const token=crypto.randomUUID(),first=clean({...parts[0],tripId:original.tripId,recordType:"visit",sourceId:`split:${token}:1`}),second=clean({...parts[1],tripId:original.tripId,recordType:"visit",sourceId:`split:${token}:2`});
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO timeline_records (${insertColumns.join(",")}) VALUES (${insertColumns.map(()=>"?").join(",")})`).bind(...recordValues(first)),
      env.DB.prepare(`INSERT INTO timeline_records (${insertColumns.join(",")}) VALUES (${insertColumns.map(()=>"?").join(",")})`).bind(...recordValues(second)),
      env.DB.prepare("INSERT INTO timeline_merge_history (merge_token, original_records) VALUES (?, ?)").bind(token,JSON.stringify([original])),
      env.DB.prepare("DELETE FROM timeline_records WHERE id = ?").bind(id)
    ]);
    const records=await getDb().select().from(timelineRecords).where(inArray(timelineRecords.sourceId,[`split:${token}:1`,`split:${token}:2`])).orderBy(asc(timelineRecords.startTime));
    return Response.json({records,token});
  }
  if((p.action==="undo"||p.action==="undoSplit")&&p.token){
    const history=await env.DB.prepare("SELECT original_records, undone_at FROM timeline_merge_history WHERE merge_token = ?").bind(p.token).first<{original_records:string;undone_at:string|null}>();
    if(!history||history.undone_at)return Response.json({error:"이미 되돌렸거나 되돌릴 기록이 없습니다."},{status:400});
    const originals=JSON.parse(history.original_records) as StoredTimelineRecord[],statements=originals.map(r=>env.DB.prepare("INSERT INTO timeline_records (id,trip_id,entry_date,record_type,title,note,start_time,end_time,transport_type,original_transport_type,distance_meters,start_place,end_place,start_lat,start_lng,end_lat,end_lng,source_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(r.id,r.tripId,r.entryDate,r.recordType,r.title,r.note,r.startTime,r.endTime,r.transportType,r.originalTransportType,r.distanceMeters,r.startPlace,r.endPlace,r.startLat,r.startLng,r.endLat,r.endLng,r.sourceId,r.createdAt));
    if(p.action==="undoSplit")statements.push(env.DB.prepare("DELETE FROM timeline_records WHERE source_id IN (?, ?)").bind(`split:${p.token}:1`,`split:${p.token}:2`));
    else statements.push(env.DB.prepare("DELETE FROM timeline_records WHERE source_id = ?").bind(`merge:${p.token}`));
    statements.push(env.DB.prepare("UPDATE timeline_merge_history SET undone_at = CURRENT_TIMESTAMP WHERE merge_token = ?").bind(p.token));
    await env.DB.batch(statements);
    return Response.json({records:originals});
  }
  return Response.json({error:"올바른 작업이 아닙니다."},{status:400});
}catch(error){console.error("timeline record change failed",error);return Response.json({error:"안전하게 처리하지 못해 기존 기록을 그대로 두었습니다."},{status:500})}}
