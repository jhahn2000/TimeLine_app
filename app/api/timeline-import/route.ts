import {env} from "cloudflare:workers";

type RecordInput={entryDate?:string;recordType:"visit"|"activity";title:string;note?:string;startTime:string;endTime?:string;transportType?:string;originalTransportType?:string;distanceMeters?:number;startPlace?:string;endPlace?:string;startLat?:string;startLng?:string;endLat?:string;endLng?:string;sourceId?:string};
type TripInput={title:string;location:string;startDate:string;endDate:string;memo?:string};
const columns=["trip_id","entry_date","record_type","title","note","start_time","end_time","transport_type","original_transport_type","distance_meters","start_place","end_place","start_lat","start_lng","end_lat","end_lng","source_id"];
const clean=(r:RecordInput)=>[String(r.startTime).slice(0,10),r.recordType,r.title.trim(),r.note?.trim()||"",r.startTime,r.endTime||null,r.transportType||null,r.originalTransportType||null,Number.isFinite(Number(r.distanceMeters))?Math.max(0,Math.round(Number(r.distanceMeters))):null,r.startPlace?.trim()||null,r.endPlace?.trim()||null,r.startLat||null,r.startLng||null,r.endLat||null,r.endLng||null,r.sourceId||null];

export async function POST(request:Request){
  try{
    const p=await request.json() as {trip?:TripInput;records?:RecordInput[]},trip=p.trip,records=(p.records||[]).filter(r=>r.startTime&&r.title?.trim()&&(r.recordType==="visit"||r.recordType==="activity")).slice(0,1000);
    if(!trip?.title?.trim()||!trip.location?.trim()||!trip.startDate||!trip.endDate)return Response.json({error:"여행의 필수 내용을 확인해주세요."},{status:400});
    if(!records.length)return Response.json({error:"저장할 방문·이동 기록이 없습니다."},{status:400});
    const statements=[env.DB.prepare("INSERT INTO trips (title,location,start_date,end_date,memo) VALUES (?,?,?,?,?) RETURNING id,title,location,start_date AS startDate,end_date AS endDate,memo").bind(trip.title.trim(),trip.location.trim(),trip.startDate,trip.endDate,trip.memo?.trim()||"")];
    for(let i=0;i<records.length;i+=5){
      const chunk=records.slice(i,i+5),groups=chunk.map(()=>`((SELECT max(id) FROM trips),${columns.slice(1).map(()=>"?").join(",")})`).join(","),values=chunk.flatMap(clean);
      statements.push(env.DB.prepare(`INSERT INTO timeline_records (${columns.join(",")}) VALUES ${groups}`).bind(...values));
    }
    const results=await env.DB.batch(statements),tripRow=results[0]?.results?.[0];
    if(!tripRow)throw new Error("trip insert returned no row");
    return Response.json({trip:tripRow,count:records.length},{status:201});
  }catch(error){
    console.error("atomic timeline import failed",error);
    return Response.json({error:"여행과 기록을 함께 저장하지 못해 새 여행 생성을 자동으로 취소했습니다."},{status:500});
  }
}
