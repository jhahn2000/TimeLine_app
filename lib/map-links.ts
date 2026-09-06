import {isCoordinateName} from "./places";

export type RoutePoint={lat:number;lng:number;name:string};

export function resolvedMapPlaceName(record:{title?:string|null;startPlace?:string|null}){
  return [record.title,record.startPlace].find(value=>!isCoordinateName(value))?.trim()||"장소명 미등록";
}

export function googlePlaceUrl(point:RoutePoint){
  const query=point.name==="장소명 미등록"?`${point.lat},${point.lng}`:`${point.name} ${point.lat},${point.lng}`;
  return `https://www.google.com/maps/search/?${new URLSearchParams({api:"1",query}).toString()}`;
}

export function googleDayUrl(points:RoutePoint[]){
  const [start,end]=[points[0],points.at(-1)!],place=(point:RoutePoint)=>`${point.name} ${point.lat},${point.lng}`,params=new URLSearchParams({api:"1",origin:place(start),destination:place(end),travelmode:"driving"});
  if(points.length>2)params.set("waypoints",points.slice(1,-1).map(place).join("|"));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function naverAppUrl(points:RoutePoint[],appName:string){
  const [start,end]=[points[0],points.at(-1)!],params=new URLSearchParams({slat:String(start.lat),slng:String(start.lng),sname:start.name,dlat:String(end.lat),dlng:String(end.lng),dname:end.name,appname:appName});
  points.slice(1,-1).forEach((point,index)=>{const number=index+1;params.set(`v${number}lat`,String(point.lat));params.set(`v${number}lng`,String(point.lng));params.set(`v${number}name`,point.name)});
  return `nmap://route/car?${params.toString()}`;
}

export function naverWebUrl(points:RoutePoint[]){
  const place=(point:RoutePoint)=>`${point.lng},${point.lat},${encodeURIComponent(point.name)},PLACE_POI`;
  return `https://map.naver.com/p/directions/${points.map(place).join("/")}/-/car`;
}
