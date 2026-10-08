export interface Verse { number:number; text:string; sourceStart:number; sourceEnd:number }
export interface Chapter { number:number; verses:Verse[] }
export interface Book { id:string; title:string; translation:string; sourceId:string; chapters:Chapter[] }
export interface Source { id:string; title:string; url:string; localPath:string; edition:string; translator:string; rights:string; coverage:string; [key:string]:unknown }
export interface Passage { chapter:number; start:number; end:number }
export interface Quote { text:string; sourceId:string; locator:string; lineStart:number; lineEnd:number; sourceStart:number; sourceEnd:number }
export interface EditorialNote { id:string; title:string; summary:string; passages:Passage[]; body:{heading:string;text:string;sourceIds:string[]}[]; quotes:Quote[]; sourceIds:string[]; relatedIds:string[]; localPath:string; tags:string[]; contested:boolean; status:string }
export interface Library { schemaVersion:number; book:Book; sources:Source[]; notes:EditorialNote[]; coverage:string; textPolicy:string }
export type Route = {page:'home'|'sources'|'appendices'|'missing'} | {page:'read';chapter:number;verse:number} | {page:'note';id:string} | {page:'search';query:string};
export interface SearchResult { chapter:number; verse:number; text:string }
