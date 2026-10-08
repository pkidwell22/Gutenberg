/** Full historical works are independent of the unchanged Scripture/appendix payload. */
export interface CommentarySectionSummary {
  id: string;
  title: string;
  kind: 'frontmatter' | 'commentary' | 'meditation' | 'treatise';
  ordinal: number;
  sourceStart: number;
  sourceEnd: number;
  /** Curated navigation associations, not a claim of verse-by-verse exposition. */
  genesisChapters: number[];
}
export interface CommentarySection extends CommentarySectionSummary { text: string }
export interface CommentaryWorkSummary {
  id: string;
  author: string;
  title: string;
  edition: string;
  translator: string;
  coverage: string;
  completeness: string;
  rights: string;
  sourceUrl: string;
  localPath: string;
  sourceSha256: string;
  sourceFormat: 'text' | 'html';
  /** For HTML sources this describes the deterministic derived text and its artifact. */
  textPolicy: string;
  sections: CommentarySectionSummary[];
}
export interface CommentaryWork extends Omit<CommentaryWorkSummary, 'sections'> { sections: CommentarySection[] }
export interface CommentaryGap { author: string; title: string; reason: string; sourceUrl?: string }
export interface CommentaryCatalog { schemaVersion: 1; works: CommentaryWorkSummary[]; gaps: CommentaryGap[] }
export interface CommentaryCorpus { schemaVersion: 1; works: CommentaryWork[]; gaps: CommentaryGap[] }
export interface CommentarySearchResult { workId: string; workTitle: string; author: string; sectionId: string; sectionTitle: string; snippet: string }
export interface CommentarySearchResponse { query: string; total: number; results: CommentarySearchResult[]; limited: boolean }
