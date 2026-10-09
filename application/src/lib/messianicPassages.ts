// Editorial Christian reception-history overlay; never part of the KJV corpus.
// Inclusion and qualifications: application/docs/MESSIANIC-HIGHLIGHTS.md.
export interface MessianicPassage {
  chapter:number; start:number; end:number; title:string; explanation:string;
  evidence:string; evidenceUrl:string;
}
const patriarchalEvidence='Jared M. August, The Messianic Hope of Genesis; compare Galatians 3:8, 16 and Acts 3:25–26';
const patriarchalUrl='https://www.thegospelcoalition.org/themelios/article/the-messianic-hope-of-genesis-the-protoevangelium-and-patriarchal-promises/';
export const messianicPassages: readonly MessianicPassage[] = [
  {chapter:3,start:15,end:15,title:'The seed of the woman',
    explanation:'Traditionally read by Christians as the first promise of Christ’s victory over the serpent. This is a Christian messianic reading, not a universally agreed interpretation of the verse.',
    evidence:'Luther, Genesis 3 exposition',evidenceUrl:'#commentary/luther-genesis-1/genesis-3'},
  {chapter:12,start:3,end:3,title:'Blessing for all families through Abraham',
    explanation:'Galatians 3:8 treats the blessing of the nations promised to Abraham as the gospel announced beforehand; 3:16 connects the promised seed with Christ.',
    evidence:patriarchalEvidence,evidenceUrl:patriarchalUrl},
  {chapter:18,start:18,end:18,title:'The blessing of all nations reaffirmed',
    explanation:'This repeats the universal blessing promised through Abraham. It is included as part of the Abrahamic promise Christians read in the light of Galatians 3:8, 16, not as a separate prediction naming Jesus.',
    evidence:'KJV Genesis 18:18 and Galatians 3:8, 16 — editorial cross-reference',evidenceUrl:'https://www.gutenberg.org/ebooks/10'},
  {chapter:22,start:17,end:18,title:'The victorious seed and blessing of the nations',
    explanation:'Christians connect the promised seed and blessing of all nations with Christ (Galatians 3:16; Acts 3:25–26). Reading the victory over enemies in verse 17 as an individual messianic promise is debated; the passage also concerns Abraham’s descendants.',
    evidence:patriarchalEvidence,evidenceUrl:patriarchalUrl},
  {chapter:26,start:4,end:4,title:'The promise continued through Isaac',
    explanation:'The blessing of all nations through the promised seed is repeated to Isaac. Its messianic significance is a Christian reading of the continuing Abrahamic promise.',
    evidence:patriarchalEvidence,evidenceUrl:patriarchalUrl},
  {chapter:28,start:14,end:14,title:'The promise continued through Jacob',
    explanation:'The blessing of all families through the promised seed is repeated to Jacob. Christians read this continuation of the Abrahamic promise in relation to Christ.',
    evidence:patriarchalEvidence,evidenceUrl:patriarchalUrl},
  {chapter:49,start:8,end:12,title:'Judah’s royal blessing and Shiloh',
    explanation:'Traditional Christian interpretation reads Judah’s royal blessing, especially the ruler and gathering of peoples in verse 10, as pointing to Christ. Augustine also applies the lion, wine and milk imagery to Christ and the Church. These figurative extensions are not all equally direct predictions; “Shiloh” and the oracle’s scope are debated.',
    evidence:'Augustine, City of God XVI.41',evidenceUrl:'#commentary/augustine-city-of-god-2/book-16'},
];
export function messianicPassageFor(chapter:number,verse:number) {
  return messianicPassages.find(p=>p.chapter===chapter && verse>=p.start && verse<=p.end);
}
export const messianicNoteId=(passage:MessianicPassage)=>`messianic-${passage.chapter}-${passage.start}`;
