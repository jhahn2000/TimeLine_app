"use client";
import { Fragment, useEffect, useState } from "react";
import {parseTimeline} from "../lib/timeline";
import {googleDayUrl,naverAppUrl,naverWebUrl,resolvedMapPlaceName} from "../lib/map-links";
import {
  CalendarDays,
  Car,
  Camera,
  ChevronLeft,
  ChevronRight,
  Hotel,
  Map,
  MapPin,
  Navigation,
  Pencil,
  Plus,
  Route,
  Scissors,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Utensils,
  X,
} from "lucide-react";
type Trip = {
  id: number;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  memo: string;
};
type Entry = {
  id: number;
  tripId: number;
  entryType: string;
  title: string;
  note: string;
  place: string;
  happenedAt: string;
  imageUrl?: string | null;
};
type DailyEntry = { id:number; entryDate:string; title:string; place:string; happenedAt:string; note:string };
type EditableRecord = { kind:"travel"|"daily"; entry:Entry|DailyEntry };
type TimelineRecord={id:number;tripId:number|null;entryDate:string;recordType:"visit"|"activity";title:string;note:string;startTime:string;endTime:string|null;transportType:string|null;originalTransportType:string|null;distanceMeters:number|null;startPlace:string|null;endPlace:string|null;startLat:string|null;startLng:string|null;endLat:string|null;endLng:string|null;sourceId:string|null;placeNameSource?:string;confirmedPlaceId?:number|null};
type PlaceChange={id:number;before:string;after?:string;address?:string;placeId?:number;distanceMeters?:number;ambiguous?:boolean;candidates?:Array<{id:number;name:string;address:string;distanceMeters:number}>};
type NearbyPlace={id:string;name:string;category:string;address:string;lat:number;lng:number;distanceMeters:number};
type PlaceFinder={record:TimelineRecord;candidates:NearbyPlace[];selected:string;query:string;direct:boolean;status:string};
type NotVisitRecord={id:number;timelineRecordId:number;tripId:number|null;entryDate:string;title:string;note:string;startTime:string;endTime:string|null;startPlace:string|null;startLat:string|null;startLng:string|null;sourceId:string|null;reason:string|null;reasonDetail:string|null;createdAt:string};
type MapProvider="google"|"naver";
type MapPoint={lat:number;lng:number;name:string;time:string;arrivalTime?:string;departureTime?:string;markerText:string;detailText:string;important:boolean};
type MapDay={date:string;points:MapPoint[]};
type MapPicker={provider:MapProvider;day?:string;fallbackUrl?:string};
type MapCoordinate={lat:number;lng:number};
type MapBounds={minLat:number;maxLat:number;minLng:number;maxLng:number};
type MovementSegment={start:MapCoordinate;end:MapCoordinate};
const demos: Trip[] = [
  {
    id: -1,
    title: "군산 시간여행",
    location: "전북 군산",
    startDate: "2026-08-20",
    endDate: "2026-08-22",
    memo: "근대문화유산과 바다를 천천히 걸었던 2박 3일",
  },
  {
    id: -2,
    title: "포항 바다여행",
    location: "경북 포항",
    startDate: "2026-08-14",
    endDate: "2026-08-16",
    memo: "영일대 야경과 해안 드라이브",
  },
];
const sample: Entry[] = [
  {
    id: -11,
    tripId: -1,
    entryType: "place",
    title: "이성당 본점",
    note: "아침에 들러 단팥빵과 야채빵을 샀다.",
    place: "이성당",
    happenedAt: "2026-08-20T10:10",
  },
  {
    id: -12,
    tripId: -1,
    entryType: "place",
    title: "초원사진관",
    note: "영화 속 장면처럼 사진을 남겼다.",
    place: "초원사진관",
    happenedAt: "2026-08-20T11:40",
  },
  {
    id: -13,
    tripId: -1,
    entryType: "meal",
    title: "한일옥",
    note: "맑고 깊은 소고기뭇국.",
    place: "한일옥",
    happenedAt: "2026-08-20T12:30",
  },
  {
    id: -14,
    tripId: -1,
    entryType: "place",
    title: "경암동 철길마을",
    note: "해가 부드러워지는 시간에 산책했다.",
    place: "철길마을",
    happenedAt: "2026-08-20T16:20",
  },
];
export default function Home() {
  const [trips, setTrips] = useState(demos),
    [sid, setSid] = useState(-1),
    [entries, setEntries] = useState(sample),
    [tripForm, setTripForm] = useState(false),
    [entryForm, setEntryForm] = useState(false),
    [timelineForm, setTimelineForm] = useState(false),
    [editing, setEditing] = useState<EditableRecord|null>(null),
    [view, setView] = useState<"travel"|"calendar">("travel"),
    [dailyEntries, setDailyEntries] = useState<DailyEntry[]>([]),
    [timelineRecords,setTimelineRecords]=useState<TimelineRecord[]>([]),
    [selectedMoves,setSelectedMoves]=useState<number[]>([]),
    [mergePreview,setMergePreview]=useState<TimelineRecord[]|null>(null),
    [splittingVisit,setSplittingVisit]=useState<TimelineRecord|null>(null),
    [editingTimeline,setEditingTimeline]=useState<TimelineRecord|null>(null),
    [lastMergeToken,setLastMergeToken]=useState(""),
    [lastSplitToken,setLastSplitToken]=useState(""),
    [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0,10)),
    [calendarMonth, setCalendarMonth] = useState(new Date().toISOString().slice(0,7)),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [mapPicker,setMapPicker]=useState<MapPicker|null>(null),
    [selectedMapDate,setSelectedMapDate]=useState(""),
    [selectedMapPoint,setSelectedMapPoint]=useState(""),
    [placePreview,setPlacePreview]=useState<PlaceChange[]|null>(null),
    [placeSuggestion,setPlaceSuggestion]=useState<{address:string}|null>(null),
    [placeFinder,setPlaceFinder]=useState<PlaceFinder|null>(null),
    [notVisits,setNotVisits]=useState<NotVisitRecord[]>([]),
    [notVisitTarget,setNotVisitTarget]=useState<TimelineRecord|null>(null),
    [showNotVisits,setShowNotVisits]=useState(false);
  useEffect(() => {
    fetch("/api/trips")
      .then((r) => r.json())
      .then((d) => {
        if (d.trips?.length) {
          setTrips([...d.trips, ...demos]);
          setSid(d.trips[0].id);
        }
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (sid < 0) {
      setEntries(sample.filter((e) => e.tripId === sid));
      return;
    }
    fetch(`/api/entries?tripId=${sid}`)
      .then((r) => r.json())
      .then((d) => setEntries(d.entries || []))
      .catch(() => setEntries([]));
  }, [sid]);
  useEffect(()=>{if(view!=="calendar")return;const[from,to]=monthRange(calendarMonth);fetch(`/api/daily-entries?from=${from}&to=${to}`).then(r=>r.json()).then(d=>setDailyEntries(d.entries||[])).catch(()=>setDailyEntries([]))},[view,calendarMonth]);
  useEffect(()=>{const[from,to]=monthRange(calendarMonth),url=sid>0?`/api/timeline-records?tripId=${sid}`:`/api/timeline-records?from=${from}&to=${to}`;fetch(url).then(r=>r.json()).then(d=>setTimelineRecords(d.records||[])).catch(()=>setTimelineRecords([]));setSelectedMoves([])},[view,sid,calendarMonth]);
  useEffect(()=>{if(sid<0){setNotVisits([]);return}fetch(`/api/not-visits?tripId=${sid}`).then(r=>r.json()).then(d=>setNotVisits(d.records||[])).catch(()=>setNotVisits([]))},[sid]);
  const trip = trips.find((t) => t.id === sid) || trips[0],
    visibleTimelineRecords=timelineRecords.filter(record=>!notVisits.some(item=>item.timelineRecordId===record.id)),
    mapDays=buildMapDays(trip,visibleTimelineRecords),
    mapDate=mapDays.some(day=>day.date===selectedMapDate)?selectedMapDate:trip.startDate,
    activeMapDay=mapDays.find(day=>day.date===mapDate)||mapDays[0],
    mapDayIndex=Math.max(0,mapDays.findIndex(day=>day.date===mapDate)),
    mapMovementSegments=buildMovementSegments(mapDate,visibleTimelineRecords),
    mapBounds=buildMapBounds([...(activeMapDay?.points||[]),...mapMovementSegments.flatMap(segment=>[segment.start,segment.end])]),
    plottedMapPoints=plotMapPoints(activeMapDay?.points||[],mapBounds),
    plottedMovementSegments=mapMovementSegments.map(segment=>({start:mapPosition(segment.start,mapBounds),end:mapPosition(segment.end,mapBounds)})),
    mapBackgroundUrl=openStreetMapEmbedUrl(mapBounds);
  async function addTrip(f: FormData) {
    setBusy(true);
    try {
      const r = await fetch("/api/trips", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(Object.fromEntries(f)),
        }),
        d = await r.json();
      if (!r.ok) throw 0;
      setTrips((v) => [d.trip, ...v]);
      setSid(d.trip.id);
      setTripForm(false);
      setNotice("새 여행을 저장했습니다.");
    } catch {
      setNotice("저장하지 못했습니다.");
    }
    setBusy(false);
  }
  async function addEntry(f: FormData) {
    if (sid < 0) {
      setNotice("먼저 ‘새 여행’을 만들어주세요.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/entries", { method: "POST", body: f }),
        d = await r.json();
      if (!r.ok) throw 0;
      setEntries((v) => [...v, d.entry]);
      setEntryForm(false);
      setNotice("여행 기록을 추가했습니다.");
    } catch {
      setNotice("기록 저장에 실패했습니다.");
    }
    setBusy(false);
  }
  async function updateRecord(f:FormData){
    if(!editing)return;setBusy(true);
    try{const endpoint=editing.kind==="daily"?"/api/daily-entries":"/api/entries",payload={id:editing.entry.id,title:String(f.get("title")||""),place:String(f.get("place")||""),happenedAt:String(f.get("happenedAt")||""),note:String(f.get("note")||"")},r=await fetch(endpoint,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(payload)}),d=await r.json();if(!r.ok)throw new Error(d.error||"수정하지 못했습니다.");if(editing.kind==="daily")setDailyEntries(old=>old.map(e=>e.id===d.entry.id?d.entry:e).filter(e=>e.entryDate.startsWith(calendarMonth)));else setEntries(old=>old.map(e=>e.id===d.entry.id?d.entry:e));setEditing(null);setNotice("장소명과 방문 시간을 수정했습니다.")}catch(error){setNotice(error instanceof Error?error.message:"수정하지 못했습니다.")}setBusy(false);
  }
  async function deleteRecord(record:EditableRecord){
    if(record.entry.id<0||!window.confirm("이 기록을 삭제할까요?"))return;setBusy(true);
    try{const endpoint=record.kind==="daily"?"/api/daily-entries":"/api/entries",r=await fetch(`${endpoint}?id=${record.entry.id}`,{method:"DELETE"}),d=await r.json();if(!r.ok)throw new Error(d.error||"삭제하지 못했습니다.");if(record.kind==="daily")setDailyEntries(old=>old.filter(e=>e.id!==record.entry.id));else setEntries(old=>old.filter(e=>e.id!==record.entry.id));setNotice("기록을 삭제했습니다.")}catch(error){setNotice(error instanceof Error?error.message:"삭제하지 못했습니다.")}setBusy(false);
  }
  async function lookupPlaceName(record:EditableRecord){
    if(record.entry.id<0)return;setBusy(true);
    try{const lookup=await fetch(`/api/geocode?location=${encodeURIComponent(record.entry.place)}`),found=await lookup.json();if(!lookup.ok)throw new Error(found.error||"장소명을 찾지 못했습니다.");const endpoint=record.kind==="daily"?"/api/daily-entries":"/api/entries",save=await fetch(endpoint,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({...record.entry,title:found.name})}),saved=await save.json();if(!save.ok)throw new Error(saved.error||"장소명을 저장하지 못했습니다.");if(record.kind==="daily")setDailyEntries(old=>old.map(e=>e.id===saved.entry.id?saved.entry:e));else setEntries(old=>old.map(e=>e.id===saved.entry.id?saved.entry:e));setNotice(`좌표 주변의 장소명을 ‘${found.name}’(으)로 찾았습니다. 필요하면 수정해주세요.`)}catch(error){setNotice(error instanceof Error?error.message:"장소명을 찾지 못했습니다.")}setBusy(false);
  }
  async function importTimeline(f: FormData) {
    setBusy(true);
    try {
      const file = f.get("timeline") as File;
      if (!file?.size) throw new Error("파일을 선택해주세요.");
      const raw = JSON.parse(await file.text());
      const records=parseTimeline(raw);
      const fromDate = String(f.get("fromDate") || "");
      const toDate = String(f.get("toDate") || "");
      if (!fromDate || !toDate) throw new Error("가져올 기간을 선택해주세요.");
      if (fromDate > toDate) throw new Error("종료일은 시작일보다 늦어야 합니다.");
      const selectedRecords = records
        .filter((record) => {
          const date = String(record.startTime).slice(0, 10);
          return date >= fromDate && date <= toDate;
        })
        .sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));
      if (!records.length) throw new Error("이 JSON 파일에서 방문 또는 이동 기록을 찾지 못했습니다.");
      if (!selectedRecords.length) {
        const dates=records.map(v=>String(v.startTime).slice(0,10)).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
        const available=dates.length?` 파일에 들어 있는 방문 기록 기간은 ${dates[0]} ~ ${dates[dates.length-1]}입니다.`:"";
        throw new Error(`선택한 기간에는 방문 장소가 없습니다.${available}`);
      }
      if(String(f.get("mode"))==="diary"){
        const saved=await fetch("/api/timeline-records",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({records:selectedRecords})});
        const result=await saved.json();if(!saved.ok)throw new Error(result.error||"일정을 저장하지 못했습니다.");
        setCalendarMonth(fromDate.slice(0,7));setSelectedDate(fromDate);setView("calendar");setTimelineForm(false);setNotice(`${result.count}개의 일정을 날짜별 일기에 저장했습니다.`);setBusy(false);return;
      }
      const response = await fetch("/api/timeline-import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          trip: {
            title: String(f.get("title") || "구글 타임라인 여행"),
            location: String(f.get("location") || selectedRecords[0].startPlace || selectedRecords[0].title),
            startDate: fromDate,
            endDate: toDate,
            memo: `${fromDate}부터 ${toDate}까지 구글 지도 타임라인에서 가져온 여행`,
          },
          records:selectedRecords,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error||"여행과 기록을 저장하지 못했습니다.");
      setTrips((old) => [data.trip, ...old]);
      setSid(data.trip.id);
      setTimelineForm(false);
      setNotice(`‘${data.trip.title}’ 여행으로 묶어 왼쪽 목록에 저장했습니다.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "타임라인을 가져오지 못했습니다.");
    }
    setBusy(false);
  }
  async function saveTimeline(f:FormData){if(!editingTimeline)return;setBusy(true);try{const payload={...editingTimeline,title:String(f.get("title")||""),note:String(f.get("note")||""),startTime:String(f.get("startTime")||""),endTime:String(f.get("endTime")||""),transportType:String(f.get("transportType")||""),distanceMeters:Number(f.get("distanceMeters")||0),startPlace:String(f.get("startPlace")||""),endPlace:String(f.get("endPlace")||""),startLat:String(f.get("startLat")||""),startLng:String(f.get("startLng")||""),endLat:String(f.get("endLat")||""),endLng:String(f.get("endLng")||""),confirmPlace:f.get("confirmPlace")==="on",address:String(f.get("address")||""),radiusMeters:Number(f.get("radiusMeters")||15)},r=await fetch("/api/timeline-records",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(payload)}),d=await r.json();if(!r.ok)throw new Error(d.error);setTimelineRecords(old=>old.map(x=>x.id===d.record.id?d.record:x));setEditingTimeline(null);setPlaceSuggestion(null);setNotice(d.confirmed?"장소명을 확정하고 다음 여행에도 사용할 수 있게 저장했습니다.":"기록을 수정했습니다.")}catch(e){setNotice(e instanceof Error?e.message:"수정하지 못했습니다.")}setBusy(false)}
  async function deleteTimeline(record:TimelineRecord){if(!window.confirm(`‘${record.title}’ 기록을 삭제할까요? 선택한 이 기록만 삭제됩니다.`))return;setBusy(true);try{const r=await fetch(`/api/timeline-records?id=${record.id}`,{method:"DELETE"}),d=await r.json();if(!r.ok)throw new Error(d.error);setTimelineRecords(old=>old.filter(x=>x.id!==record.id));setSelectedMoves(old=>old.filter(id=>id!==record.id));setNotice("선택한 기록을 삭제했습니다.")}catch(e){setNotice(e instanceof Error?e.message:"삭제하지 못했습니다.")}setBusy(false)}
  async function markNotVisit(reason:string,reasonDetail:string){if(!notVisitTarget)return;setBusy(true);try{const r=await fetch("/api/not-visits",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({timelineRecordId:notVisitTarget.id,reason,reasonDetail})}),d=await r.json();if(!r.ok)throw new Error(d.error);setNotVisits(old=>old.some(item=>item.timelineRecordId===d.record.timelineRecordId)?old:[...old,d.record]);setNotVisitTarget(null);setNotice("방문 아님으로 처리했습니다. 원본 기록은 그대로 보관됩니다.")}catch(e){setNotice(e instanceof Error?e.message:"방문 아님으로 처리하지 못했습니다.")}setBusy(false)}
  async function lookupTimeline(record:TimelineRecord){const coordinates=record.startLat&&record.startLng?`${record.startLat},${record.startLng}`:"";if(!coordinates){setNotice("장소명을 찾을 좌표가 없습니다.");return}setPlaceFinder({record,candidates:[],selected:"",query:"",direct:false,status:"장소를 검색하고 있습니다"});await searchNearby(record,"",false)}
  async function searchNearby(record:TimelineRecord,query:string,requireQuery=true){const trimmed=query.trim();if(requireQuery&&!trimmed){setPlaceFinder(old=>old?{...old,query:"",candidates:[],selected:"",direct:true,status:"장소명을 입력해 주세요"}:old);return}const coordinates=`${record.startLat},${record.startLng}`;setPlaceFinder(old=>old?{...old,query:trimmed,candidates:[],selected:"",direct:false,status:"장소를 검색하고 있습니다"}:old);setBusy(true);await new Promise(resolve=>setTimeout(resolve,300));try{const r=await fetch(`/api/geocode?location=${encodeURIComponent(coordinates)}&nearby=1&q=${encodeURIComponent(trimmed)}`),d=await r.json();if(!r.ok)throw new Error(d.error||`검색 서비스 응답 오류 (${r.status})`);const candidates=d.candidates||[];setPlaceFinder(old=>old?{...old,candidates,selected:"",query:trimmed,direct:!candidates.length,status:candidates.length?`주변 장소 후보 ${candidates.length}개를 찾았습니다.`:"현재 자동 장소 검색을 사용할 수 없습니다. 네이버 지도 또는 구글 지도에서 장소를 확인한 뒤 직접 입력해 주세요. (검색 결과 없음)"}:old)}catch(e){const reason=e instanceof Error&&e.message?e.message:"검색 서비스 연결 실패";setPlaceFinder(old=>old?{...old,candidates:[],selected:"",query:trimmed,direct:true,status:`현재 자동 장소 검색을 사용할 수 없습니다. 네이버 지도 또는 구글 지도에서 장소를 확인한 뒤 직접 입력해 주세요. (${reason})`}:old)}setBusy(false)}
  async function confirmFoundPlace(input:{name:string;address:string;radiusMeters:number;scope:"record"|"day"|"favorite"}){if(!placeFinder)return;const record=placeFinder.record,nearby=timelineRecords.filter(item=>item.id!==record.id&&item.tripId===record.tripId&&item.recordType==="visit"&&item.entryDate===record.entryDate&&item.placeNameSource!=="manual"&&item.placeNameSource!=="same_day"&&item.startLat&&item.startLng&&mapDistance(Number(record.startLat),Number(record.startLng),Number(item.startLat),Number(item.startLng))<=input.radiusMeters),applyIds=input.scope==="record"?[]:nearby.map(item=>item.id);setBusy(true);try{const r=await fetch("/api/timeline-records",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({action:"confirmPlace",id:record.id,name:input.name,address:input.address,radiusMeters:input.radiusMeters,scope:input.scope,applyIds})}),d=await r.json();if(!r.ok)throw new Error(d.error);const fresh=await fetch(`/api/timeline-records?tripId=${sid}`).then(x=>x.json());setTimelineRecords(fresh.records||[]);setPlaceFinder(null);setNotice(input.scope==="favorite"?"장소명을 확정하고 앞으로도 기억합니다.":input.scope==="day"?`장소명을 확정하고 같은 날짜의 ${d.updated}개 기록에 적용했습니다.`:"이 방문 기록의 장소명을 확정했습니다.")}catch(e){setNotice(e instanceof Error?e.message:"장소명을 확정하지 못했습니다.")}setBusy(false)}
  async function copyCoordinates(){if(!placeFinder)return;const value=`${placeFinder.record.startLat}, ${placeFinder.record.startLng}`;try{await navigator.clipboard.writeText(value);setNotice("좌표를 복사했습니다")}catch{const input=document.getElementById("place-coordinate-copy") as HTMLInputElement|null;input?.focus();input?.select();setNotice("Ctrl+C를 누르세요")}}
  async function previewSavedPlaces(){if(sid<0)return;setBusy(true);try{const r=await fetch(`/api/place-match?tripId=${sid}`),d=await r.json();if(!r.ok)throw new Error(d.error);setPlacePreview(d.changes||[]);if(!d.changes?.length)setNotice("자동으로 적용할 새 저장 장소가 없습니다.")}catch(e){setNotice(e instanceof Error?e.message:"저장 장소를 확인하지 못했습니다.")}setBusy(false)}
  async function applySavedPlaces(){if(!placePreview)return;const changes=placePreview.filter(change=>change.after&&!change.ambiguous);setBusy(true);try{const r=await fetch("/api/timeline-records",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({action:"applyPlaces",changes})}),d=await r.json();if(!r.ok)throw new Error(d.error);const fresh=await fetch(`/api/timeline-records?tripId=${sid}`).then(x=>x.json());setTimelineRecords(fresh.records||[]);setPlacePreview(null);setNotice(`${d.count}개 방문 기록에 확정 장소명을 적용했습니다.`)}catch(e){setNotice(e instanceof Error?e.message:"적용하지 못했습니다.")}setBusy(false)}
  function openMerge(){const chosen=timelineRecords.filter(r=>selectedMoves.includes(r.id)&&r.recordType==="activity").sort((a,b)=>a.startTime.localeCompare(b.startTime));if(chosen.length<2){setNotice("합칠 이동 기록을 2개 이상 선택해주세요.");return}setMergePreview(chosen)}
  async function mergeMoves(f:FormData){if(!mergePreview)return;setBusy(true);try{const first=mergePreview[0],last=mergePreview[mergePreview.length-1],transport=String(f.get("transportType")||first.transportType||"이동"),r=await fetch("/api/timeline-records",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({action:"merge",ids:mergePreview.map(x=>x.id),record:{tripId:first.tripId,entryDate:String(f.get("startTime")).slice(0,10),recordType:"activity",title:transport,note:String(f.get("note")||""),startTime:String(f.get("startTime")),endTime:String(f.get("endTime")),transportType:transport,originalTransportType:mergePreview.map(x=>x.originalTransportType||x.transportType).join(" + "),distanceMeters:Number(f.get("distanceMeters")||0),startPlace:first.startPlace,endPlace:last.endPlace,startLat:first.startLat,startLng:first.startLng,endLat:last.endLat,endLng:last.endLng}})}),d=await r.json();if(!r.ok)throw new Error(d.error);setTimelineRecords(old=>[...old.filter(x=>!selectedMoves.includes(x.id)),d.record].sort((a,b)=>a.startTime.localeCompare(b.startTime)));setSelectedMoves([]);setMergePreview(null);setLastSplitToken("");setLastMergeToken(d.token);setNotice("선택한 기록을 하나로 합쳤습니다. 잘못되었다면 아래 안내의 되돌리기를 누르세요.")}catch(e){setNotice(e instanceof Error?e.message:"합치지 못했습니다.")}setBusy(false)}
  async function undoMerge(){if(!lastMergeToken||!window.confirm("방금 합친 기록을 원래 기록들로 되돌릴까요?"))return;setBusy(true);try{const r=await fetch("/api/timeline-records",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({action:"undo",token:lastMergeToken})}),d=await r.json();if(!r.ok)throw new Error(d.error);const[from,to]=monthRange(calendarMonth),url=view==="travel"&&sid>0?`/api/timeline-records?tripId=${sid}`:`/api/timeline-records?from=${from}&to=${to}`,fresh=await fetch(url).then(x=>x.json());setTimelineRecords(fresh.records||[]);setLastMergeToken("");setNotice("합치기 전 기록으로 되돌렸습니다.")}catch(e){setNotice(e instanceof Error?e.message:"되돌리지 못했습니다.")}setBusy(false)}
  async function splitVisit(f:FormData){if(!splittingVisit?.endTime)return;const splitTime=String(f.get("splitTime")||"");if(splitTime<=splittingVisit.startTime||splitTime>=splittingVisit.endTime){setNotice("나눌 시간은 원래 방문 시작과 종료 사이여야 합니다.");return}setBusy(true);try{const part=(number:1|2)=>({tripId:splittingVisit.tripId,entryDate:(number===1?splittingVisit.startTime:splitTime).slice(0,10),recordType:"visit" as const,title:String(f.get(`${number===1?"first":"second"}Title`)||""),note:String(f.get(`${number===1?"first":"second"}Note`)||""),startTime:number===1?splittingVisit.startTime:splitTime,endTime:number===1?splitTime:splittingVisit.endTime,startPlace:String(f.get(`${number===1?"first":"second"}Place`)||""),startLat:String(f.get(`${number===1?"first":"second"}Lat`)||""),startLng:String(f.get(`${number===1?"first":"second"}Lng`)||"")}),r=await fetch("/api/timeline-records",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({action:"split",id:splittingVisit.id,records:[part(1),part(2)]})}),d=await r.json();if(!r.ok)throw new Error(d.error);setTimelineRecords(old=>[...old.filter(x=>x.id!==splittingVisit.id),...d.records].sort((a,b)=>a.startTime.localeCompare(b.startTime)));setSplittingVisit(null);setLastMergeToken("");setLastSplitToken(d.token);setNotice("방문 기록을 두 장소로 나눴습니다. 잘못되었다면 아래 되돌리기를 누르세요.")}catch(e){setNotice(e instanceof Error?e.message:"나누지 못했습니다.")}setBusy(false)}
  async function undoSplit(){if(!lastSplitToken||!window.confirm("방금 나눈 두 기록을 원래 방문 기록 하나로 되돌릴까요?"))return;setBusy(true);try{const r=await fetch("/api/timeline-records",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({action:"undoSplit",token:lastSplitToken})}),d=await r.json();if(!r.ok)throw new Error(d.error);const[from,to]=monthRange(calendarMonth),url=view==="travel"&&sid>0?`/api/timeline-records?tripId=${sid}`:`/api/timeline-records?from=${from}&to=${to}`,fresh=await fetch(url).then(x=>x.json());setTimelineRecords(fresh.records||[]);setLastSplitToken("");setNotice("나누기 전 방문 기록으로 되돌렸습니다.")}catch(e){setNotice(e instanceof Error?e.message:"되돌리지 못했습니다.")}setBusy(false)}
  function openExternal(url:string,picker:MapPicker){const opened=window.open(url,"_blank");if(opened)opened.opener=null;else setMapPicker({...picker,fallbackUrl:url})}
  function openNaverRoute(points:MapPoint[],picker:MapPicker){const web=naverWebUrl(points);if(!isMobileDevice()){openExternal(web,picker);return}const appTab=window.open("about:blank","_blank");if(!appTab){setMapPicker({...picker,fallbackUrl:web});return}appTab.opener=null;appTab.location.href=naverAppUrl(points,window.location.origin);window.setTimeout(()=>{if(document.visibilityState!=="visible")return;try{appTab.location.replace(web)}catch{setMapPicker({...picker,fallbackUrl:web})}},1400)}
  function openRoute(provider:MapProvider,day:string){const points=mapDays.find(item=>item.date===day)?.points||[];setSelectedMapDate(day);setSelectedMapPoint("");if(points.length<2){setMapPicker(null);setNotice("이 날짜에는 경로를 만들 좌표가 부족합니다");return}const picker={provider,day};setMapPicker(null);setNotice(`${tripDayLabel(Math.max(1,mapDays.findIndex(item=>item.date===day)+1))} 전체 동선을 지도에 표시했습니다.`);if(provider==="google")openExternal(googleDayUrl(points),picker);else openNaverRoute(points,picker)}
  function beginMap(provider:MapProvider){if(mapDays.length>1){setMapPicker({provider});return}openRoute(provider,mapDays[0]?.date||trip.startDate)}
  return (
    <main>
      <header>
        <div className="brand">
          <b>
            <Navigation size={18} />
          </b>
          <strong>여행기록</strong>
        </div>
        <nav>
          <button className={view==="travel"?"active":""} onClick={()=>setView("travel")}>여행기록</button>
          <button className={view==="calendar"?"active":""} onClick={()=>{setCalendarMonth(trip.startDate.slice(0,7));setSelectedDate(trip.startDate);setView("calendar")}}>일정 달력</button>
          <a href="#recommend" onClick={()=>setView("travel")}>추천</a>
        </nav>
        <button className="import-btn" onClick={() => setTimelineForm(true)}>
          <Upload size={17} />구글 타임라인
        </button>
        <button className="primary" onClick={() => setTripForm(true)}>
          <Plus size={17} />새 여행
        </button>
      </header>
      <div className="layout">
        <aside>
          <h3>
            나의 여행{" "}
            <button onClick={() => setTripForm(true)}>
              <Plus />
            </button>
          </h3>
          {trips.map((t) => (
            <button
              key={t.id}
              className={`trip ${sid === t.id ? "on" : ""}`}
              onClick={() => {setSid(t.id);setView("travel")}}
            >
              <i>
                <MapPin />
              </i>
              <span>
                <b>{t.title}</b>
                <small>
                  {t.startDate.slice(5)} – {t.endDate.slice(5)} · {t.location}
                </small>
              </span>
              <ChevronRight />
            </button>
          ))}
        </aside>
        <section className="content">
          {view==="calendar" ? <CalendarView month={calendarMonth} setMonth={setCalendarMonth} selectedDate={selectedDate} setSelectedDate={setSelectedDate} entries={dailyEntries} timelineRecords={visibleTimelineRecords} trips={trips} selectedTrip={trip} openImport={()=>setTimelineForm(true)} onLookup={entry=>lookupPlaceName({kind:"daily",entry})} onEdit={entry=>setEditing({kind:"daily",entry})} onDelete={entry=>deleteRecord({kind:"daily",entry})} timelineActions={{selectedMoves,setSelectedMoves,openMerge,onPreviewPlaces:previewSavedPlaces,onLookup:lookupTimeline,onEdit:setEditingTimeline,onDelete:deleteTimeline,onSplit:setSplittingVisit,onNotVisit:setNotVisitTarget}} /> : <>
          <div className="title">
            <div>
              <small>
                <MapPin /> {trip.location}
              </small>
              <h1>{trip.title}</h1>
              <p>{trip.memo}</p>
            </div>
            <div className="title-actions">
              <button className="primary" onClick={() => setEntryForm(true)}><Camera />기록 추가</button>
              <button className="ai-schedule-button" onClick={() => setNotice("현재 기록으로 다음 날 일정을 만들었습니다.")}><Sparkles />다음 일정 AI로 만들기</button>
            </div>
          </div>
          <div className="overview">
            <article className="map">
              <div className="cardhead">
                <div>
                  <small>여행 동선</small>
                  <h2>{tripDayLabel(mapDayIndex+1)}의 방문 순서</h2>
                </div>
                <span>
                  <Route /> {activeMapDay?.points.length||0}곳
                </span>
              </div>
              <div className="maparea">
                {mapBackgroundUrl&&<iframe className="actual-map-frame" title={`${trip.title} ${tripDayLabel(mapDayIndex+1)} 지역 지도`} src={mapBackgroundUrl} loading="lazy" tabIndex={-1}/>} 
                {plottedMovementSegments.length>0&&<svg className="vehicle-route-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{plottedMovementSegments.map((segment,index)=><line key={index} x1={segment.start.x} y1={segment.start.y} x2={segment.end.x} y2={segment.end.y}/>)}</svg>}
                {plottedMapPoints.length>1&&<svg className="visit-order-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points={plottedMapPoints.map(point=>`${point.x},${point.y}`).join(" ")}/></svg>}
                {plottedMapPoints.map((point,i)=>{const key=`${point.point.time}-${i}`,showTime=plottedMapPoints.length<=5||point.point.important||i===0||i===plottedMapPoints.length-1;return <div key={key} className={`pin route-pin${point.point.important?" important":""}${selectedMapPoint===key?" selected":""}`} style={{left:`${point.x}%`,top:`${point.y}%`}}>
                    <button type="button" className="map-marker-dot" aria-label={`${point.point.name} ${point.point.markerText}`} onClick={()=>setSelectedMapPoint(old=>old===key?"":key)}><MapPin/></button>
                    {showTime&&<span className={`marker-time${!point.point.important&&i!==0&&i!==plottedMapPoints.length-1?" secondary-time":""}`}>{point.point.markerText||point.point.name}</span>}
                    {selectedMapPoint===key&&<aside className="marker-detail"><b>{point.point.name}</b><span>{point.point.detailText||"방문시간 정보 없음"}</span></aside>}
                  </div>})}
                <small className="route-note">주황색은 차량 이동 기록, 초록색 점선은 방문 순서입니다. 실제 도로 경로선은 지도 버튼에서 확인하세요.</small>
              </div>
              <footer>
                <button type="button" onClick={()=>beginMap("naver")}>
                  <Map />
                  네이버 지도
                </button>
                <button type="button" onClick={()=>beginMap("google")}>
                  <Map />
                  구글 지도
                </button>
              </footer>
            </article>
          </div>
          <section id="timeline" className="block">
            <div className="sectionhead">
              <div>
                <small>여행 타임라인</small>
                <h2>사진과 이야기</h2>
              </div>
              <p className="timeline-period">{formatTripPeriod(trip.startDate,trip.endDate)}</p>
              <div className="section-actions"><button onClick={()=>setShowNotVisits(true)}>방문 아님 기록 보기{notVisits.length?` (${notVisits.length})`:""}</button><button onClick={() => setEntryForm(true)}><Plus />기록 추가</button></div>
            </div>
            <div className="timeline">
              {entries.length ? (
                entries.map((e) => (
                  <article className="entry" key={e.id}>
                    <time>{e.happenedAt.slice(11, 16)}</time>
                    <i className={e.entryType}>
                      <MapPin />
                    </i>
                    <div>
                      <small>
                        {e.entryType === "meal" ? "식사" : "방문 장소"}
                      </small>
                      <h3>{e.title}</h3>
                      <p>{e.note}</p>
                      <a className="place-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.place)}`} target="_blank">
                        <MapPin />
                        {e.place}
                      </a>
                      {e.id>0&&<div className="record-actions"><button onClick={()=>lookupPlaceName({kind:"travel",entry:e})} disabled={busy}><Search/>장소명 찾기</button><button onClick={()=>setEditing({kind:"travel",entry:e})}><Pencil/>수정</button><button className="delete" onClick={()=>deleteRecord({kind:"travel",entry:e})}><Trash2/>삭제</button></div>}
                      {e.imageUrl && <img src={e.imageUrl} alt={e.title} />}
                    </div>
                  </article>
                ))
              ) : (
                <p className="empty">
                  아직 기록이 없습니다. 첫 여행 이야기를 남겨보세요.
                </p>
              )}
              <TimelineCards records={visibleTimelineRecords} selectedMoves={selectedMoves} setSelectedMoves={setSelectedMoves} openMerge={openMerge} onPreviewPlaces={previewSavedPlaces} onLookup={lookupTimeline} onEdit={record=>{setPlaceSuggestion(null);setEditingTimeline(record)}} onDelete={deleteTimeline} onSplit={setSplittingVisit} onNotVisit={setNotVisitTarget}/>
            </div>
          </section>
          <section id="recommend" className="block">
            <div className="sectionhead">
              <div>
                <small>이 여행에 어울리는 곳</small>
                <h2>맛집과 숙소 추천</h2>
              </div>
            </div>
            <div className="recs">
              {[
                [Utensils, "맛집", "한일옥", "소고기뭇국 · 아침 식사"],
                [Camera, "카페", "미곡창고", "창고형 카페 · 사진 명소"],
                [Hotel, "숙소", "에이본호텔", "주차 편리 · 중심가"],
              ].map(([Icon, type, name, detail]: any) => (
                <article key={name}>
                  <Icon />
                  <small>{type}</small>
                  <h3>{name}</h3>
                  <p>{detail}</p>
                  <a
                    href={`https://map.naver.com/p/search/${encodeURIComponent(trip.location + " " + name)}`}
                    target="_blank"
                  >
                    지도에서 보기 <ChevronRight />
                  </a>
                </article>
              ))}
            </div>
          </section>
          </>}
        </section>
      </div>
      {notice && (
        <button className="toast" onClick={() => setNotice("")}>
          {notice}
          <X />
        </button>
      )}
      {tripForm && (
        <Modal title="새 여행 만들기" close={() => setTripForm(false)}>
          <form action={addTrip}>
            <label>
              여행 이름
              <input name="title" required placeholder="예: 강릉 바다여행" />
            </label>
            <label>
              지역
              <input name="location" required placeholder="예: 강원 강릉" />
            </label>
            <div className="row">
              <label>
                시작일
                <input name="startDate" type="date" required />
              </label>
              <label>
                종료일
                <input name="endDate" type="date" required />
              </label>
            </div>
            <label>
              한 줄 메모
              <textarea name="memo" />
            </label>
            <button className="primary">
              {busy ? "저장 중…" : "여행 저장"}
            </button>
          </form>
        </Modal>
      )}
      {entryForm && (
        <Modal title="여행 기록 추가" close={() => setEntryForm(false)}>
          <form action={addEntry}>
            <input type="hidden" name="tripId" value={sid} />
            <label>
              기록 종류
              <select name="entryType">
                <option value="place">방문 장소</option>
                <option value="meal">식사</option>
                <option value="stay">숙소</option>
              </select>
            </label>
            <label>
              제목
              <input name="title" required />
            </label>
            <label>
              장소
              <input name="place" required />
            </label>
            <label>
              날짜와 시간
              <input name="happenedAt" type="datetime-local" required />
            </label>
            <label>
              여행 이야기
              <textarea name="note" />
            </label>
            <label className="upload">
              <Camera />
              사진 선택
              <input name="photo" type="file" accept="image/*" />
            </label>
            <button className="primary">
              {busy ? "저장 중…" : "기록 저장"}
            </button>
          </form>
        </Modal>
      )}
      {timelineForm && (
        <Modal title="지난 여행을 하나로 묶어 저장하기" close={() => setTimelineForm(false)}>
          <div className="timeline-guide">
            <p><b>평소 기록과 여행을 나누어 저장할 수 있습니다.</b> 평소 다닌 흔적은 일정일기에 날짜별로 쌓고, 여행을 다녀온 기간은 하나의 여행으로 묶어 왼쪽 목록에 남깁니다.</p>
            <ol>
              <li><b>안드로이드:</b> 설정 → 위치 → 위치 서비스 → 타임라인 → 타임라인 데이터 내보내기</li>
              <li><b>저장 위치:</b> 파일 선택 화면에서 <strong>내 파일 → 다운로드</strong>를 선택하세요. 찾기 쉬운 폴더라면 다른 폴더도 괜찮습니다.</li>
              <li><b>아이폰:</b> 구글 지도 → 프로필 → 설정 → 위치 및 개인정보 보호 → 타임라인 데이터 내보내기</li>
              <li><b>저장 위치:</b> 공유 화면에서 <strong>파일에 저장 → 나의 iPhone → 다운로드</strong>를 선택하세요. iCloud Drive의 다운로드 폴더도 사용할 수 있습니다.</li>
              <li>이 앱으로 돌아와 아래의 <b>타임라인 JSON 파일 선택</b>을 누르고, 방금 저장한 다운로드 폴더의 파일을 선택하세요.</li>
            </ol>
          </div>
          <form action={importTimeline}>
            <label>여행으로 묶을 때 사용할 제목<input name="title" placeholder="예: 군산 시간여행" /></label>
            <label>여행으로 묶을 때 사용할 지역<input name="location" placeholder="예: 전북 군산" /></label>
            <div className="row">
              <label>가져올 시작일<input name="fromDate" type="date" required /></label>
              <label>가져올 종료일<input name="toDate" type="date" required /></label>
            </div>
            <label className="upload timeline-upload"><Upload />최신 타임라인 파일 선택<input name="timeline" type="file" required /></label>
            <p className="privacy-note">파일 내용은 여행 일정을 만드는 용도로만 처리되며, 원본 파일은 별도로 보관하지 않습니다.</p>
            <div className="import-actions">
              <button className="diary-button" name="mode" value="diary" disabled={busy}><CalendarDays />{busy ? "저장 중…" : "일정일기에 날짜별 저장"}</button>
              <button className="primary" name="mode" value="trip" disabled={busy}>{busy ? "저장 중…" : "여행으로 묶어 저장"}</button>
            </div>
          </form>
        </Modal>
      )}
      {editing&&<Modal title="방문 기록 수정" close={()=>setEditing(null)}><form action={updateRecord}><label>장소 이름<input name="title" defaultValue={editing.entry.title} required placeholder="예: 이성당 본점" /></label><label>지도에서 찾을 장소 또는 주소<input name="place" defaultValue={editing.entry.place} required /></label><label>방문 날짜와 시간<input name="happenedAt" type="datetime-local" defaultValue={editing.entry.happenedAt.slice(0,16)} required /></label><label>메모<textarea name="note" defaultValue={editing.entry.note}/></label><p className="privacy-note">장소 이름이 없으면 좌표를 눌러 지도에서 확인한 뒤 이름을 입력하세요.</p><button className="primary" disabled={busy}>{busy?"저장 중…":"수정 내용 저장"}</button></form></Modal>}
      {editingTimeline&&<TimelineEditModal record={editingTimeline} suggestion={placeSuggestion} close={()=>{setEditingTimeline(null);setPlaceSuggestion(null)}} save={saveTimeline} busy={busy}/>}
      {placePreview&&<PlaceApplyModal changes={placePreview} close={()=>setPlacePreview(null)} apply={applySavedPlaces} busy={busy}/>}
      {placeFinder&&<PlaceFinderModal finder={placeFinder} records={timelineRecords} setFinder={setPlaceFinder} search={query=>searchNearby(placeFinder.record,query)} confirm={confirmFoundPlace} copy={copyCoordinates} close={()=>setPlaceFinder(null)} busy={busy}/>}
      {mergePreview&&<MergeModal records={mergePreview} close={()=>setMergePreview(null)} save={mergeMoves} busy={busy}/>}
      {splittingVisit&&<SplitVisitModal record={splittingVisit} close={()=>setSplittingVisit(null)} save={splitVisit} busy={busy}/>}
      {notVisitTarget&&<NotVisitModal record={notVisitTarget} close={()=>setNotVisitTarget(null)} save={markNotVisit} busy={busy}/>}
      {showNotVisits&&<NotVisitListModal records={notVisits} close={()=>setShowNotVisits(false)}/>}
      {mapPicker&&<MapRouteModal picker={mapPicker} days={mapDays} close={()=>setMapPicker(null)} chooseDay={day=>openRoute(mapPicker.provider,day)}/>}
      {lastMergeToken&&<button className="undo-toast" onClick={undoMerge} disabled={busy}>방금 합친 기록 되돌리기</button>}
      {lastSplitToken&&<button className="undo-toast" onClick={undoSplit} disabled={busy}>방금 나눈 기록 되돌리기</button>}
    </main>
  );
}
function durationText(start:string,end:string|null){if(!end)return "도착시간 없음";const mins=Math.max(0,Math.round((new Date(end).getTime()-new Date(start).getTime())/60000));return mins>=60?`${Math.floor(mins/60)}시간 ${mins%60}분`:`${mins}분`}
function coordinate(lat:string|null,lng:string|null){return lat&&lng?`${lat}, ${lng}`:"좌표 없음"}
function tripDayNumber(firstDate:string,date:string){const [fy,fm,fd]=firstDate.split("-").map(Number),[y,m,d]=date.split("-").map(Number);return Math.round((Date.UTC(y,m-1,d)-Date.UTC(fy,fm-1,fd))/86400000)+1}
function tripDayLabel(day:number){return day===1?"첫째 날":day===2?"둘째 날":day===3?"셋째 날":`${day}일째`}
function koreanWeekday(date:string){const[y,m,d]=date.split("-").map(Number);return ["일","월","화","수","목","금","토"][new Date(Date.UTC(y,m-1,d)).getUTCDay()]}
function formatKoreanDate(date:string){const[y,m,d]=date.split("-").map(Number);return `${y}.${String(m).padStart(2,"0")}.${String(d).padStart(2,"0")}(${koreanWeekday(date)})`}
function formatTimelineDate(date:string){const[,month,day]=date.split("-").map(Number);return `${month}월 ${day}일 (${koreanWeekday(date)})`}
function formatTripPeriod(start:string,end:string){const[sy,sm,sd]=start.split("-").map(Number),[ey,em,ed]=end.split("-").map(Number),days=Math.max(1,Math.round((Date.UTC(ey,em-1,ed)-Date.UTC(sy,sm-1,sd))/86400000)+1),startText=formatKoreanDate(start);return days===1?`${startText} · 당일 여행`:`${startText} ~ ${formatKoreanDate(end)} · ${days-1}박 ${days}일`}
function TimelineDayMarker({date,firstDate}:{date:string;firstDate:string}){const number=tripDayNumber(firstDate,date);return <div className="timeline-day-marker"><strong>{tripDayLabel(number)}</strong><span>{formatTimelineDate(date)}</span></div>}
function dateRange(from:string,to:string){const dates:string[]=[];for(let cursor=from;cursor<=to;){dates.push(cursor);const[y,m,d]=cursor.split("-").map(Number),next=new Date(Date.UTC(y,m-1,d+1));cursor=next.toISOString().slice(0,10)}return dates}
function clock(value:string|null|undefined){return value?.includes("T")?value.slice(11,16):""}
function validMapPoint(latValue:string|null,lngValue:string|null,name:string|null,time:string,details:Pick<MapPoint,"arrivalTime"|"departureTime"|"markerText"|"detailText"|"important">):MapPoint|null{const lat=Number(latValue),lng=Number(lngValue);return !!latValue?.trim()&&!!lngValue?.trim()&&Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=-90&&lat<=90&&lng>=-180&&lng<=180?{lat,lng,name:name?.trim()||`${lat}, ${lng}`,time,...details}:null}
function mapDistance(lat1:number,lng1:number,lat2:number,lng2:number){const toRad=(value:number)=>value*Math.PI/180,dLat=toRad(lat2-lat1),dLng=toRad(lng2-lng1),value=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;return 6371000*2*Math.atan2(Math.sqrt(value),Math.sqrt(1-value))}
function sameMapPoint(a:MapPoint,b:MapPoint){const distance=mapDistance(a.lat,a.lng,b.lat,b.lng);return distance<=15||(a.name===b.name&&distance<=50)}
function buildMapBounds(points:MapCoordinate[]):MapBounds|null{if(!points.length)return null;const minLat=Math.min(...points.map(point=>point.lat)),maxLat=Math.max(...points.map(point=>point.lat)),minLng=Math.min(...points.map(point=>point.lng)),maxLng=Math.max(...points.map(point=>point.lng)),latPadding=Math.max((maxLat-minLat)*.16,.003),lngPadding=Math.max((maxLng-minLng)*.16,.004);return{minLat:minLat-latPadding,maxLat:maxLat+latPadding,minLng:minLng-lngPadding,maxLng:maxLng+lngPadding}}
function mapPosition(point:MapCoordinate,bounds:MapBounds|null){if(!bounds)return{x:50,y:50};const latRange=bounds.maxLat-bounds.minLat||1,lngRange=bounds.maxLng-bounds.minLng||1;return{x:(point.lng-bounds.minLng)/lngRange*100,y:(bounds.maxLat-point.lat)/latRange*100}}
function plotMapPoints(points:MapPoint[],bounds:MapBounds|null){return points.map(point=>({point,...mapPosition(point,bounds)}))}
function openStreetMapEmbedUrl(bounds:MapBounds|null){if(!bounds)return"";const bbox=[bounds.minLng,bounds.minLat,bounds.maxLng,bounds.maxLat].map(value=>value.toFixed(6)).join(",");return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik`}
function buildMovementSegments(date:string,records:TimelineRecord[]):MovementSegment[]{return records.filter(record=>record.recordType==="activity"&&record.startTime.slice(0,10)===date).flatMap(record=>{if(!record.startLat?.trim()||!record.startLng?.trim()||!record.endLat?.trim()||!record.endLng?.trim())return[];const startLat=Number(record.startLat),startLng=Number(record.startLng),endLat=Number(record.endLat),endLng=Number(record.endLng),valid=[startLat,endLat].every(value=>Number.isFinite(value)&&value>=-90&&value<=90)&&[startLng,endLng].every(value=>Number.isFinite(value)&&value>=-180&&value<=180);return valid?[{start:{lat:startLat,lng:startLng},end:{lat:endLat,lng:endLng}}]:[]})}
function buildMapDays(trip:Trip,records:TimelineRecord[]):MapDay[]{const dates=dateRange(trip.startDate,trip.endDate),visits=[...records].filter(record=>record.recordType==="visit").sort((a,b)=>a.startTime.localeCompare(b.startTime));return dates.map(date=>{const points:MapPoint[]=[];for(const record of visits){const startDate=record.startTime.slice(0,10),endDate=record.endTime?.slice(0,10),arrival=clock(record.startTime),departure=clock(record.endTime),name=resolvedMapPlaceName(record);if(startDate===date){const crossesDate=!!endDate&&endDate>date,markerText=arrival?crossesDate?`${arrival} 도착`:arrival:name,detailText=arrival?`도착 ${arrival}${departure?` · 출발 ${crossesDate?"다음 날 ":""}${departure}`:""}`:"";const point=validMapPoint(record.startLat,record.startLng,name,record.startTime,{arrivalTime:arrival,departureTime:departure,markerText,detailText,important:crossesDate});if(point)points.push(point)}else if(startDate<date&&!!endDate&&endDate===date){const markerText=departure?`${departure} 출발`:name,detailText=`${arrival?`도착 전날 ${arrival}`:""}${arrival&&departure?" · ":""}${departure?`출발 ${departure}`:""}`;const point=validMapPoint(record.startLat,record.startLng,name,`${date}T00:00:00`,{arrivalTime:arrival,departureTime:departure,markerText,detailText,important:true});if(point)points.push(point)}}const deduplicated=points.sort((a,b)=>a.time.localeCompare(b.time)).filter((point,index,list)=>index===0||!sameMapPoint(point,list[index-1]));return{date,points:deduplicated}})}
function isMobileDevice(){return typeof navigator!=="undefined"&&/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)}
function MapRouteModal({picker,days,close,chooseDay}:{picker:MapPicker;days:MapDay[];close:()=>void;chooseDay:(date:string)=>void}){const title=picker.provider==="google"?"구글 지도에서 하루 동선 보기":"네이버 지도에서 하루 동선 보기";return <Modal title={title} close={close}><div className="map-route-picker">{picker.fallbackUrl?<><p>팝업 또는 지도 앱을 열지 못했습니다. 아래 링크를 눌러 웹 지도를 열어주세요.</p><a href={picker.fallbackUrl} target="_blank" rel="noreferrer">하루 전체 동선 웹 지도 열기</a></>:<><p>확인할 날짜를 선택하면 그날의 모든 방문 장소와 동선이 한 번에 표시됩니다.</p>{picker.provider==="google"&&<p className="map-provider-note">구글 지도에서는 국내 자동차 경로가 표시되지 않을 수 있습니다.</p>}{days.map((day,index)=><button key={day.date} type="button" onClick={()=>chooseDay(day.date)}><b>{tripDayLabel(index+1)} 전체 동선</b><span>{Number(day.date.slice(5,7))}월 {Number(day.date.slice(8,10))}일 · 방문 장소 {day.points.length}곳</span></button>)}</>}</div></Modal>}
type TimelineActions={selectedMoves:number[];setSelectedMoves:(value:number[]|((old:number[])=>number[]))=>void;openMerge:()=>void;onPreviewPlaces:()=>void;onLookup:(r:TimelineRecord)=>void;onEdit:(r:TimelineRecord)=>void;onDelete:(r:TimelineRecord)=>void;onSplit:(r:TimelineRecord)=>void;onNotVisit:(r:TimelineRecord)=>void};
function TimelineCards({records,selectedMoves,setSelectedMoves,openMerge,onPreviewPlaces,onLookup,onEdit,onDelete,onSplit,onNotVisit}: {records:TimelineRecord[]}&TimelineActions){
  const [dayFilter,setDayFilter]=useState("all");
  const ordered=[...records].sort((a,b)=>a.startTime.localeCompare(b.startTime));
  const dates=[...new Set(ordered.map(record=>record.startTime.slice(0,10)))];
  const firstDate=ordered[0]?.startTime.slice(0,10)||"";
  useEffect(()=>{if(dayFilter!=="all"&&!dates.includes(dayFilter))setDayFilter("all")},[dayFilter,dates.join("|")]);
  if(!ordered.length)return null;
  const displayed=dayFilter==="all"?ordered:ordered.filter(record=>record.startTime.slice(0,10)===dayFilter);
  return <div className="imported-records">
    {dates.length>1&&<nav className="timeline-day-filter" aria-label="여행 날짜별 기록 필터">
      <button type="button" className={dayFilter==="all"?"active":""} aria-pressed={dayFilter==="all"} onClick={()=>setDayFilter("all")}>전체</button>
      {dates.map(date=><button type="button" key={date} className={dayFilter===date?"active":""} aria-pressed={dayFilter===date} onClick={()=>setDayFilter(date)}><b>{tripDayLabel(tripDayNumber(firstDate,date))}</b><span>{formatTimelineDate(date)}</span></button>)}
    </nav>}
    <div className="merge-bar"><span>이동 기록의 선택칸을 눌러 합칠 기록만 고르세요.</span><button onClick={onPreviewPlaces}>저장 장소 적용</button><button onClick={openMerge} disabled={selectedMoves.length<2}>선택한 이동 {selectedMoves.length}개 합치기</button></div>
    {displayed.map((r,index)=>{const date=r.startTime.slice(0,10),previousDate=index?displayed[index-1].startTime.slice(0,10):"",newDay=index>0&&date!==previousDate;return <Fragment key={`timeline-${r.id}`}>{newDay&&<div className="timeline-date-boundary"><TimelineDayMarker date={date} firstDate={firstDate}/><div className="midnight-time">00:00</div><span aria-hidden="true"/></div>}<article className={`timeline-record ${r.recordType}`}><div className="day-marker-slot">{index===0&&<TimelineDayMarker date={date} firstDate={firstDate}/>}</div><div className="record-time"><b>{r.startTime.slice(11,16)}</b><span>~ {r.endTime?.slice(11,16)||"--:--"}</span></div><div className="record-body">{r.recordType==="activity"&&<label className="move-check"><input type="checkbox" checked={selectedMoves.includes(r.id)} onChange={e=>setSelectedMoves(old=>e.target.checked?[...old,r.id]:old.filter(id=>id!==r.id))}/><Car/>합칠 이동 선택</label>}<small>{r.recordType==="activity"?"이동 기록":"방문 기록"}</small><h3 className={r.title==="장소명 입력 필요"?"missing-place":""}>{r.title}</h3>{r.recordType==="activity"?<div className="movement-detail"><p><b>이동수단</b> {r.transportType||r.originalTransportType||"알 수 없음"}</p><p><b>출발</b> {r.startPlace||"출발지 입력 필요"}</p><p><b>도착</b> {r.endPlace||"도착지 입력 필요"}</p><p><b>이동시간</b> {durationText(r.startTime,r.endTime)} · <b>거리</b> {r.distanceMeters!=null?`${(r.distanceMeters/1000).toFixed(2)}km`:"알 수 없음"}</p><p><b>출발 좌표</b> {coordinate(r.startLat,r.startLng)}</p><p><b>도착 좌표</b> {coordinate(r.endLat,r.endLng)}</p></div>:<><p>{r.note}</p><p><b>방문시간</b> {r.startTime.replace("T"," ").slice(0,16)} ~ {r.endTime?.replace("T"," ").slice(0,16)||"알 수 없음"}</p><p><b>좌표</b> {coordinate(r.startLat,r.startLng)}</p></>}<div className="record-actions">{r.recordType==="visit"&&<><button onClick={()=>onLookup(r)}><Search/>장소명 찾기</button><button onClick={()=>r.endTime?onSplit(r):alert("끝 시간이 있는 방문 기록만 나눌 수 있습니다.")}><Scissors/>나누기</button><button onClick={()=>onNotVisit(r)}>방문 아님</button></>}<button onClick={()=>onEdit(r)}><Pencil/>수정</button><button className="delete" onClick={()=>onDelete(r)}><Trash2/>삭제</button></div></div></article></Fragment>})}
  </div>
}
function NotVisitModal({record,close,save,busy}:{record:TimelineRecord;close:()=>void;save:(reason:string,detail:string)=>void;busy:boolean}){
  const[reason,setReason]=useState(""),[detail,setDetail]=useState("");
  return <Modal title="방문 아님으로 처리" close={close}><div className="not-visit-confirm"><div className="not-visit-summary"><b>{record.title}</b><span>{record.startTime.replace("T"," ").slice(0,16)} ~ {record.endTime?.replace("T"," ").slice(0,16)||"알 수 없음"}</span><span>{coordinate(record.startLat,record.startLng)}</span></div><label>사유 (선택사항)<select value={reason} onChange={event=>setReason(event.target.value)}><option value="">사유를 선택하지 않음</option><option>이동 중 잠시 정차</option><option>길 확인</option><option>전화 통화</option><option>교통 정체·신호대기</option><option>기타</option></select></label>{reason==="기타"&&<label>기타 사유<input value={detail} onChange={event=>setDetail(event.target.value)} placeholder="사유를 직접 입력하세요" autoFocus/></label>}<p>원본 방문 기록은 변경하지 않고 별도로 보관합니다.</p><div className="modal-actions"><button type="button" onClick={close}>취소</button><button type="button" className="primary" disabled={busy||(reason==="기타"&&!detail.trim())} onClick={()=>save(reason,detail)}>{busy?"처리 중…":"방문 아님으로 처리"}</button></div></div></Modal>
}
function NotVisitListModal({records,close}:{records:NotVisitRecord[];close:()=>void}){return <Modal title="방문 아님 기록 보기" close={close}><div className="not-visit-list">{records.length?records.map(record=><article key={record.id}><div><b>{record.title}</b><span>{record.startTime.replace("T"," ").slice(0,16)} ~ {record.endTime?.replace("T"," ").slice(0,16)||"알 수 없음"}</span></div><p><strong>사유</strong> {record.reason==="기타"?record.reasonDetail||"기타":record.reason||"선택하지 않음"}</p><small>{coordinate(record.startLat,record.startLng)}</small></article>):<p className="empty">방문 아님으로 처리한 기록이 없습니다.</p>}</div></Modal>}
function TimelineEditModal({record,suggestion,close,save,busy}:{record:TimelineRecord;suggestion:{address:string}|null;close:()=>void;save:(f:FormData)=>void;busy:boolean}){const activity=record.recordType==="activity";return <Modal title={activity?"이동 기록 수정":"방문 기록 수정"} close={close}><form action={save}><label>{activity?"이동 기록 이름":"확정 장소명"}<input name="title" defaultValue={record.title} required placeholder="좌표가 아닌 장소명을 입력하세요"/></label>{activity&&<label>이동수단<input name="transportType" defaultValue={record.transportType||record.originalTransportType||""} required/></label>}<div className="row"><label>{activity?"출발시간":"방문 시작"}<input name="startTime" type="datetime-local" defaultValue={record.startTime.slice(0,16)} required/></label><label>{activity?"도착시간":"방문 종료"}<input name="endTime" type="datetime-local" defaultValue={record.endTime?.slice(0,16)||""}/></label></div><label>{activity?"출발지":"주소"}<input name="startPlace" defaultValue={activity?record.startPlace||"":record.title}/></label>{!activity&&<input name="address" defaultValue={suggestion?.address||record.startPlace||""} aria-label="확정 주소" placeholder="주소를 직접 입력할 수 있습니다"/>}{activity&&<label>도착지<input name="endPlace" defaultValue={record.endPlace||""}/></label>}{activity&&<label>이동거리(미터)<input name="distanceMeters" type="number" min="0" step="1" defaultValue={record.distanceMeters??0}/></label>}<div className="row"><label>출발 위도<input name="startLat" defaultValue={record.startLat||""} readOnly={!activity}/></label><label>출발 경도<input name="startLng" defaultValue={record.startLng||""} readOnly={!activity}/></label></div>{activity&&<div className="row"><label>도착 위도<input name="endLat" defaultValue={record.endLat||""}/></label><label>도착 경도<input name="endLng" defaultValue={record.endLng||""}/></label></div>}{!activity&&<><label>같은 장소로 인식할 반경(미터)<input name="radiusMeters" type="number" min="1" max="500" defaultValue="15"/></label><label className="merge-confirm"><input name="confirmPlace" type="checkbox" defaultChecked/>이 장소명을 확정하여 다음 여행에도 자동 적용</label></>}<label>메모<textarea name="note" defaultValue={record.note}/></label><button className="primary" disabled={busy}>{busy?"저장 중…":"확인하고 저장"}</button></form></Modal>}
function PlaceApplyModal({changes,close,apply,busy}:{changes:PlaceChange[];close:()=>void;apply:()=>void;busy:boolean}){const certain=changes.filter(change=>change.after&&!change.ambiguous);return <Modal title="저장 장소 적용 미리보기" close={close}><div className="place-apply-preview">{!changes.length?<p>자동으로 적용할 새 저장 장소가 없습니다.</p>:<>{changes.map((change,index)=><div key={`${change.id}-${index}`}><b>{change.before}</b>{change.ambiguous?<span>가까운 후보가 비슷해 자동 선택하지 않음: {change.candidates?.map(candidate=>`${candidate.name} (${candidate.distanceMeters}m)`).join(", ")}</span>:<span>→ {change.after} · 약 {change.distanceMeters}m</span>}</div>)}<p>직접 입력해 확정한 기존 장소명은 바꾸지 않습니다.</p></>}<div className="modal-actions"><button type="button" onClick={close}>취소</button>{certain.length>0&&<button className="primary" type="button" onClick={apply} disabled={busy}>{busy?"적용 중…":`${certain.length}개 변경 적용`}</button>}</div></div></Modal>}
function PlaceFinderModal({finder,records,setFinder,search,confirm,copy,close,busy}:{finder:PlaceFinder;records:TimelineRecord[];setFinder:(value:PlaceFinder|null)=>void;search:(query:string)=>void;confirm:(value:{name:string;address:string;radiusMeters:number;scope:"record"|"day"|"favorite"})=>void;copy:()=>void;close:()=>void;busy:boolean}){
  const [query,setQuery]=useState(finder.query),[name,setName]=useState(""),[address,setAddress]=useState(""),[radius,setRadius]=useState(15),[scope,setScope]=useState<"record"|"day"|"favorite">("record");
  const coordinates=`${finder.record.startLat}, ${finder.record.startLng}`,nearby=records.filter(item=>item.id!==finder.record.id&&item.tripId===finder.record.tripId&&item.recordType==="visit"&&item.entryDate===finder.record.entryDate&&item.placeNameSource!=="manual"&&item.placeNameSource!=="same_day"&&item.startLat&&item.startLng&&mapDistance(Number(finder.record.startLat),Number(finder.record.startLng),Number(item.startLat),Number(item.startLng))<=radius);
  function choose(candidate:NearbyPlace){setFinder({...finder,selected:candidate.id,direct:false});setName(candidate.name);setAddress(candidate.address)}
  function direct(){setFinder({...finder,selected:"",direct:true});setName(finder.record.placeNameSource==="manual"?finder.record.title:"");setAddress("")}
  function useSearchedName(){const value=query.trim();if(!value)return;setFinder({...finder,query:value,selected:"",direct:true,status:"확정 장소명에 입력했습니다. 적용 범위를 선택한 뒤 이 장소로 확정해 주세요."});setName(value);setTimeout(()=>document.getElementById("confirmed-place-name")?.focus(),0)}
  return <Modal title="주변 장소에서 장소명 찾기" close={close}><div className="place-finder">
    <div className="coordinate-copy"><input id="place-coordinate-copy" value={coordinates} readOnly aria-label="현재 방문 좌표"/><button type="button" onClick={copy}>좌표 복사</button></div>
    <div className="external-place-links"><a href={`https://map.naver.com/p/search/${encodeURIComponent(coordinates)}`} target="_blank" rel="noreferrer">네이버 지도에서 좌표 찾기</a><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coordinates)}`} target="_blank" rel="noreferrer">구글 지도에서 좌표 찾기</a></div>
    <form className="place-search-form" onSubmit={event=>{event.preventDefault();search(query)}}><label>장소명 검색<input value={query} onChange={event=>setQuery(event.target.value)} placeholder="예: 카페 이름"/></label><button type="submit" disabled={busy}><Search/>{busy?"찾는 중…":"검색"}</button></form>
    {finder.status&&<p className={`place-finder-status ${finder.direct?"attention":""}`} role="status" aria-live="polite">{finder.status}</p>}
    {!!finder.candidates.length&&<div className="place-candidate-list" role="listbox" aria-label="주변 장소 후보">{finder.candidates.map(candidate=><button type="button" role="option" aria-selected={finder.selected===candidate.id} className={finder.selected===candidate.id?"selected":""} key={candidate.id} onClick={()=>choose(candidate)}><b>{candidate.name}</b><span>{candidate.category} · 약 {candidate.distanceMeters}m</span><small>{candidate.address}</small></button>)}</div>}
    {finder.direct&&!!finder.query.trim()&&<button type="button" className="use-search-name" onClick={useSearchedName}>입력한 이름을 확정 장소명에 넣기</button>}
    <button type="button" className="direct-place" onClick={direct}>원하는 장소가 없어요 · 직접 입력</button>
    {(finder.direct||!!finder.selected)&&<div className="place-confirm-fields"><label>확정 장소명<input id="confirmed-place-name" value={name} onChange={event=>setName(event.target.value)} placeholder="좌표가 아닌 장소명을 입력하세요"/></label><label>주소<input value={address} onChange={event=>setAddress(event.target.value)} placeholder="주소를 직접 입력할 수 있습니다"/></label><label>같은 장소 인식 반경(미터)<input type="number" min="1" max="500" value={radius} onChange={event=>setRadius(Math.min(500,Math.max(1,Number(event.target.value)||15)))}/></label>
      <fieldset><legend>적용 범위</legend><label><input type="radio" checked={scope==="record"} onChange={()=>setScope("record")}/>이 기록에만 적용</label><label><input type="radio" checked={scope==="day"} onChange={()=>setScope("day")}/>같은 날짜의 같은 위치 기록에 모두 적용</label><label><input type="radio" checked={scope==="favorite"} onChange={()=>setScope("favorite")}/>앞으로도 단골 장소로 기억</label></fieldset>
      {scope!=="record"&&<div className="same-place-preview"><b>적용 미리보기</b><p>현재 기록과 같은 날짜·반경 안의 기록 {nearby.length}개에 적용됩니다.</p>{nearby.map(item=><span key={item.id}>{item.startTime.slice(11,16)} · {item.title}</span>)}<small>이미 다른 이름으로 직접 확정한 기록은 제외했습니다.</small></div>}
      <button className="primary" type="button" disabled={busy||!name.trim()} onClick={()=>confirm({name,address,radiusMeters:radius,scope})}>{busy?"안전하게 저장 중…":"이 장소로 확정"}</button></div>}
  </div></Modal>
}
function localDateTime(value:number){const d=new Date(value),p=(n:number)=>String(n).padStart(2,"0");return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`}
function SplitVisitModal({record,close,save,busy}:{record:TimelineRecord;close:()=>void;save:(f:FormData)=>void;busy:boolean}){
  const end=record.endTime||record.startTime,mid=localDateTime((new Date(record.startTime).getTime()+new Date(end).getTime())/2);
  const [splitTime,setSplitTime]=useState(mid),[firstTitle,setFirstTitle]=useState(record.title),[secondTitle,setSecondTitle]=useState("장소명 입력 필요"),[firstPlace,setFirstPlace]=useState(record.startPlace||record.title),[secondPlace,setSecondPlace]=useState(record.startPlace||""),[firstLat,setFirstLat]=useState(record.startLat||""),[firstLng,setFirstLng]=useState(record.startLng||""),[secondLat,setSecondLat]=useState(record.startLat||""),[secondLng,setSecondLng]=useState(record.startLng||""),[finding,setFinding]=useState<"first"|"second"|"">(""),[found,setFound]=useState("");
  async function findPlace(which:"first"|"second"){const lat=which==="first"?firstLat:secondLat,lng=which==="first"?firstLng:secondLng;if(!lat||!lng){setFound("먼저 위도와 경도를 입력해주세요.");return}setFinding(which);setFound("");try{const r=await fetch(`/api/geocode?location=${encodeURIComponent(`${lat},${lng}`)}`),d=await r.json();if(!r.ok)throw new Error(d.error);if(which==="first"){setFirstTitle(d.name);setFirstPlace(d.name)}else{setSecondTitle(d.name);setSecondPlace(d.name)}setFound(`후보 장소명 ‘${d.name}’을 찾았습니다. 맞는지 확인하거나 직접 고쳐주세요.`)}catch(e){setFound(e instanceof Error?e.message:"장소명을 찾지 못했습니다.")}setFinding("")}
  return <Modal title="방문 기록 나누기" close={close}><form action={save}>
    <p className="privacy-note">두 장소의 이름과 나눌 시간을 입력하세요. 저장 전 결과를 아래에서 확인할 수 있습니다.</p>
    <section className="split-place"><b>첫 번째 장소</b><label>장소 이름<input name="firstTitle" value={firstTitle} onChange={e=>setFirstTitle(e.target.value)} required/></label><label>장소 또는 주소<input name="firstPlace" value={firstPlace} onChange={e=>setFirstPlace(e.target.value)}/></label><div className="row"><label>위도<input name="firstLat" value={firstLat} onChange={e=>setFirstLat(e.target.value)}/></label><label>경도<input name="firstLng" value={firstLng} onChange={e=>setFirstLng(e.target.value)}/></label></div><button type="button" className="place-search" onClick={()=>findPlace("first")} disabled={!!finding}><Search/>{finding==="first"?"찾는 중…":"첫 번째 위치로 장소명 찾기"}</button><label>메모<textarea name="firstNote" defaultValue={record.note}/></label></section>
    <label>두 번째 장소로 이동한 시간<input name="splitTime" type="datetime-local" min={record.startTime.slice(0,16)} max={end.slice(0,16)} value={splitTime} onChange={e=>setSplitTime(e.target.value)} required/></label>
    <section className="split-place second"><b>두 번째 장소</b><label>장소 이름<input name="secondTitle" value={secondTitle} onChange={e=>setSecondTitle(e.target.value)} required/></label><label>장소 또는 주소<input name="secondPlace" value={secondPlace} onChange={e=>setSecondPlace(e.target.value)}/></label><div className="row"><label>위도<input name="secondLat" value={secondLat} onChange={e=>setSecondLat(e.target.value)}/></label><label>경도<input name="secondLng" value={secondLng} onChange={e=>setSecondLng(e.target.value)}/></label></div><button type="button" className="place-search" onClick={()=>findPlace("second")} disabled={!!finding}><Search/>{finding==="second"?"찾는 중…":"두 번째 위치로 장소명 찾기"}</button><label>메모<textarea name="secondNote" defaultValue={record.note}/></label></section>
    {found&&<p className="split-message">{found}</p>}
    <div className="merge-preview split-preview"><b>나누기 결과 미리보기</b><p><strong>{firstTitle||"첫 번째 장소"}</strong> · {record.startTime.slice(0,16).replace("T"," ")} ~ {splitTime.replace("T"," ")} · {coordinate(firstLat,firstLng)}</p><p><strong>{secondTitle||"두 번째 장소"}</strong> · {splitTime.replace("T"," ")} ~ {end.slice(0,16).replace("T"," ")} · {coordinate(secondLat,secondLng)}</p></div>
    <label className="merge-confirm"><input type="checkbox" required/>이 작업을 실행하면 원래 방문 기록 하나가 두 개의 방문 기록으로 바뀝니다.</label><button className="primary" disabled={busy}>{busy?"안전하게 나누는 중…":"확인하고 두 장소로 나누기"}</button>
  </form></Modal>
}
function MergeModal({records,close,save,busy}:{records:TimelineRecord[];close:()=>void;save:(f:FormData)=>void;busy:boolean}){const first=records[0],last=records[records.length-1],distance=records.reduce((sum,r)=>sum+(r.distanceMeters||0),0),types=[...new Set(records.map(r=>r.transportType||r.originalTransportType))],far=new Date(last.startTime).getTime()-new Date(first.endTime||first.startTime).getTime()>6*60*60*1000;return <Modal title="이동 기록 합치기" close={close}><div className="merge-preview"><b>선택한 {records.length}개 기록</b>{records.map(r=><p key={r.id}>{r.startTime.slice(0,16).replace("T"," ")} ~ {r.endTime?.slice(11,16)} · {r.transportType} · {r.distanceMeters||0}m</p>)}{(types.length>1||far)&&<p className="merge-warning">⚠ {types.length>1?"이동수단이 서로 다른 기록이 있습니다. ":""}{far?"시간 간격이 6시간보다 큰 기록이 있습니다.":""} 정말 합칠지 확인해주세요.</p>}</div><form action={save}><label>이동수단<input name="transportType" defaultValue={first.transportType||first.originalTransportType||"자동차"} required/></label><div className="row"><label>출발시간<input name="startTime" type="datetime-local" defaultValue={first.startTime.slice(0,16)} required/></label><label>도착시간<input name="endTime" type="datetime-local" defaultValue={(last.endTime||last.startTime).slice(0,16)} required/></label></div><p className="calculated-time">합친 시간은 저장 후 입력한 출발·도착시간으로 자동 계산됩니다.</p><label>이동거리(미터)<input name="distanceMeters" type="number" min="0" step="1" defaultValue={distance} required/></label><label>메모<textarea name="note" defaultValue={`${records.length}개의 이동 기록을 합침`}/></label><label className="merge-confirm"><input type="checkbox" required/>이 작업을 실행하면 선택한 기록들이 하나의 기록으로 바뀍니다.</label><button className="primary" disabled={busy}>{busy?"안전하게 합치는 중…":"확인하고 합치기"}</button></form></Modal>}
function monthRange(month:string){const[y,m]=month.split("-").map(Number),last=new Date(y,m,0).getDate();return [`${month}-01`,`${month}-${String(last).padStart(2,"0")}`]}
function shiftMonth(month:string,amount:number){const[y,m]=month.split("-").map(Number),d=new Date(y,m-1+amount,1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`}
function CalendarView({month,setMonth,selectedDate,setSelectedDate,entries,timelineRecords,trips,selectedTrip,openImport,onLookup,onEdit,onDelete,timelineActions}:{month:string;setMonth:(v:string)=>void;selectedDate:string;setSelectedDate:(v:string)=>void;entries:DailyEntry[];timelineRecords:TimelineRecord[];trips:Trip[];selectedTrip:Trip;openImport:()=>void;onLookup:(e:DailyEntry)=>void;onEdit:(e:DailyEntry)=>void;onDelete:(e:DailyEntry)=>void;timelineActions:TimelineActions}){
  const[y,m]=month.split("-").map(Number),firstDay=new Date(y,m-1,1).getDay(),lastDay=new Date(y,m,0).getDate(),cells=Array.from({length:42},(_,i)=>{const day=i-firstDay+1;return day>0&&day<=lastDay?`${month}-${String(day).padStart(2,"0")}`:""}),dayEntries=entries.filter(e=>e.entryDate===selectedDate),dayTrips=trips.filter(t=>t.startDate<=selectedDate&&t.endDate>=selectedDate),tripTimeline=timelineRecords.filter(record=>record.tripId===selectedTrip.id);
  return <div className="calendar-view">
    <div className="calendar-title"><div><small>선택한 여행 일정</small><h1>{selectedTrip.title}</h1><p>{formatTripPeriod(selectedTrip.startDate,selectedTrip.endDate)} · {selectedTrip.location}</p></div><button className="primary" onClick={openImport}><Upload/>타임라인 가져오기</button></div>
    <div className="calendar-layout"><section className="calendar-card"><div className="month-head"><button aria-label="이전 달" onClick={()=>setMonth(shiftMonth(month,-1))}><ChevronLeft/></button><h2>{y}년 {m}월</h2><button aria-label="다음 달" onClick={()=>setMonth(shiftMonth(month,1))}><ChevronRight/></button></div><div className="weekdays">{["일","월","화","수","목","금","토"].map(d=><b key={d}>{d}</b>)}</div><div className="month-grid">{cells.map((date,i)=>{if(!date)return <span key={`blank-${i}`}/>;const inTrip=date>=selectedTrip.startDate&&date<=selectedTrip.endDate,isStart=date===selectedTrip.startDate||i%7===0,isEnd=date===selectedTrip.endDate||i%7===6,recordCount=tripTimeline.filter(record=>record.entryDate===date).length;return <button key={date} className={`${date===selectedDate?"chosen ":""}${inTrip?"trip-range-day":""}`} onClick={()=>setSelectedDate(date)} aria-label={`${date}${inTrip?` ${selectedTrip.title}`:""}`}><span>{Number(date.slice(-2))}</span>{inTrip&&<em className={`${isStart?"trip-range-start ":""}${isEnd?"trip-range-end":""}`}>{isStart?selectedTrip.title:"\u00a0"}</em>}{recordCount>0&&<i>{recordCount}</i>}</button>})}</div></section></div>
    <section className="calendar-trip-timeline"><div className="calendar-timeline-title"><small>여행 전체 타임라인</small><h2>{selectedTrip.title}</h2><p>달력에 표시된 여행 기간의 방문과 이동 기록입니다.</p></div>{tripTimeline.length?<TimelineCards records={tripTimeline} {...timelineActions}/>:<div className="day-empty"><CalendarDays/><b>저장된 여행 타임라인이 없습니다</b><span>타임라인을 가져오면 날짜별로 자동 정리됩니다.</span></div>}</section>
    {(dayTrips.length>0||dayEntries.length>0)&&<section className="day-diary calendar-day-notes"><small>선택한 날짜의 일정과 메모</small><h2>{selectedDate.replaceAll("-",". ")}</h2>{dayTrips.map(t=><article className="trip-event" key={t.id}><time>여행</time><div><b>{t.title}</b><span><MapPin/>{t.location} · {t.startDate.slice(5)}~{t.endDate.slice(5)}</span><p>{t.memo}</p></div></article>)}{dayEntries.map(e=><article key={e.id}><time>{e.happenedAt.slice(11,16)}</time><div><b>{e.title}</b><a className="place-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.place)}`} target="_blank"><MapPin/>{e.place}</a><p>{e.note}</p><div className="record-actions"><button onClick={()=>onLookup(e)}><Search/>장소명 찾기</button><button onClick={()=>onEdit(e)}><Pencil/>수정</button><button className="delete" onClick={()=>onDelete(e)}><Trash2/>삭제</button></div></div></article>)}</section>}
  </div>
}
function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="back">
      <div className="modal">
        <div>
          <h2>{title}</h2>
          <button onClick={close}>
            <X />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
