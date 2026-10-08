export type CommentaryRoute = {page:'commentaries'} | {page:'commentary';workId:string;sectionId?:string} | {page:'commentary-search';query:string;workId?:string} | {page:'commentary-missing'};
const idPattern=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Decode components separately: encoded slashes belong to a component, not the route. */
export function commentaryRoute(hash:string):CommentaryRoute | null {
  const raw=hash.replace(/^#/,'').split('/');
  if (!['commentaries','commentary','commentary-search'].includes(raw[0])) return null;
  const missing={page:'commentary-missing'} as const;
  try {
    const [page,...parts]=raw.map(part=>decodeURIComponent(part));
    if (page==='commentary-search' && parts.length>=1 && parts.length<=2 && parts[0].length<=500 && !parts[0].includes('\0') && (parts.length===1 || idPattern.test(parts[1]))) {
      return {page,query:parts[0],...(parts[1] ? {workId:parts[1]} : {})};
    }
    if (page==='commentaries' && !parts.length) return {page};
    if (page==='commentary' && parts.length>=1 && parts.length<=2 && parts.every(part=>idPattern.test(part))) {
      return {page,workId:parts[0],...(parts[1] ? {sectionId:parts[1]} : {})};
    }
  } catch {return missing;}
  return missing;
}
export const commentaryLink=(workId:string,sectionId?:string)=>`#commentary/${encodeURIComponent(workId)}${sectionId ? `/${encodeURIComponent(sectionId)}` : ''}`;
