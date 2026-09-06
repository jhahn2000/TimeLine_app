import {distanceMeters,isCoordinateName} from "../../../lib/places";

type NominatimResult={place_id?:number|string;name?:string;display_name?:string;lat?:string;lon?:string;category?:string;type?:string;address?:Record<string,string>};
const headers={"User-Agent":"YeohaengGirok/1.0 (local travel diary)","Accept":"application/json"};
const categoryName=(category?:string,type?:string)=>({amenity:"편의시설",tourism:"관광지",shop:"상점",leisure:"여가시설",historic:"역사 장소",office:"사무시설",building:"건물",highway:"도로"}[category||""]||type?.replaceAll("_"," ")||"장소");
const resultName=(data:NominatimResult)=>{const a=data.address||{};return data.name||a.amenity||a.tourism||a.shop||a.leisure||a.historic||a.office||a.building||a.road||data.display_name?.split(",")[0]||""};

export async function GET(request:Request){
  try{
    const params=new URL(request.url).searchParams,location=params.get("location")||"",match=location.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
    if(!match)return Response.json({error:"좌표가 있는 기록만 장소명을 찾을 수 있습니다."},{status:400});
    const lat=Number(match[1]),lon=Number(match[2]);
    if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return Response.json({error:"올바른 좌표가 아닙니다."},{status:400});
    if(params.get("nearby")==="1"){
      const query=(params.get("q")||"").trim(),delta=.012;let rows:NominatimResult[]=[];
      if(query){const url=`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&accept-language=ko&addressdetails=1&limit=30&viewbox=${lon-delta},${lat+delta},${lon+delta},${lat-delta}&bounded=1`,response=await fetch(url,{headers});if(!response.ok)throw new Error();rows=await response.json() as NominatimResult[]}
      else{const response=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=ko&zoom=18&addressdetails=1`,{headers});if(!response.ok)throw new Error();rows=[await response.json() as NominatimResult]}
      const seen=new Set<string>(),candidates=rows.map((row,index)=>{const itemLat=Number(row.lat),itemLng=Number(row.lon),name=resultName(row),address=row.display_name||name;return{id:String(row.place_id||index),name,category:categoryName(row.category,row.type),address,lat:itemLat,lng:itemLng,distanceMeters:Math.round(distanceMeters({lat,lng:lon},{lat:itemLat,lng:itemLng}))}}).filter(item=>Number.isFinite(item.lat)&&Number.isFinite(item.lng)&&!isCoordinateName(item.name)&&!seen.has(`${item.name}|${item.address}`)&&seen.add(`${item.name}|${item.address}`)).sort((a,b)=>a.distanceMeters-b.distanceMeters);
      return Response.json({candidates});
    }
    const response=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=ko&zoom=18&addressdetails=1`,{headers});if(!response.ok)throw new Error();
    const data=await response.json() as NominatimResult,name=resultName(data);
    if(isCoordinateName(name))return Response.json({error:"이 좌표 주변의 장소명을 찾지 못했습니다."},{status:404});
    return Response.json({name,address:data.display_name||name});
  }catch{return Response.json({error:"인터넷에서 장소명을 찾지 못했습니다. 직접 입력하거나 외부 지도에서 확인하세요."},{status:502})}
}
