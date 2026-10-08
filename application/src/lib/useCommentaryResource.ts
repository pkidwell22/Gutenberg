import { useEffect, useState } from 'react';

type Resource<T> = {status:'loading'} | {status:'error';notFound:boolean} | {status:'ready';data:T};
/** This state is deliberately independent of the Scripture request. */
export function useCommentaryResource<T>(url:string,validate:(value:unknown)=>value is T) {
  const [attempt,setAttempt]=useState(0);
  const [state,setState]=useState<Resource<T>>({status:'loading'});
  useEffect(()=>{
    const controller=new AbortController();
    setState({status:'loading'});
    const deadline=window.setTimeout(()=>{
      controller.abort();
      setState({status:'error',notFound:false});
    },15_000);
    void (async()=>{
      try {
        const response=await fetch(url,{signal:controller.signal,cache:'no-store'});
        if (!response.ok) {
          if (!controller.signal.aborted) setState({status:'error',notFound:response.status===404});
          return;
        }
        const data:unknown=await response.json();
        if (!validate(data)) throw new Error('Invalid commentary response');
        if (!controller.signal.aborted) setState({status:'ready',data});
      } catch {
        if (!controller.signal.aborted) setState({status:'error',notFound:false});
      } finally {window.clearTimeout(deadline);}
    })();
    return ()=>{window.clearTimeout(deadline);controller.abort();};
  },[url,attempt,validate]);
  return {state,retry:()=>setAttempt(value=>value+1)};
}
