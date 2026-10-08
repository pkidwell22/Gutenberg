import { useEffect } from 'react';

export function CommentaryHeading({title}:{title:string}) {
  useEffect(()=>{document.title=`${title} · Scripture Library`;},[title]);
  return <h1>{title}</h1>;
}
export function CommentaryMissing() {
  return <><CommentaryHeading title="Commentary not found"/><p>This work or section is not in the current collection. <a href="#commentaries">Browse historical works.</a></p></>;
}
