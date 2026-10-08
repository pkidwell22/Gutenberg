import type { CommentaryCatalog, CommentarySectionSummary, CommentaryWork, CommentaryWorkSummary, CommentarySearchResponse } from '../../shared/commentaries';

const record=(value:unknown):value is Record<string,unknown>=>value!==null && typeof value==='object' && !Array.isArray(value);
const strings=(value:Record<string,unknown>,keys:string[])=>keys.every(key=>typeof value[key]==='string');
const id=(value:unknown)=>typeof value==='string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
const integer=(value:unknown)=>typeof value==='number' && Number.isSafeInteger(value) && value>=0;
function section(value:unknown):value is CommentarySectionSummary {
  return record(value) && id(value.id) && strings(value,['title']) && ['frontmatter','commentary','meditation','treatise'].includes(String(value.kind)) && integer(value.ordinal) && integer(value.sourceStart) && integer(value.sourceEnd) && Array.isArray(value.genesisChapters) && value.genesisChapters.every(chapter=>integer(chapter) && chapter>=1 && chapter<=50);
}
function summary(value:unknown):value is CommentaryWorkSummary {
  return record(value) && id(value.id) && strings(value,['author','title','edition','translator','coverage','completeness','rights','sourceUrl','localPath','sourceSha256','textPolicy']) && ['text','html'].includes(String(value.sourceFormat)) && Array.isArray(value.sections) && value.sections.every(section);
}
export function isCommentaryCatalog(value:unknown):value is CommentaryCatalog {
  return record(value) && value.schemaVersion===1 && Array.isArray(value.works) && value.works.every(summary) && Array.isArray(value.gaps) && value.gaps.every(gap=>record(gap) && strings(gap,['author','title','reason']) && (gap.sourceUrl===undefined || typeof gap.sourceUrl==='string'));
}
export function isCommentaryWork(value:unknown):value is CommentaryWork {
  return summary(value) && value.sections.every(item=>'text' in item && typeof item.text==='string');
}
export function isCommentarySearch(value:unknown):value is CommentarySearchResponse {
  return record(value) && strings(value,['query']) && integer(value.total) && typeof value.limited==='boolean' && Array.isArray(value.results) && value.results.length<=Number(value.total) && value.results.every(result=>record(result) && id(result.workId) && id(result.sectionId) && strings(result,['workTitle','author','sectionTitle','snippet']));
}
