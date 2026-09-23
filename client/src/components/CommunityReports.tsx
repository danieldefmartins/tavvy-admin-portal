import {useState} from 'react';
import {trpc} from '@/lib/trpc';
import {Button} from '@/components/ui/button';
import {Card,CardContent,CardHeader,CardTitle} from '@/components/ui/card';
const labels:Record<string,string>={universe_review:'Universe review',event_review:'Event note',civic_question:'Civic question',cruise_visit:'Cruise guest report',place_photo:'Place photo',ecard_endorsement:'eCard endorsement',ecard:'Public eCard'};
function mediaLink(value:unknown):string|null{try{const url=new URL(String(value));return url.protocol==='https:'&&!url.username&&!url.password?url.href:null}catch{return null}}
export default function CommunityReports(){
 const [status,setStatus]=useState<'pending'|'all'>('pending'),[page,setPage]=useState(0),[error,setError]=useState(''),[notes,setNotes]=useState(''),[pending,setPending]=useState<{id:string;action:'hide'|'dismiss'|'restore'}|null>(null);
 const query=trpc.communityReports.list.useQuery({status,offset:page*25,limit:25});
 const mutation=trpc.communityReports.moderate.useMutation({onSuccess:()=>{setPending(null);setNotes('');void query.refetch()},onError:e=>setError(e.message)});
 function choose(id:string,action:'hide'|'dismiss'|'restore'){setError('');setNotes('');setPending({id,action})}
 return <Card><CardHeader><CardTitle>Community reports</CardTitle><p>Reported public text, photos and eCards. Hiding preserves the original record and logs the action. Hiding a cruise report or endorsement also removes its signals from public summaries. Personal blocks do not change shared evidence.</p></CardHeader><CardContent>
 <label>Show <select disabled={mutation.isPending} value={status} onChange={e=>{setStatus(e.target.value as 'pending'|'all');setPage(0);setPending(null)}}><option value="pending">Pending</option><option value="all">All reports</option></select></label>
 {query.isLoading&&<p role="status">Loading reports…</p>}{query.error&&<p role="alert">{query.error.message} <Button onClick={()=>query.refetch()}>Retry</Button></p>}{!query.isLoading&&!query.error&&!query.data?.reports.length&&<p>No reports in this view.</p>}
 {!query.error&&query.data?.reports.map(report=>{
  const exists=report.exists===true;const media=mediaLink(report.mediaUrl);const cardPath=typeof report.publicPath==='string'&&/^\/[a-z0-9_-]+$/i.test(report.publicPath)?`https://tavvy.com${report.publicPath}`:null;
  return <article key={report.id} className="border-t py-4"><strong>{labels[report.content_kind]||'Community content'} · {report.reason}</strong><p>{report.context}</p>
   <p className="whitespace-pre-wrap break-words my-3">{!exists?'The original content is no longer available.':report.text||'No written caption or note.'}</p>
   {media&&<a href={media} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="underline">Open reported photo</a>}
   {cardPath&&<a href={cardPath} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="underline">Open public card (may be hidden)</a>}
   <p>{report.status} · {new Date(report.created_at).toLocaleString()} {report.hidden?'· Hidden':''}</p>{report.admin_notes&&<p>Staff note: {report.admin_notes}</p>}
   <div className="flex gap-2 flex-wrap my-3"><Button variant="destructive" disabled={!exists||mutation.isPending} onClick={()=>choose(report.id,report.hidden?'restore':'hide')}>{report.hidden?'Restore content':'Hide content'}</Button><Button variant="outline" disabled={mutation.isPending} onClick={()=>choose(report.id,'dismiss')}>Dismiss report</Button></div>
   {pending&&pending.id===report.id&&<div className="p-3 border rounded"><p>Confirm {pending.action==='hide'?'hiding this content from public view':pending.action==='restore'?'restoring this content if it is still published':'dismissing this report'}?{report.content_kind==='ecard'&&pending.action!=='dismiss'?' This applies to the entire eCard, including its owner-curated testimonials and media.':''}</p><label>Staff note (optional)<textarea className="block w-full border p-2 my-2" value={notes} maxLength={4000} disabled={mutation.isPending} onChange={e=>setNotes(e.target.value)}/></label><Button disabled={mutation.isPending} onClick={()=>{if(pending)mutation.mutate({...pending,notes})}}>{mutation.isPending?'Saving…':'Confirm'}</Button> <Button variant="outline" disabled={mutation.isPending} onClick={()=>setPending(null)}>Cancel</Button></div>}
  </article>;
 })}
 {error&&<p role="alert">{error}</p>}<div className="flex gap-4 items-center mt-4"><Button disabled={page===0||mutation.isPending} onClick={()=>setPage(page-1)}>Previous</Button><span>Page {page+1} · {query.data?.total??'—'} reports</span><Button disabled={mutation.isPending||!query.data||(page+1)*25>=query.data.total} onClick={()=>setPage(page+1)}>Next</Button></div>
 </CardContent></Card>;
}
