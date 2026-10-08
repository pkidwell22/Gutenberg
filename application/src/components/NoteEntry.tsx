import type { EditorialNote } from '../../shared/library';
import { PassageLinks } from './References';
export function NoteEntry({note}:{note:EditorialNote}) {
  return <article className="note-entry"><h2><a href={`#note/${note.id}`}>{note.title}</a></h2><p>{note.summary}</p><PassageLinks note={note}/></article>;
}
