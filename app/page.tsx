"use client";
import { useEffect, useState } from "react";
import {parseTimeline} from "../lib/timeline";
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
type TimelineRecord={id:number;tripId:number|null;entryDate:string;recordType:"visit"|"activity";title:string;note:string;startTime:string;endTime:string|null;transportType:string|null;originalTransportType:string|null;distanceMeters:number|null;startPlace:string|null;endPlace:string|null;startLat:string|null;startLng:string|null;endLat:string|null;endLng:string|null;sourceId:string|null};
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
    [editingTimeline,setEditingTimeline]=useState<TimelineRecord|null>(null),
    [lastMergeToken,setLastMergeToken]=useState(""),
    [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0,10)),
    [calendarMonth, setCalendarMonth] = useState(new Date().toISOString().slice(0,7)),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
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
  useEffect(()=>{const[from,to]=monthRange(calendarMonth),url=view==="travel"&&sid>0?`/api/timeline-records?tripId=${sid}`:`/api/timeline-records?from=${from}&to=${to}`;fetch(url).then(r=>r.json()).then(d=>setTimelineRecords(d.records||[])).catch(()=>setTimelineRecords([]));setSelectedMoves([])},[view,sid,calendarMonth]);
  const trip = trips.find((t) => t.id === sid) || trips[0],
    query = encodeURIComponent(trip.location);
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
  async function saveTimeline(f:FormData){if(!editingTimeline)return;setBusy(true);try{const payload={...editingTimeline,title:String(f.get("title")||""),note:String(f.get("note")||""),startTime:String(f.get("startTime")||""),endTime:String(f.get("endTime")||""),transportType:String(f.get("transportType")||""),distanceMeters:Number(f.get("distanceMeters")||0),startPlace:String(f.get("startPlace")||""),endPlace:String(f.get("endPlace")||""),startLat:String(f.get("startLat")||""),startLng:String(f.get("startLng")||""),endLat:String(f.get("endLat")||""),endLng:String(f.get("endLng")||"")},r=await fetch("/api/timeline-records",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(payload)}),d=await r.json();if(!r.ok)throw new Error(d.error);setTimelineRecords(old=>old.map(x=>x.id===d.record.id?d.record:x));setEditingTimeline(null);setNotice("기록을 수정했습니다.")}catch(e){setNotice(e instanceof Error?e.message:"수정하지 못했습니다.")}setBusy(false)}
  async function deleteTimeline(record:TimelineRecord){if(!window.confirm(`‘${record.title}’ 기록을 삭제할까요? 선택한 이 기록만 삭제됩니다.`))return;setBusy(true);try{const r=await fetch(`/api/timeline-records?id=${record.id}`,{method:"DELETE"}),d=await r.json();if(!r.ok)throw new Error(d.error);setTimelineRecords(old=>old.filter(x=>x.id!==record.id));setSelectedMoves(old=>old.filter(id=>id!==record.id));setNotice("선택한 기록을 삭제했습니다.")}catch(e){setNotice(e instanceof Error?e.message:"삭제하지 못했습니다.")}setBusy(false)}
  async function lookupTimeline(record:TimelineRecord){const coordinates=record.startLat&&record.startLng?`${record.startLat},${record.startLng}`:"";if(!coordinates){setNotice("장소명을 찾을 좌표가 없습니다.");return}setBusy(true);try{const r=await fetch(`/api/geocode?location=${encodeURIComponent(coordinates)}`),d=await r.json();if(!r.ok)throw new Error(d.error);setEditingTimeline({...record,title:d.name,startPlace:d.name});setNotice(`후보 장소명 ‘${d.name}’과 좌표 ${coordinates}입니다. 확인 후 저장해주세요.`)}catch(e){setNotice(e instanceof Error?e.message:"장소명을 찾지 못했습니다.")}setBusy(false)}
  function openMerge(){const chosen=timelineRecords.filter(r=>selectedMoves.includes(r.id)&&r.recordType==="activity").sort((a,b)=>a.startTime.localeCompare(b.startTime));if(chosen.length<2){setNotice("합칠 이동 기록을 2개 이상 선택해주세요.");return}setMergePreview(chosen)}
  async function mergeMoves(f:FormData){if(!mergePreview)return;setBusy(true);try{const first=mergePreview[0],last=mergePreview[mergePreview.length-1],transport=String(f.get("transportType")||first.transportType||"이동"),r=await fetch("/api/timeline-records",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({action:"merge",ids:mergePreview.map(x=>x.id),record:{tripId:first.tripId,entryDate:String(f.get("startTime")).slice(0,10),recordType:"activity",title:transport,note:String(f.get("note")||""),startTime:String(f.get("startTime")),endTime:String(f.get("endTime")),transportType:transport,originalTransportType:mergePreview.map(x=>x.originalTransportType||x.transportType).join(" + "),distanceMeters:Number(f.get("distanceMeters")||0),startPlace:first.startPlace,endPlace:last.endPlace,startLat:first.startLat,startLng:first.startLng,endLat:last.endLat,endLng:last.endLng}})}),d=await r.json();if(!r.ok)throw new Error(d.error);setTimelineRecords(old=>[...old.filter(x=>!selectedMoves.includes(x.id)),d.record].sort((a,b)=>a.startTime.localeCompare(b.startTime)));setSelectedMoves([]);setMergePreview(null);setLastMergeToken(d.token);setNotice("선택한 기록을 하나로 합쳤습니다. 잘못되었다면 아래 안내의 되돌리기를 누르세요.")}catch(e){setNotice(e instanceof Error?e.message:"합치지 못했습니다.")}setBusy(false)}
  async function undoMerge(){if(!lastMergeToken||!window.confirm("방금 합친 기록을 원래 기록들로 되돌릴까요?"))return;setBusy(true);try{const r=await fetch("/api/timeline-records",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({action:"undo",token:lastMergeToken})}),d=await r.json();if(!r.ok)throw new Error(d.error);const[from,to]=monthRange(calendarMonth),url=view==="travel"&&sid>0?`/api/timeline-records?tripId=${sid}`:`/api/timeline-records?from=${from}&to=${to}`,fresh=await fetch(url).then(x=>x.json());setTimelineRecords(fresh.records||[]);setLastMergeToken("");setNotice("합치기 전 기록으로 되돌렸습니다.")}catch(e){setNotice(e instanceof Error?e.message:"되돌리지 못했습니다.")}setBusy(false)}
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
          <button className={view==="calendar"?"active":""} onClick={()=>setView("calendar")}>일정 달력</button>
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
          {view==="calendar" ? <CalendarView month={calendarMonth} setMonth={setCalendarMonth} selectedDate={selectedDate} setSelectedDate={setSelectedDate} entries={dailyEntries} timelineRecords={timelineRecords} trips={trips} openImport={()=>setTimelineForm(true)} onLookup={entry=>lookupPlaceName({kind:"daily",entry})} onEdit={entry=>setEditing({kind:"daily",entry})} onDelete={entry=>deleteRecord({kind:"daily",entry})} timelineActions={{selectedMoves,setSelectedMoves,openMerge,onLookup:lookupTimeline,onEdit:setEditingTimeline,onDelete:deleteTimeline}} /> : <>
          <div className="title">
            <div>
              <small>
                <MapPin /> {trip.location}
              </small>
              <h1>{trip.title}</h1>
              <p>{trip.memo}</p>
            </div>
            <button className="primary" onClick={() => setEntryForm(true)}>
              <Camera />
              기록 추가
            </button>
          </div>
          <div className="overview">
            <article className="map">
              <div className="cardhead">
                <div>
                  <small>여행 동선</small>
                  <h2>첫째 날의 발자국</h2>
                </div>
                <span>
                  <Route /> 8.4km
                </span>
              </div>
              <div className="maparea">
                <em>금강</em>
                <div className="route" />
                {entries.slice(0, 4).map((e, i) => (
                  <label key={e.id} className={`pin p${i}`}>
                    <b>{i + 1}</b>
                    <span>{e.title}</span>
                  </label>
                ))}
              </div>
              <footer>
                <a
                  href={`https://map.naver.com/p/search/${query}`}
                  target="_blank"
                >
                  <Map />
                  네이버 지도
                </a>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${query}`}
                  target="_blank"
                >
                  <Map />
                  구글 지도
                </a>
              </footer>
            </article>
            <article className="ai">
              <Sparkles />
              <small>AI 여행 요약</small>
              <h2>
                느리게 걸어서
                <br />더 오래 남은 여행
              </h2>
              <p>
                근대 거리에서 시작해 바다와 골목까지, 사진과 식사를 여유롭게
                즐긴 하루였어요.
              </p>
              <div>#골목산책　#로컬맛집</div>
              <button
                onClick={() =>
                  setNotice("현재 기록으로 다음 날 일정을 만들었습니다.")
                }
              >
                <Sparkles />
                다음 일정 AI로 만들기
              </button>
            </article>
          </div>
          <section id="timeline" className="block">
            <div className="sectionhead">
              <div>
                <small>여행 타임라인</small>
                <h2>사진과 이야기</h2>
              </div>
              <button onClick={() => setEntryForm(true)}>
                <Plus />
                기록 추가
              </button>
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
              <TimelineCards records={timelineRecords} selectedMoves={selectedMoves} setSelectedMoves={setSelectedMoves} openMerge={openMerge} onLookup={lookupTimeline} onEdit={setEditingTimeline} onDelete={deleteTimeline}/>
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
      {editingTimeline&&<TimelineEditModal record={editingTimeline} close={()=>setEditingTimeline(null)} save={saveTimeline} busy={busy}/>}
      {mergePreview&&<MergeModal records={mergePreview} close={()=>setMergePreview(null)} save={mergeMoves} busy={busy}/>}
      {lastMergeToken&&<button className="undo-toast" onClick={undoMerge} disabled={busy}>방금 합친 기록 되돌리기</button>}
    </main>
  );
}
function durationText(start:string,end:string|null){if(!end)return "도착시간 없음";const mins=Math.max(0,Math.round((new Date(end).getTime()-new Date(start).getTime())/60000));return mins>=60?`${Math.floor(mins/60)}시간 ${mins%60}분`:`${mins}분`}
function coordinate(lat:string|null,lng:string|null){return lat&&lng?`${lat}, ${lng}`:"좌표 없음"}
type TimelineActions={selectedMoves:number[];setSelectedMoves:(value:number[]|((old:number[])=>number[]))=>void;openMerge:()=>void;onLookup:(r:TimelineRecord)=>void;onEdit:(r:TimelineRecord)=>void;onDelete:(r:TimelineRecord)=>void};
function TimelineCards({records,selectedMoves,setSelectedMoves,openMerge,onLookup,onEdit,onDelete}: {records:TimelineRecord[]}&TimelineActions){if(!records.length)return null;return <div className="imported-records"><div className="merge-bar"><span>이동 기록의 선택칸을 눌러 합칠 기록만 고르세요.</span><button onClick={openMerge} disabled={selectedMoves.length<2}>선택한 이동 {selectedMoves.length}개 합치기</button></div>{records.map(r=><article className={`timeline-record ${r.recordType}`} key={`timeline-${r.id}`}><div className="record-time"><b>{r.startTime.slice(11,16)}</b><span>~ {r.endTime?.slice(11,16)||"--:--"}</span></div><div className="record-body">{r.recordType==="activity"&&<label className="move-check"><input type="checkbox" checked={selectedMoves.includes(r.id)} onChange={e=>setSelectedMoves(old=>e.target.checked?[...old,r.id]:old.filter(id=>id!==r.id))}/><Car/>합칠 이동 선택</label>}<small>{r.recordType==="activity"?"이동 기록":"방문 기록"}</small><h3>{r.title}</h3>{r.recordType==="activity"?<div className="movement-detail"><p><b>이동수단</b> {r.transportType||r.originalTransportType||"알 수 없음"}</p><p><b>출발</b> {r.startPlace||"출발지 입력 필요"}</p><p><b>도착</b> {r.endPlace||"도착지 입력 필요"}</p><p><b>이동시간</b> {durationText(r.startTime,r.endTime)} · <b>거리</b> {r.distanceMeters!=null?`${(r.distanceMeters/1000).toFixed(2)}km`:"알 수 없음"}</p><p><b>출발 좌표</b> {coordinate(r.startLat,r.startLng)}</p><p><b>도착 좌표</b> {coordinate(r.endLat,r.endLng)}</p></div>:<><p>{r.note}</p><p><b>방문시간</b> {r.startTime.replace("T"," ").slice(0,16)} ~ {r.endTime?.replace("T"," ").slice(0,16)||"알 수 없음"}</p><p><b>좌표</b> {coordinate(r.startLat,r.startLng)}</p></>}<div className="record-actions">{r.recordType==="visit"&&<button onClick={()=>onLookup(r)}><Search/>장소명 찾기</button>}<button onClick={()=>onEdit(r)}><Pencil/>수정</button><button className="delete" onClick={()=>onDelete(r)}><Trash2/>삭제</button></div></div></article>)}</div>}
function TimelineEditModal({record,close,save,busy}:{record:TimelineRecord;close:()=>void;save:(f:FormData)=>void;busy:boolean}){const activity=record.recordType==="activity";return <Modal title={activity?"이동 기록 수정":"방문 기록 수정"} close={close}><form action={save}><label>{activity?"이동 기록 이름":"장소명"}<input name="title" defaultValue={record.title} required/></label>{activity&&<label>이동수단<input name="transportType" defaultValue={record.transportType||record.originalTransportType||""} required/></label>}<div className="row"><label>{activity?"출발시간":"방문 시작"}<input name="startTime" type="datetime-local" defaultValue={record.startTime.slice(0,16)} required/></label><label>{activity?"도착시간":"방문 종료"}<input name="endTime" type="datetime-local" defaultValue={record.endTime?.slice(0,16)||""}/></label></div><label>{activity?"출발지":"장소 또는 주소"}<input name="startPlace" defaultValue={record.startPlace||""}/></label>{activity&&<label>도착지<input name="endPlace" defaultValue={record.endPlace||""}/></label>}{activity&&<label>이동거리(미터)<input name="distanceMeters" type="number" min="0" step="1" defaultValue={record.distanceMeters??0}/></label>}<div className="row"><label>출발 위도<input name="startLat" defaultValue={record.startLat||""}/></label><label>출발 경도<input name="startLng" defaultValue={record.startLng||""}/></label></div>{activity&&<div className="row"><label>도착 위도<input name="endLat" defaultValue={record.endLat||""}/></label><label>도착 경도<input name="endLng" defaultValue={record.endLng||""}/></label></div>}<label>메모<textarea name="note" defaultValue={record.note}/></label><button className="primary" disabled={busy}>{busy?"저장 중…":"수정 내용 저장"}</button></form></Modal>}
function MergeModal({records,close,save,busy}:{records:TimelineRecord[];close:()=>void;save:(f:FormData)=>void;busy:boolean}){const first=records[0],last=records[records.length-1],distance=records.reduce((sum,r)=>sum+(r.distanceMeters||0),0),types=[...new Set(records.map(r=>r.transportType||r.originalTransportType))],far=new Date(last.startTime).getTime()-new Date(first.endTime||first.startTime).getTime()>6*60*60*1000;return <Modal title="이동 기록 합치기" close={close}><div className="merge-preview"><b>선택한 {records.length}개 기록</b>{records.map(r=><p key={r.id}>{r.startTime.slice(0,16).replace("T"," ")} ~ {r.endTime?.slice(11,16)} · {r.transportType} · {r.distanceMeters||0}m</p>)}{(types.length>1||far)&&<p className="merge-warning">⚠ {types.length>1?"이동수단이 서로 다른 기록이 있습니다. ":""}{far?"시간 간격이 6시간보다 큰 기록이 있습니다.":""} 정말 합칠지 확인해주세요.</p>}</div><form action={save}><label>이동수단<input name="transportType" defaultValue={first.transportType||first.originalTransportType||"자동차"} required/></label><div className="row"><label>출발시간<input name="startTime" type="datetime-local" defaultValue={first.startTime.slice(0,16)} required/></label><label>도착시간<input name="endTime" type="datetime-local" defaultValue={(last.endTime||last.startTime).slice(0,16)} required/></label></div><p className="calculated-time">합친 시간은 저장 후 입력한 출발·도착시간으로 자동 계산됩니다.</p><label>이동거리(미터)<input name="distanceMeters" type="number" min="0" step="1" defaultValue={distance} required/></label><label>메모<textarea name="note" defaultValue={`${records.length}개의 이동 기록을 합침`}/></label><label className="merge-confirm"><input type="checkbox" required/>이 작업을 실행하면 선택한 기록들이 하나의 기록으로 바뀍니다.</label><button className="primary" disabled={busy}>{busy?"안전하게 합치는 중…":"확인하고 합치기"}</button></form></Modal>}
function monthRange(month:string){const[y,m]=month.split("-").map(Number),last=new Date(y,m,0).getDate();return [`${month}-01`,`${month}-${String(last).padStart(2,"0")}`]}
function shiftMonth(month:string,amount:number){const[y,m]=month.split("-").map(Number),d=new Date(y,m-1+amount,1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`}
function CalendarView({month,setMonth,selectedDate,setSelectedDate,entries,timelineRecords,trips,openImport,onLookup,onEdit,onDelete,timelineActions}:{month:string;setMonth:(v:string)=>void;selectedDate:string;setSelectedDate:(v:string)=>void;entries:DailyEntry[];timelineRecords:TimelineRecord[];trips:Trip[];openImport:()=>void;onLookup:(e:DailyEntry)=>void;onEdit:(e:DailyEntry)=>void;onDelete:(e:DailyEntry)=>void;timelineActions:TimelineActions}){
  const[y,m]=month.split("-").map(Number),firstDay=new Date(y,m-1,1).getDay(),lastDay=new Date(y,m,0).getDate(),cells=Array.from({length:42},(_,i)=>{const day=i-firstDay+1;return day>0&&day<=lastDay?`${month}-${String(day).padStart(2,"0")}`:""}),dayEntries=entries.filter(e=>e.entryDate===selectedDate),dayTimeline=timelineRecords.filter(e=>e.entryDate===selectedDate),dayTrips=trips.filter(t=>t.startDate<=selectedDate&&t.endDate>=selectedDate);
  return <div className="calendar-view">
    <div className="calendar-title"><div><small>나의 일정일기</small><h1>다녀온 모든 날의 기록</h1><p>여행은 초록색 일정으로, 평소 방문기록은 숫자로 간단히 표시됩니다.</p></div><button className="primary" onClick={openImport}><Upload/>타임라인 가져오기</button></div>
    <div className="calendar-layout"><section className="calendar-card"><div className="month-head"><button aria-label="이전 달" onClick={()=>setMonth(shiftMonth(month,-1))}><ChevronLeft/></button><h2>{y}년 {m}월</h2><button aria-label="다음 달" onClick={()=>setMonth(shiftMonth(month,1))}><ChevronRight/></button></div><div className="weekdays">{["일","월","화","수","목","금","토"].map(d=><b key={d}>{d}</b>)}</div><div className="month-grid">{cells.map((date,i)=>date?<button key={date} className={`${date===selectedDate?"chosen":""}`} onClick={()=>setSelectedDate(date)}><span>{Number(date.slice(-2))}</span>{trips.find(t=>t.startDate<=date&&t.endDate>=date)&&<em>{trips.find(t=>t.startDate<=date&&t.endDate>=date)?.title}</em>}{(entries.some(e=>e.entryDate===date)||timelineRecords.some(e=>e.entryDate===date))&&<i>{entries.filter(e=>e.entryDate===date).length+timelineRecords.filter(e=>e.entryDate===date).length}</i>}</button>:<span key={`blank-${i}`}/>)}</div></section>
    <section className="day-diary"><small>선택한 날짜</small><h2>{selectedDate.replaceAll("-",". ")}</h2>{dayTrips.map(t=><article className="trip-event" key={t.id}><time>여행</time><div><b>{t.title}</b><span><MapPin/>{t.location} · {t.startDate.slice(5)}~{t.endDate.slice(5)}</span><p>{t.memo}</p></div></article>)}{dayEntries.map(e=><article key={e.id}><time>{e.happenedAt.slice(11,16)}</time><div><b>{e.title}</b><a className="place-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.place)}`} target="_blank"><MapPin/>{e.place}</a><p>{e.note}</p><div className="record-actions"><button onClick={()=>onLookup(e)}><Search/>장소명 찾기</button><button onClick={()=>onEdit(e)}><Pencil/>수정</button><button className="delete" onClick={()=>onDelete(e)}><Trash2/>삭제</button></div></div></article>)}<TimelineCards records={dayTimeline} {...timelineActions}/>{!dayTrips.length&&!dayEntries.length&&!dayTimeline.length&&<div className="day-empty"><CalendarDays/><b>이날의 기록이 없습니다</b><span>타임라인을 가져오면 날짜별로 자동 정리됩니다.</span></div>}</section></div>
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
