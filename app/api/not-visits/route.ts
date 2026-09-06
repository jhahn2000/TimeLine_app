import {env} from "cloudflare:workers";
import {asc,eq} from "drizzle-orm";
import {getDb} from "../../../db";
import {notVisitRecords,timelineRecords} from "../../../db/schema";

const reasons=new Set(["","이동 중 잠시 정차","길 확인","전화 통화","교통 정체·신호대기","기타"]);

export async function GET(request:Request){
  try{
    const tripId=Number(new URL(request.url).searchParams.get("tripId"));
    if(!tripId)return Response.json({records:[]});
    return Response.json({records:await getDb().select().from(notVisitRecords).where(eq(notVisitRecords.tripId,tripId)).orderBy(asc(notVisitRecords.startTime))});
  }catch{return Response.json({records:[]})}
}

export async function POST(request:Request){
  try{
    const p=await request.json() as {timelineRecordId?:number;reason?:string;reasonDetail?:string};
    const id=Number(p.timelineRecordId),reason=(p.reason||"").trim(),detail=(p.reasonDetail||"").trim();
    if(!id||!reasons.has(reason))return Response.json({error:"방문 기록과 사유를 확인해주세요."},{status:400});
    if(reason==="기타"&&!detail)return Response.json({error:"기타 사유를 입력하거나 사유를 선택하지 않음으로 바꿔주세요."},{status:400});
    const [record]=await getDb().select().from(timelineRecords).where(eq(timelineRecords.id,id)).limit(1);
    if(!record||record.recordType!=="visit")return Response.json({error:"방문 기록을 찾지 못했습니다."},{status:404});
    await env.DB.prepare("INSERT OR IGNORE INTO not_visit_records (timeline_record_id,trip_id,entry_date,title,note,start_time,end_time,start_place,start_lat,start_lng,source_id,reason,reason_detail) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(record.id,record.tripId,record.entryDate,record.title,record.note,record.startTime,record.endTime,record.startPlace,record.startLat,record.startLng,record.sourceId,reason||null,reason==="기타"?detail:null).run();
    const [saved]=await getDb().select().from(notVisitRecords).where(eq(notVisitRecords.timelineRecordId,id)).limit(1);
    return Response.json({record:saved},{status:201});
  }catch{return Response.json({error:"방문 아님 정보를 저장하지 못해 원본 기록을 그대로 두었습니다."},{status:500})}
}
