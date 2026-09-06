import {asc,eq} from "drizzle-orm";
import {getDb} from "../../../db";
import {favoritePlaces} from "../../../db/schema";
import {isCoordinateName} from "../../../lib/places";

const clean=(p:{name?:string;address?:string;lat?:string|number;lng?:string|number;radiusMeters?:number})=>({name:String(p.name||"").trim(),address:String(p.address||"").trim(),lat:String(p.lat??"").trim(),lng:String(p.lng??"").trim(),radiusMeters:Math.min(500,Math.max(1,Math.round(Number(p.radiusMeters)||15)))});
function valid(p:ReturnType<typeof clean>){const lat=Number(p.lat),lng=Number(p.lng);return !isCoordinateName(p.name)&&Number.isFinite(lat)&&Math.abs(lat)<=90&&Number.isFinite(lng)&&Math.abs(lng)<=180}
export async function GET(){try{return Response.json({places:await getDb().select().from(favoritePlaces).orderBy(asc(favoritePlaces.name))})}catch{return Response.json({places:[]})}}
export async function POST(request:Request){try{const p=clean(await request.json());if(!valid(p))return Response.json({error:"확정 장소명과 좌표를 확인해주세요."},{status:400});const[place]=await getDb().insert(favoritePlaces).values(p).returning();return Response.json({place},{status:201})}catch{return Response.json({error:"저장 장소를 추가하지 못해 기존 목록을 그대로 두었습니다."},{status:500})}}
export async function PUT(request:Request){try{const body=await request.json() as {id:number;name?:string;address?:string;lat?:string|number;lng?:string|number;radiusMeters?:number},p=clean(body);if(!body.id||!valid(p))return Response.json({error:"저장 장소 내용을 확인해주세요."},{status:400});const[place]=await getDb().update(favoritePlaces).set({...p,updatedAt:new Date().toISOString()}).where(eq(favoritePlaces.id,body.id)).returning();return place?Response.json({place}):Response.json({error:"저장 장소를 찾지 못했습니다."},{status:404})}catch{return Response.json({error:"저장 장소를 수정하지 못해 기존 내용을 그대로 두었습니다."},{status:500})}}
export async function DELETE(request:Request){try{const id=Number(new URL(request.url).searchParams.get("id"));if(!id)return Response.json({error:"삭제할 장소를 선택해주세요."},{status:400});await getDb().delete(favoritePlaces).where(eq(favoritePlaces.id,id));return Response.json({ok:true})}catch{return Response.json({error:"저장 장소를 삭제하지 못했습니다."},{status:500})}}
