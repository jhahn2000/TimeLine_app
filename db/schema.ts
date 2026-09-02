import {index,integer,sqliteTable,text} from "drizzle-orm/sqlite-core";
export const trips=sqliteTable("trips",{id:integer("id").primaryKey({autoIncrement:true}),title:text("title").notNull(),location:text("location").notNull(),startDate:text("start_date").notNull(),endDate:text("end_date").notNull(),memo:text("memo").notNull().default(""),createdAt:text("created_at").notNull().default("CURRENT_TIMESTAMP")});
export const entries=sqliteTable("entries",{id:integer("id").primaryKey({autoIncrement:true}),tripId:integer("trip_id").notNull().references(()=>trips.id,{onDelete:"cascade"}),entryType:text("entry_type").notNull().default("place"),title:text("title").notNull(),note:text("note").notNull().default(""),place:text("place").notNull(),happenedAt:text("happened_at").notNull(),imageKey:text("image_key"),createdAt:text("created_at").notNull().default("CURRENT_TIMESTAMP")});
export const dailyEntries=sqliteTable("daily_entries",{id:integer("id").primaryKey({autoIncrement:true}),entryDate:text("entry_date").notNull(),title:text("title").notNull(),place:text("place").notNull(),happenedAt:text("happened_at").notNull(),note:text("note").notNull().default(""),createdAt:text("created_at").notNull().default("CURRENT_TIMESTAMP")},(table)=>[index("idx_daily_entries_date").on(table.entryDate)]);
export const timelineRecords=sqliteTable("timeline_records",{
  id:integer("id").primaryKey({autoIncrement:true}),
  tripId:integer("trip_id").references(()=>trips.id,{onDelete:"cascade"}),
  entryDate:text("entry_date").notNull(),recordType:text("record_type").notNull(),title:text("title").notNull(),note:text("note").notNull().default(""),
  startTime:text("start_time").notNull(),endTime:text("end_time"),transportType:text("transport_type"),originalTransportType:text("original_transport_type"),distanceMeters:integer("distance_meters"),
  startPlace:text("start_place"),endPlace:text("end_place"),startLat:text("start_lat"),startLng:text("start_lng"),endLat:text("end_lat"),endLng:text("end_lng"),
  sourceId:text("source_id"),createdAt:text("created_at").notNull().default("CURRENT_TIMESTAMP")
},(table)=>[index("idx_timeline_records_date").on(table.entryDate),index("idx_timeline_records_trip").on(table.tripId)]);
export const timelineMergeHistory=sqliteTable("timeline_merge_history",{
  id:integer("id").primaryKey({autoIncrement:true}),mergeToken:text("merge_token").notNull().unique(),originalRecords:text("original_records").notNull(),createdAt:text("created_at").notNull().default("CURRENT_TIMESTAMP"),undoneAt:text("undone_at")
});
