import {and,asc,eq,gte,lte} from "drizzle-orm";
import {getDb} from "../../../db";
import {dailyEntries} from "../../../db/schema";

export async function GET(request:Request){
  const url=new URL(request.url),from=url.searchParams.get("from")||"0000-01-01",to=url.searchParams.get("to")||"9999-12-31";
  try{return Response.json({entries:await getDb().select().from(dailyEntries).where(and(gte(dailyEntries.entryDate,from),lte(dailyEntries.entryDate,to))).orderBy(asc(dailyEntries.happenedAt)).limit(500)})}catch{return Response.json({entries:[]})}
}
export async function POST(request:Request){
  try{const payload=await request.json() as {entries?:Array<{entryDate:string;title:string;place:string;happenedAt:string;note?:string}>};const rows=(payload.entries||[]).filter(e=>e.entryDate&&e.title&&e.happenedAt).slice(0,500);if(!rows.length)return Response.json({error:"저장할 일정이 없습니다."},{status:400});const saved=await getDb().insert(dailyEntries).values(rows.map(e=>({...e,note:e.note||""}))).returning();return Response.json({count:saved.length},{status:201})}catch{return Response.json({error:"일정을 저장하지 못했습니다."},{status:500})}
}
export async function PUT(request:Request){
  try{const p=await request.json() as {id:number;title:string;place:string;happenedAt:string;note?:string};if(!p.id||!p.title?.trim()||!p.happenedAt)return Response.json({error:"장소명과 시간을 입력해주세요."},{status:400});const[entry]=await getDb().update(dailyEntries).set({title:p.title.trim(),place:(p.place||p.title).trim(),happenedAt:p.happenedAt,entryDate:p.happenedAt.slice(0,10),note:p.note?.trim()||""}).where(eq(dailyEntries.id,p.id)).returning();return entry?Response.json({entry}):Response.json({error:"기록을 찾지 못했습니다."},{status:404})}catch{return Response.json({error:"기록을 수정하지 못했습니다."},{status:500})}
}
export async function DELETE(request:Request){
  try{const id=Number(new URL(request.url).searchParams.get("id"));if(!id)return Response.json({error:"기록을 선택해주세요."},{status:400});await getDb().delete(dailyEntries).where(eq(dailyEntries.id,id));return Response.json({ok:true})}catch{return Response.json({error:"기록을 삭제하지 못했습니다."},{status:500})}
}
