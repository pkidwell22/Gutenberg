import { expect, it } from 'vitest';
import { commentaryRoute } from './commentaryRoutes';

it.each([
  ['#commentaries',{page:'commentaries'}],
  ['#commentary/luther-one',{page:'commentary',workId:'luther-one'}],
  ['#commentary/luther-one/creation',{page:'commentary',workId:'luther-one',sectionId:'creation'}],
  ['#commentary/luther-one/%63reation',{page:'commentary',workId:'luther-one',sectionId:'creation'}],
  ['#commentary/%ZZ',{page:'commentary-missing'}],
  ['#commentary/',{page:'commentary-missing'}],
  ['#commentary/luther-one/UPPER',{page:'commentary-missing'}],
  ['#commentary/luther-one/a%2Fb',{page:'commentary-missing'}],
  ['#commentaries/extra',{page:'commentary-missing'}],
  ['#commentary/luther-one/creation/extra',{page:'commentary-missing'}],
  ['#commentary-search/faith%2Fworks/luther-one',{page:'commentary-search',query:'faith/works',workId:'luther-one'}],
  ['#commentary-search/',{page:'commentary-search',query:''}],
  ['#commentary-search/words',{page:'commentary-search',query:'words'}],
  ['#commentary-search/%ZZ',{page:'commentary-missing'}],
  ['#commentary-search/words/UPPER',{page:'commentary-missing'}],
  ['#commentary-search/words/luther-one/extra',{page:'commentary-missing'}],
  ['#read/1/2',null],['#search/earth%2Fsky',null],['#note/creation',null],
])('routes %s without changing the legacy router',(hash,expected)=>{
  expect(commentaryRoute(hash as string)).toEqual(expected);
});
