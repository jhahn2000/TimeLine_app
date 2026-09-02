export async function GET(request:Request){
  try{
    const location=new URL(request.url).searchParams.get("location")||"",match=location.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
    if(!match)return Response.json({error:"좌표가 있는 기록만 장소명을 찾을 수 있습니다."},{status:400});
    const lat=Number(match[1]),lon=Number(match[2]);
    if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return Response.json({error:"올바른 좌표가 아닙니다."},{status:400});
    const response=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=ko&zoom=18&addressdetails=1`,{headers:{"User-Agent":"YeohaengGirok/1.0 (+https://yeohaeng-girok.jhahn2000j.chatgpt.site)","Accept":"application/json"}});
    if(!response.ok)throw new Error();
    const data=await response.json() as {name?:string;display_name?:string;address?:Record<string,string>},a=data.address||{},name=data.name||a.amenity||a.tourism||a.shop||a.office||a.building||a.road||data.display_name?.split(",")[0];
    if(!name)return Response.json({error:"이 좌표 주변의 장소명을 찾지 못했습니다."},{status:404});
    return Response.json({name,address:data.display_name||name});
  }catch{return Response.json({error:"인터넷에서 장소명을 찾지 못했습니다. 잠시 후 다시 시도해주세요."},{status:502})}
}
