import { type ModeTwoBank } from "./data";

export type TopicFilter = "all" | ModeTwoBank["topic"];

export type ExportState = "idle" | "loading" | "success" | "error";
